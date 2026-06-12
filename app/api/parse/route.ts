import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Files we accept and their max size (keeps free-tier requests small & fast).
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

const SYSTEM = `You extract a course's grade breakdown from a syllabus and/or screenshots of a grades page (e.g. Canvas, Gradescope).

Work in this order, every time — do not skip ahead to the gradebook before finishing Step 1:

STEP 1 — Read the syllabus / grading-policy document(s) FIRST, if any are attached.
From it, note:
  - The graded categories and their weights as percentages.
  - Any policy that changes how a category's score should be computed, e.g.:
      • "drop the lowest N quizzes/homeworks" or similar drop policies
      • opt-out, exemption, or "replace with X if higher" rules
      • extra credit not reflected in a simple percentage
      • a stated max-points / denominator for a category
  Keep these rules in mind for Step 2 — they often mean a raw gradebook percentage
  is NOT the student's real effective score for that category.

STEP 2 — Read the gradebook screenshot(s) (Canvas, Gradescope, etc.) SECOND.
For each category from Step 1, find the student's current score as a percentage.

STEP 3 — Cross-reference Steps 1 and 2. Never guess. When something is ambiguous or
conflicts, leave that category's score as null and add an entry to "flags"
explaining exactly what you saw, so the user can confirm it themselves. Specifically:

A. DUPLICATE ROWS — If the gradebook has more than one row that could map to the
   same category (e.g. two "Quiz 3" entries with different scores, a regrade row
   next to the original, etc.), do NOT pick one and do NOT average them. Set that
   category's score to null and add a "flags" entry listing the category and the
   conflicting values you saw, asking the user which one is correct. (Identical
   duplicate rows with the same value are fine to merge silently.)

B. OPT-OUT / DROP POLICIES — If the syllabus describes a drop-lowest, opt-out,
   exemption, or "replace with higher score" policy that affects a category, do
   NOT use the raw gradebook percentage for that category — it usually doesn't
   reflect the policy. Set that category's score to null and add a "flags" entry
   describing the policy you found and asking the user to enter their actual
   effective score for that category.

C. DENOMINATOR CONFLICTS — Prefer a syllabus- or Gradescope-stated max-points
   value over whatever Canvas implies, if they differ. If two sources disagree
   on a category's denominator and you can't tell which is authoritative, do NOT
   compute a percentage from either. Set that category's score to null and add a
   "flags" entry describing the conflicting totals you saw, asking the user to
   confirm the right one.

Return:
- name: the course name or code (e.g. "CSE 100", "Organic Chemistry"). If unknown, use "Imported Course".
- categories: the weighted grading categories. For each: a short name (e.g. "Homework", "Midterm", "Final", "Participation"), its weight as a percentage number (e.g. 20 for 20%), and the student's current score as a percentage if — and only if — you're confident it reflects their true standing under the syllabus's rules, otherwise null.
- flags: a list of { category, reason } for anything you left null per Steps 3A-3C, or any other ambiguity worth a human glance. Empty array if nothing needs attention.

Other rules:
- Weights should be plain numbers that ideally sum to ~100. If the syllabus lists weights as fractions (0.2), convert to percent (20).
- Do not invent categories that aren't present.`;

