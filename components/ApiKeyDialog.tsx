"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  Check,
  ExternalLink,
  KeyRound,
  Lock,
  X,
} from "lucide-react";
import { Button, GlassPanel, Input, Label } from "./ui";
import { springs } from "@/lib/springs";

export function ApiKeyDialog({
  open,
  initialKey,
  hasServerKey,
  onClose,
  onSave,
  onClear,
}: {
  open: boolean;
  initialKey: string;
  hasServerKey: boolean | null;
  onClose: () => void;
  onSave: (key: string) => void;
  onClear: () => void;
}) {
  const [value, setValue] = React.useState(initialKey);

  React.useEffect(() => {
    if (open) setValue(initialKey);
  }, [open, initialKey]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Your Gemini API key"
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
            variants={{
              hidden: { opacity: 0, scale: 0.96, y: 12 },
              show: { opacity: 1, scale: 1, y: 0 },
            }}
            transition={springs.smooth}
          >
            <GlassPanel className="relative w-full max-w-lg p-6">
              <button
                onClick={onClose}
                className="absolute right-3 top-3 rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="mb-1 flex items-center gap-2">
                <KeyRound className="h-5 w-5 text-accent" />
                <h2 className="text-lg font-bold tracking-tight">
                  Your Gemini API key
                </h2>
              </div>
              {initialKey ? (
                <p className="mb-3 flex items-start gap-2 rounded-xl border border-accent-soft bg-accent-dim px-3 py-2 text-sm leading-relaxed text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>
                    Your own key is connected — auto-fill uses it for every
                    request.
                  </span>
                </p>
              ) : hasServerKey ? (
                <p className="mb-3 flex items-start gap-2 rounded-xl border border-accent-soft bg-accent-dim px-3 py-2 text-sm leading-relaxed text-foreground">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                  <span>
                    A free shared key is already active — auto-fill just works,
                    no setup needed.
                  </span>
                </p>
              ) : (
                <p className="mb-3 flex items-start gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-sm leading-relaxed text-foreground">
                  <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-red-400" />
                  <span>
                    No free key is available right now — add your own below
                    to use auto-fill.
                  </span>
                </p>
              )}
              <p className="mb-5 text-sm leading-relaxed text-muted">
                {initialKey
                  ? "Remove it to fall back to the free shared key (if one is available)."
                  : hasServerKey
                    ? "You only need your own key if the shared one hits its daily limit (you'll see a message when that happens), or if you'd simply rather use your own account."
                    : "Add a free Gemini API key from Google AI Studio to start using auto-fill."}
              </p>

              <Label htmlFor="gemini-key">API key</Label>
              <Input
                id="gemini-key"
                type="password"
                autoComplete="off"
                placeholder="AIza…"
                value={value}
                onChange={(e) => setValue(e.target.value)}
              />

              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-sm font-medium text-accent underline underline-offset-4 hover:no-underline"
              >
                Get a free key at Google AI Studio
                <ExternalLink className="h-3.5 w-3.5" />
              </a>

              <div className="mt-5 flex items-start gap-2 rounded-xl border border-border bg-surface px-3 py-3 text-xs leading-relaxed text-muted">
                <Lock className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                <span>
                  <strong className="text-foreground">
                    Stays on your device.
                  </strong>{" "}
                  Your key is saved only in this browser&apos;s local storage —
                  never collected, never stored on our servers. It&apos;s sent
                  once per auto-fill, straight to Google, then discarded.
                </span>
              </div>

              <div className="mt-6 flex items-center justify-between gap-2">
                <Button
                  variant="ghost"
                  onClick={() => {
                    onClear();
                    onClose();
                  }}
                  disabled={!initialKey}
                >
                  Remove key
                </Button>
                <Button
                  onClick={() => {
                    onSave(value);
                    onClose();
                  }}
                >
                  <Check className="h-4 w-4" />
                  Save key
                </Button>
              </div>
            </GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
