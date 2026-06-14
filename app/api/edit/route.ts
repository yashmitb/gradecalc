import { GoogleGenAI, Type } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Coarse per-instance rate limit (same spirit as /api/parse — each call costs
// Gemini quota). Resets on cold start; pair with a host-level limiter for real
// abuse protection.
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 30;
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

const SYSTEM = `You edit a single course's grade breakdown from a short natural-language instruction.

You are given the current course as JSON: a name and a list of categories, each with a name, weight (percent of the final grade), and score (the student's percent in that category, or null if not graded yet).

Apply the instruction, then return the FULL updated state:
- name: the (possibly unchanged) course name.
- categories: the complete updated list — every category, not just the changed ones. Keep untouched categories exactly as they were. Weights and scores are plain numbers (percent); use null for an ungraded score.
- changes: a short list of clear, complete sentences describing what you changed, written so a student instantly understands it. Always spell out the direction with "from … to …", and end each with a period. One sentence per change.

Write changes EXACTLY in this style:
- "Changed Midterm weight from 30% to 25%."
- "Set the Homework score to 95%."
- "Added a Quiz category worth 10%."
- "Removed the Participation category."
- "Renamed Test to Midterm."
Never use arrows or shorthand like "30% → 25%" or "Midterm score 90% 45%" — always full sentences.

Rules:
- Change ONLY what the instruction asks; leave everything else identical.
- The instruction may rename a category, change a weight or score, add a category, or remove one.
- If the instruction is ambiguous or asks for something you can't do, return the categories unchanged and put a single sentence in "changes" starting with "Couldn't " that explains why in plain language.
- Never invent scores or categories the user didn't ask for.`;

export async function POST(req: Request) {
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    req.headers.get("x-real-ip") ||
    "unknown";
  if (rateLimited(ip)) {
    return Response.json(
      { code: "rate-limit", error: "Too many requests. Please wait a bit." },
      { status: 429 },
    );
  }

  let body: {
    name?: string;
    categories?: { name?: string; weight?: number; score?: number | null }[];
    instruction?: string;
    apiKey?: string;
  };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const instruction = String(body.instruction ?? "")
    .trim()
    .slice(0, 500);
  if (!instruction) {
    return Response.json(
      { error: "Tell me what to change." },
      { status: 400 },
    );
  }

  const current = {
    name: String(body.name ?? "").slice(0, 80),
    categories: (Array.isArray(body.categories) ? body.categories : [])
      .slice(0, 40)
      .map((c) => ({
        name: String(c?.name ?? "").slice(0, 40),
        weight: Number(c?.weight) || 0,
        score:
          c?.score === null || c?.score === undefined || Number.isNaN(c.score)
            ? null
            : Number(c.score),
      })),
  };

  const userKey = String(body.apiKey ?? "")
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
          "Add your own free Gemini API key to use AI edits (it stays in your browser).",
      },
      { status: 503 },
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Current course:\n${JSON.stringify(
                current,
              )}\n\nInstruction:\n${instruction}`,
            },
          ],
        },
      ],
      config: {
        systemInstruction: SYSTEM,
        responseMimeType: "application/json",
        // Editing is a light transformation — a small thinking budget keeps it
        // fast while still handling multi-part instructions.
        thinkingConfig: { thinkingBudget: 512 },
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
            changes: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["name", "categories", "changes"],
        },
      },
    });

    const text = result.text;
    if (!text) {
      return Response.json(
        { error: "The model returned no data. Try rephrasing." },
        { status: 502 },
      );
    }

    const data = JSON.parse(text) as {
      name?: string;
      categories?: { name?: string; weight?: number; score?: number | null }[];
      changes?: string[];
    };

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

    const changes = (data.changes ?? [])
      .filter((c) => typeof c === "string" && c.trim())
      .slice(0, 10)
      .map((c) => clean(String(c)).slice(0, 160));

    return Response.json({
      name: clean(String(data.name ?? current.name)).slice(0, 80) || current.name,
      categories,
      changes,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    const status =
      typeof (err as { status?: unknown })?.status === "number"
        ? (err as { status: number }).status
        : undefined;

    const isRateLimit =
      status === 429 || /resource_exhausted|quota|rate limit|429/i.test(msg);
    if (isRateLimit) {
      if (usingSharedKey) {
        return Response.json(
          {
            code: "server-busy",
            error:
              "Our shared free AI helper hit today's limit. Add your own free Gemini key to keep using AI edits.",
          },
          { status: 503 },
        );
      }
      return Response.json(
        { code: "rate-limit", error: "Gemini's free tier is rate-limited right now. Try again shortly." },
        { status: 429 },
      );
    }

    const isAuth =
      /api[_ ]?key|permission|unauthenticated|401|403|invalid/i.test(msg);
    if (isAuth && userKey) {
      return Response.json(
        {
          code: "bad-key",
          error: "That API key was rejected by Google. Double-check it.",
        },
        { status: 401 },
      );
    }
    return Response.json(
      { error: "AI edit failed. Please try again or edit the fields directly." },
      { status: 502 },
    );
  }
}