export async function POST(req: Request) {
  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid upload." }, { status: 400 });
  }

  // Prefer the user's own key (sent from their browser, used once, never
  // stored). Fall back to a server-configured key for local/self-hosted use.
  const userKey = String(form.get("apiKey") ?? "").trim();
  const apiKey = userKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return Response.json(
      {
        code: "no-key",
        error:
          "Add your own free Gemini API key to use auto-fill (it stays in your browser).",
      },
      { status: 503 },
    );
  }

  const files = form.getAll("files").filter((f): f is File => f instanceof File);
  if (files.length === 0) {
    return Response.json(
      { error: "Attach a syllabus PDF or a screenshot of your grades." },
      { status: 400 },
    );
  }

  const parts: Array<
    { text: string } | { inlineData: { mimeType: string; data: string } }
  > = [
    {
      text: "Extract the course name and weighted grade categories from the attached file(s).",
    },
  ];

  for (const file of files) {
    if (!ALLOWED.has(file.type)) {
      return Response.json(
        { error: `Unsupported file type: ${file.type || "unknown"}.` },
        { status: 400 },
      );
    }
    if (file.size > MAX_BYTES) {
      return Response.json(
        { error: `"${file.name}" is too large (max 12 MB).` },
        { status: 400 },
      );
    }
    const buf = Buffer.from(await file.arrayBuffer());
    parts.push({
      inlineData: { mimeType: file.type, data: buf.toString("base64") },
    });
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts }],
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        // This task now involves cross-referencing the syllabus against the
        // gradebook (drop policies, duplicate rows, denominators) — let the
        // model think it through rather than forcing instant output.
        thinkingConfig: { thinkingBudget: -1 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            categories: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  weight: { type: Type.NUMBER },
                  score: { type: Type.NUMBER, nullable: true },
                },
                required: ["name", "weight"],
              },
            },
            flags: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  category: { type: Type.STRING },
                  reason: { type: Type.STRING },
                },
                required: ["category", "reason"],
              },
            },
          },
          required: ["name", "categories"],
        },
      },
    });

    const text = result.text;
    if (!text) {
      return Response.json(
        { error: "The model returned no data. Try a clearer file." },
        { status: 502 },
      );
    }

    const data = JSON.parse(text) as {
      name?: string;
      categories?: { name?: string; weight?: number; score?: number | null }[];
      flags?: { category?: string; reason?: string }[];
    };

    const categories = (data.categories ?? [])
      .filter((c) => c && c.name)
      .map((c) => ({
        name: String(c.name).slice(0, 40),
        weight: Math.max(0, Math.round(Number(c.weight) || 0)),
        score:
          c.score === null || c.score === undefined || Number.isNaN(c.score)
            ? null
            : Math.max(0, Number(c.score)),
      }));

    if (categories.length === 0) {
      return Response.json(
        {
          error:
            "Couldn't find any grade categories. Make sure the file shows the grading breakdown.",
        },
        { status: 422 },
      );
    }

    // Things the model deliberately left null/ambiguous — surface these so
    // the user can confirm before trusting the numbers.
    const flags = (data.flags ?? [])
      .filter((f) => f && f.reason)
      .slice(0, 12)
      .map((f) => ({
        category: String(f.category ?? "General").slice(0, 40),
        reason: String(f.reason).slice(0, 280),
      }));

    return Response.json({
      name: data.name?.trim() || "Imported Course",
      categories,
      flags,
    });
  } catch (err) {
    console.error("[parse] gemini error", err);
    const msg = err instanceof Error ? err.message : String(err);
    const status =
      typeof (err as { status?: unknown })?.status === "number"
        ? (err as { status: number }).status
        : undefined;

    // Rate limit / quota exhausted (free tier). Tell the user to wait, and
    // pull the suggested retry delay out of Google's message if present.
    const isRateLimit =
      status === 429 ||
      /resource_exhausted|quota|rate limit|429/i.test(msg);
    if (isRateLimit) {
      const m = msg.match(/retry in ([\d.]+)s/i);
      const secs = m ? Math.ceil(parseFloat(m[1])) : null;
      const wait = secs ? ` Try again in about ${secs}s.` : "";
      const free = /limit:\s*0/i.test(msg);
      return Response.json(
        {
          code: "rate-limit",
          error: free
            ? "This Gemini key has no free-tier quota left for this model. Add your own free key, or wait and retry."
            : `Gemini's free tier is rate-limited right now.${wait}`,
        },
        { status: 429 },
      );
    }

    const isAuth =
      /api[_ ]?key|permission|unauthenticated|401|403|invalid/i.test(msg);
    if (isAuth && userKey) {
      return Response.json(
        {
          code: "bad-key",
          error:
            "That API key was rejected by Google. Double-check it and try again.",
        },
        { status: 401 },
      );
    }
    return Response.json(
      { error: "Auto-fill failed. Please try again or enter grades manually." },
      { status: 502 },
    );
  }
}
