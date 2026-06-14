"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp, Loader2, Sparkles, TriangleAlert, X } from "lucide-react";
import { GlassPanel } from "./ui";
import { springs } from "@/lib/springs";
import { buildGradeContext } from "@/lib/chatContext";
import { currentGrade } from "@/lib/grades";
import { courseReality } from "@/lib/reality";
import type { TermSystem } from "@/lib/terms";
import type { Profile } from "@/lib/useProfile";
import type { Course } from "@/lib/types";

type Msg = { role: "user" | "assistant"; content: string };

/**
 * Ask-anything chat scoped to the student's real grade data. The full,
 * pre-computed grade context is sent with every turn so answers come from
 * actual numbers — current/projected/floor/ceiling/GPA — not guesses.
 */
export function GradeChat({
  open,
  onClose,
  termCourses,
  allCourses,
  system,
  profile,
  apiKey,
  onNeedKey,
}: {
  open: boolean;
  onClose: () => void;
  termCourses: Course[];
  allCourses: Course[];
  system: TermSystem;
  profile: Profile;
  apiKey: string;
  onNeedKey: () => void;
}) {
  const [messages, setMessages] = React.useState<Msg[]>([]);
  const [input, setInput] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  React.useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 120);
  }, [open]);

  React.useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, busy]);

  // A couple of starter prompts tailored to the actual data.
  const suggestions = React.useMemo(() => {
    const graded = termCourses.filter(
      (c) => currentGrade(c.categories) !== null,
    );
    const inPlay = graded.find((c) => !courseReality(c).decided);
    const out: string[] = [];
    if (inPlay) out.push(`Can I still get an A in ${shortName(inPlay.name)}?`);
    out.push("Which class should I focus on?");
    out.push("If I bomb everything left, what's my GPA?");
    if (graded.length > 1) out.push("What's my safest class right now?");
    return out.slice(0, 4);
  }, [termCourses]);

  const send = async (text: string) => {
    const q = text.trim();
    if (!q || busy) return;
    setError(null);
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    setInput("");
    setBusy(true);
    try {
      const context = buildGradeContext(
        termCourses,
        allCourses,
        system,
        profile,
      );
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: next, context, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "no-key" || data.code === "bad-key") onNeedKey();
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setMessages((m) => [...m, { role: "assistant", content: data.reply }]);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const empty = messages.length === 0;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Ask about your grades"
          initial="hidden"
          animate="show"
          exit="hidden"
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full sm:max-w-lg"
            variants={{
              hidden: { opacity: 0, scale: 0.97, y: 16 },
              show: { opacity: 1, scale: 1, y: 0 },
            }}
            transition={springs.smooth}
          >
            <GlassPanel className="flex h-[80dvh] w-full flex-col overflow-hidden rounded-b-none sm:h-[70vh] sm:rounded-2xl">
              {/* Header */}
              <div className="flex items-center justify-between gap-3 border-b border-border px-5 py-3.5">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-accent" />
                  <h2 className="text-sm font-bold tracking-tight">
                    Ask about your grades
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground cursor-pointer"
                  aria-label="Close"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {/* Messages */}
              <div
                ref={scrollRef}
                className="flex-1 space-y-4 overflow-y-auto px-5 py-4"
              >
                {empty ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-accent-soft bg-accent-dim">
                      <Sparkles className="h-5 w-5 text-accent" />
                    </div>
                    <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
                      I can see your courses, grades, and GPA. Ask me anything —
                      I&apos;ll answer from your real numbers.
                    </p>
                    <div className="mt-5 flex w-full flex-col gap-2">
                      {suggestions.map((s) => (
                        <button
                          key={s}
                          onClick={() => send(s)}
                          className="cursor-pointer rounded-xl border border-border bg-surface px-3.5 py-2.5 text-left text-sm text-foreground transition-colors hover:border-accent-soft hover:bg-surface-2"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((m, i) => (
                    <div
                      key={i}
                      className={
                        m.role === "user" ? "flex justify-end" : "flex justify-start"
                      }
                    >
                      <div
                        className={
                          m.role === "user"
                            ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-sm text-[#0a0a0a]"
                            : "max-w-[90%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-border bg-surface px-3.5 py-2.5 text-sm leading-relaxed text-foreground"
                        }
                      >
                        {m.content}
                      </div>
                    </div>
                  ))
                )}

                {busy && (
                  <div className="flex justify-start">
                    <div className="flex items-center gap-2 rounded-2xl rounded-bl-md border border-border bg-surface px-3.5 py-2.5 text-sm text-muted">
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      Thinking…
                    </div>
                  </div>
                )}

                {error && (
                  <div
                    role="alert"
                    className="flex items-start gap-2 rounded-xl border border-accent-soft bg-accent-dim px-3 py-2 text-sm text-foreground"
                  >
                    <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                    <span>{error}</span>
                  </div>
                )}
              </div>

              {/* Input */}
              <div className="border-t border-border p-3">
                <div className="flex items-center gap-2">
                  <input
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        send(input);
                      }
                    }}
                    placeholder="Ask about your grades…"
                    disabled={busy}
                    aria-label="Ask about your grades"
                    className="h-11 w-full rounded-xl border border-border bg-surface px-3.5 text-sm text-foreground outline-none transition-colors placeholder:text-muted focus:border-accent focus:ring-2 focus:ring-accent-dim"
                  />
                  <button
                    onClick={() => send(input)}
                    disabled={busy || !input.trim()}
                    aria-label="Send"
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-accent text-[#0a0a0a] transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <ArrowUp className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/** "CSE 100 — Data Structures" → "CSE 100" for tidy suggestion chips. */
function shortName(name: string): string {
  return name.split(/[—–-]/)[0].trim() || name;
}
