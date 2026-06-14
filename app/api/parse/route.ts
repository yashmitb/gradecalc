import { GoogleGenAI, Type } from "@google/genai";
import { normalizeScale, pointsForScale } from "@/lib/scale";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Files we accept and their max size (keeps free-tier requests small & fast).
const MAX_BYTES = 12 * 1024 * 1024; // 12 MB per file
const MAX_FILES = 4;
// Hard ceiling on the whole request body — rejected before we even parse the
// multipart form, so an oversized upload can't sit in memory first.
const MAX_REQUEST_BYTES = MAX_FILES * MAX_BYTES + 1024 * 1024; // ~49 MB
const ALLOWED = new Set([
  "application/pdf",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

// ---- very basic in-memory rate limit ----
// Each call to this route hits the Gemini API, which costs quota/money. This
// is a coarse per-instance guard against a single client hammering the
// endpoint — it resets on cold start and isn't shared across instances, so
// for real abuse protection put this behind a host-level rate limiter (e.g.
// Vercel WAF / Cloudflare) too. Still meaningfully raises the bar for free.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const RATE_LIMIT_MAX = 12; // requests per window per IP
const hits = new Map<string, { count: number; resetAt: number }>();

function rateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = hits.get(ip);
  if (!entry || now > entry.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }
  entry.count += 1;
  return entry.count > RATE_LIMIT_MAX;
}

// Opportunistically bound the map's size so a flood of spoofed IPs can't
// grow it forever between cold starts.
function pruneHits() {
  if (hits.size < 5000) return;
  const now = Date.now();
  for (const [ip, entry] of hits) {
    if (now > entry.resetAt) hits.delete(ip);
  }
}

const SYSTEM = `You extract a course's grade breakdown from a syllabus and/or screenshots of a grades page (Canvas, Gradescope, etc.). Be accurate and never guess.

Process:
1. If a syllabus / grading-policy document is attached, read it FIRST. Note the graded categories and their percentage weights, plus any policy that changes how a category's score is computed: drop-lowest rules, opt-out/exemptions, "replace with X if higher", extra credit, or a stated max-points denominator. These mean a raw gradebook percentage may NOT be the student's true score.
2. Then read the gradebook screenshot(s). For each category, find the student's current score as a percentage.
3. Cross-reference. Leave a category's score null and add a "flags" entry (the category name + exactly what you saw) instead of guessing whenever:
   • Duplicate or conflicting rows could map to one category (two "Quiz 3"s, a regrade beside the original). Don't pick one and don't average — flag it. (Identical duplicate rows with the same value are fine to merge.)
   • A drop / opt-out / replacement policy affects the category — the raw percentage likely ignores it. Flag and ask for the effective score.
   • Two sources disagree on a denominator and you can't tell which is authoritative — flag instead of computing one.

Return:
- name: the course name or code (e.g. "CSE 100", "Organic Chemistry"); "Imported Course" if unknown.
- categories: each with a short name (e.g. "Homework", "Midterm", "Final", "Participation"), its weight as a percentage number (convert fractions like 0.2 → 20), and the current score as a percentage — only if you're confident it reflects the student's true standing under the syllabus's rules, otherwise null.
- flags: a list of { category, reason } for each item you left null above, or any other ambiguity worth a human glance. Empty array if nothing needs attention.
- gradingScale (optional): ONLY if the syllabus explicitly states a letter-grade scale (e.g. "A = 93-100, A- = 90-92, B+ = 87-89, ..."). Return each tier as { min: the minimum percent for that letter, letter, points: the GPA points if the syllabus states them, otherwise omit points }. If no explicit scale is given, omit gradingScale entirely — never invent one.

Rules: weights are plain numbers that should sum to ~100. Never invent categories that aren't present.`;

// Lets the client check (without hitting Gemini) whether a shared/free key is
// configured on this deployment, so the UI can show the right key status.
export async function GET() {
  return Response.json({ hasServerKey: !!process.env.GEMINI_API_KEY });
}

export async function POST(req: Request) {
  // IP-based rate limit, before doing any work.
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  pruneHits();
  if (rateLimited(ip)) {
    return Response.json(
      {
        code: "rate-limit",
        error: "Too many requests. Please wait a bit and try again.",
      },
      { status: 429 },
    );
  }

  // Reject obviously-oversized bodies before buffering them into memory.
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_REQUEST_BYTES) {
    return Response.json(
      { error: "Upload too large. Try fewer or smaller files." },
      { status: 413 },
    );
  }

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return Response.json({ error: "Invalid upload." }, { status: 400 });
  }

  // Prefer the user's own key (sent from their browser, used once, never
  // stored). Fall back to a shared server-configured key so auto-fill works
  // out of the box for everyone, with no setup required.
  const userKey = String(form.get("apiKey") ?? "")
    .trim()
    .slice(0, 200);
  const sharedKey = process.env.GEMINI_API_KEY;
  const apiKey = userKey || sharedKey;
  const usingSharedKey = !userKey && !!sharedKey;
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
  if (files.length > MAX_FILES) {
    return Response.json(
      { error: `Too many files — attach at most ${MAX_FILES}.` },
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
        // Cap the thinking budget instead of letting it run unbounded (-1).
        // The structured schema does most of the heavy lifting, so a modest
        // budget is plenty for the cross-referencing (drop policies, duplicate
        // rows, denominators) while cutting extraction latency substantially.
        thinkingConfig: { thinkingBudget: 1024 },
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
            gradingScale: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  min: { type: Type.NUMBER },
                  letter: { type: Type.STRING },
                  points: { type: Type.NUMBER, nullable: true },
                },
                required: ["min", "letter"],
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
      gradingScale?: { min?: number; letter?: string; points?: number | null }[];
    };

    // Collapse any internal newlines / runs of whitespace the model may pull
    // out of a multi-line heading, so names land clean (e.g. "CSE 100 — Data
    // Structures" instead of "CSE 100\nData Structures").
    const clean = (s: string) => s.replace(/\s+/g, " ").trim();

    const categories = (data.categories ?? [])
      .filter((c) => c && c.name)
      .map((c) => ({
        name: clean(String(c.name)).slice(0, 40),
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

    // Only honor an explicitly-stated grading scale (≥2 tiers). Fill missing
    // GPA points by inferring the standard points for each threshold.
    const rawScale = Array.isArray(data.gradingScale) ? data.gradingScale : [];
    const scaleTiers = rawScale
      .filter((t) => t && t.letter !== undefined && t.min !== undefined)
      .map((t) => {
        const min = Math.max(0, Math.min(100, Number(t.min) || 0));
        const points =
          t.points === null || t.points === undefined || Number.isNaN(t.points)
            ? pointsForScale(min)
            : Math.max(0, Math.min(5, Number(t.points)));
        return { min, letter: clean(String(t.letter)).slice(0, 4) || "—", points };
      });
    const gradingScale =
      scaleTiers.length >= 2 ? normalizeScale(scaleTiers) : undefined;

    return Response.json({
      name: clean(String(data.name ?? "")).slice(0, 80) || "Imported Course",
      categories,
      flags,
      ...(gradingScale ? { gradingScale } : {}),
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
      // The shared community key hit its daily free-tier cap — this isn't
      // the user's problem to "wait out". Offer them a clean way to keep
      // going: paste their own free key, or fall back to manual entry.
      if (usingSharedKey) {
        return Response.json(
          {
            code: "server-busy",
            error:
              "Our shared free AI helper hit today's limit (it happens during finals week!). Add your own free Gemini key to keep using auto-fill, or enter your grades manually.",
          },
          { status: 503 },
        );
      }

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
