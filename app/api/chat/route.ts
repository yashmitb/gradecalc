import { GoogleGenAI } from "@google/genai";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Coarse per-instance rate limit (same spirit as the other AI routes).
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT_MAX = 40;
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

const SYSTEM = `You are GradeHQ's built-in grade assistant. You help one student understand their OWN grades, using the JSON grade data you're given. You are friendly, sharp, and brief.

Answer using ONLY the provided data. Key rules:
- Lead with the direct answer, then a short "why" with the actual numbers. Usually 1–3 sentences. Use plain text, no markdown headers.
- Do arithmetic carefully. A category's weightPercent is its share of the course grade; score is the student's percent in it. The course grade is the weighted average of graded categories. For "can I still get an X": FIRST look up the exact percent that letter needs in that course's gradeCutoffs (e.g. an "A" may require 93%, not 90% — never assume the cutoff). Then solve for the score needed on the remaining (ungraded) categories, and say whether it's possible (needs ≤ 100%) and how realistic.
- For GPA questions use the provided GPA numbers and each course's units; it's a 4.0 scale. worstCaseTermGPA/bestCaseTermGPA already bound the outcomes.
- Use letters from the provided fields (projectedLetter, worstCaseLetter, etc.) — don't invent a different grading scale.
- There are NO due dates, deadlines, or dates in this data. If asked about timing, say you don't track dates.
- If a question can't be answered from the data, say what's missing instead of guessing. Never invent grades, courses, or scores.
- Give study/life advice only if explicitly asked; otherwise stay focused on their numbers.`;

type Msg = { role: "user" | "assistant"; content: string };

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

  let body: { messages?: Msg[]; context?: string; apiKey?: string };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter(
      (m) =>
        m &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string" &&
        m.content.trim(),
    )
    .slice(-12)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 2000) }));

  if (messages.length === 0 || messages[messages.length - 1].role !== "user") {
    return Response.json({ error: "Ask a question." }, { status: 400 });
  }

  const context = String(body.context ?? "").slice(0, 20000);

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
          "Add your own free Gemini API key to use the assistant (it stays in your browser).",
      },
      { status: 503 },
    );
  }

  const ai = new GoogleGenAI({ apiKey });

  try {
    const result = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: messages.map((m) => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      })),
      config: {
        systemInstruction: `${SYSTEM}\n\nStudent's current grade data (JSON):\n${context}`,
        thinkingConfig: { thinkingBudget: 1024 },
      },
    });

    const reply = result.text?.trim();
    if (!reply) {
      return Response.json(
        { error: "No response — try rephrasing." },
        { status: 502 },
      );
    }
    return Response.json({ reply });
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
              "Our shared free AI helper hit today's limit. Add your own free Gemini key to keep chatting.",
          },
          { status: 503 },
        );
      }
      return Response.json(
        {
          code: "rate-limit",
          error: "Gemini's free tier is rate-limited right now. Try again shortly.",
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
          error: "That API key was rejected by Google. Double-check it.",
        },
        { status: 401 },
      );
    }
    return Response.json(
      { error: "The assistant failed. Please try again." },
      { status: 502 },
    );
  }
}
