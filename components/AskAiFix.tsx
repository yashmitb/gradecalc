"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowRight, Check, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import { Button, Input } from "./ui";
import { springs } from "@/lib/springs";

export type WireCategory = { name: string; weight: number; score: number | null };
type EditResult = { name: string; categories: WireCategory[]; changes: string[] };

/**
 * A natural-language "fix this" box: the user types something like
 * "midterm is 25%, not 30%", we ask the model for the updated breakdown, then
 * show the changes for confirmation before applying. Never edits in place
 * without a preview.
 */
export function AskAiFix({
  name,
  categories,
  apiKey,
  onNeedKey,
  onApply,
  placeholder = "e.g. midterm is 25%, not 30%",
}: {
  name: string;
  categories: WireCategory[];
  apiKey: string;
  onNeedKey: () => void;
  onApply: (result: { name: string; categories: WireCategory[] }) => void;
  placeholder?: string;
}) {
  const [instruction, setInstruction] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [proposal, setProposal] = React.useState<EditResult | null>(null);

  const submit = async () => {
    const text = instruction.trim();
    if (!text || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/edit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, categories, instruction: text, apiKey }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "no-key" || data.code === "bad-key") {
          setError(data.error ?? "An API key is required.");
          onNeedKey();
          return;
        }
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setProposal(data as EditResult);
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const apply = () => {
    if (!proposal) return;
    onApply({ name: proposal.name, categories: proposal.categories });
    setProposal(null);
    setInstruction("");
    setError(null);
  };

  const discard = () => {
    setProposal(null);
    setError(null);
  };

  // A refusal / no-op response: the model couldn't act, or made no changes.
  const refused =
    !!proposal &&
    (proposal.changes.length === 0 ||
      proposal.changes.every((c) => /^couldn'?t/i.test(c)));

  return (
    <div>
      <AnimatePresence mode="wait" initial={false}>
        {proposal ? (
          <motion.div
            key="proposal"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={springs.snappy}
          >
            <ul className="space-y-1.5">
              {proposal.changes.length === 0 ? (
                <li className="text-sm text-muted">
                  No changes — try rephrasing what you want.
                </li>
              ) : (
                proposal.changes.map((c, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    {refused ? (
                      <TriangleAlert className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    ) : (
                      <ArrowRight className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent" />
                    )}
                    <span>{c}</span>
                  </li>
                ))
              )}
            </ul>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={discard}>
                {refused ? "OK" : "Discard"}
              </Button>
              {!refused && (
                <Button size="sm" onClick={apply}>
                  <Check className="h-4 w-4" />
                  Apply
                </Button>
              )}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="input"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="flex items-center gap-2"
          >
            <Input
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  submit();
                }
              }}
              placeholder={placeholder}
              disabled={busy}
              aria-label="Describe the change you want"
            />
            <Button
              size="sm"
              onClick={submit}
              disabled={busy || !instruction.trim()}
              className="shrink-0"
            >
              {busy ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              <span className="hidden sm:inline">{busy ? "Thinking…" : "Ask AI"}</span>
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div
          role="alert"
          className="mt-3 flex items-start gap-2 rounded-xl border border-accent-soft bg-accent-dim px-3 py-2 text-sm text-foreground"
        >
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}
