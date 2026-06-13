"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Check,
  Loader2,
  Sparkles,
  TriangleAlert,
  UploadCloud,
  X,
} from "lucide-react";
import { Button, GlassPanel, Input } from "./ui";
import { springs } from "@/lib/springs";
import type { ParsedCourse } from "@/lib/types";

export function Autofill({
  open,
  onClose,
  onParsed,
  apiKey,
  onSaveKey,
  onNeedKey,
}: {
  open: boolean;
  onClose: () => void;
  onParsed: (parsed: ParsedCourse) => void;
  apiKey: string;
  /** Persist a key the user pastes in after the shared server is busy. */
  onSaveKey: (key: string) => void;
  onNeedKey: () => void;
}) {
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [drag, setDrag] = React.useState(false);
  const [pending, setPending] = React.useState<ParsedCourse | null>(null);
  // Shown when the shared free key hits its daily limit — lets the user
  // paste their own key inline and retry without leaving this dialog.
  const [serverBusy, setServerBusy] = React.useState(false);
  const [ownKey, setOwnKey] = React.useState("");
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (!open) {
      setFiles([]);
      setError(null);
      setBusy(false);
      setPending(null);
      setServerBusy(false);
      setOwnKey("");
    }
  }, [open]);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, busy, onClose]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    setError(null);
    setFiles((prev) => [...prev, ...Array.from(list)].slice(0, 4));
  };

  const submit = async (keyOverride?: string) => {
    if (files.length === 0) return;
    const effectiveKey = keyOverride ?? apiKey;
    setBusy(true);
    setError(null);
    try {
      const body = new FormData();
      files.forEach((f) => body.append("files", f));
      if (effectiveKey) body.append("apiKey", effectiveKey);
      const res = await fetch("/api/parse", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "server-busy") {
          setError(data.error ?? "The shared free server is busy right now.");
          setServerBusy(true);
          return;
        }
        if (data.code === "no-key" || data.code === "bad-key") {
          setError(data.error ?? "An API key is required.");
          onNeedKey();
          return;
        }
        setError(data.error ?? "Something went wrong.");
        return;
      }
      setServerBusy(false);
      const parsed = data as ParsedCourse;
      if (parsed.flags && parsed.flags.length > 0) {
        // Hold off on importing — let the user see what we couldn't
        // confidently determine before it lands in their course.
        setPending(parsed);
      } else {
        onParsed(parsed);
      }
    } catch {
      setError("Network error. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  const useOwnKeyAndRetry = () => {
    const trimmed = ownKey.trim();
    if (!trimmed) return;
    onSaveKey(trimmed);
    setServerBusy(false);
    submit(trimmed);
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Auto-fill from syllabus or grades"
          initial="hidden"
          animate="show"
          exit="hidden"
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
            transition={{ duration: 0.2 }}
            onClick={() => !busy && onClose()}
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
                onClick={() => !busy && onClose()}
                className="absolute right-3 top-3 rounded-lg p-2 text-muted transition-colors hover:bg-surface-2 hover:text-foreground cursor-pointer"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              {pending ? (
                <>
                  <div className="mb-1 flex items-center gap-2">
                    <TriangleAlert className="h-5 w-5 text-accent" />
                    <h2 className="text-lg font-bold tracking-tight">
                      Double-check a few things
                    </h2>
                  </div>
                  <p className="mb-4 text-sm leading-relaxed text-muted">
                    Everything else looked clear, but for{" "}
                    <strong className="text-foreground">
                      {pending.flags!.length}
                    </strong>{" "}
                    {pending.flags!.length === 1 ? "category" : "categories"} we
                    left the score blank instead of guessing. Fill these in
                    yourself once the course is added.
                  </p>

                  <ul className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                    {pending.flags!.map((f, i) => (
                      <li key={i} className="px-3 py-2.5 text-sm">
                        <div className="font-semibold text-foreground">
                          {f.category}
                        </div>
                        <p className="mt-0.5 text-xs leading-relaxed text-muted">
                          {f.reason}
                        </p>
                      </li>
                    ))}
                  </ul>

                  <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => setPending(null)}>
                      Back
                    </Button>
                    <Button
                      onClick={() => {
                        onParsed(pending);
                        setPending(null);
                      }}
                    >
                      Continue
                    </Button>
                  </div>
                </>
              ) : (
                <>
                  <div className="mb-1 flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-accent" />
                    <h2 className="text-lg font-bold tracking-tight">
                      Auto-fill with AI
                    </h2>
                  </div>
                  <p className="mb-5 text-sm leading-relaxed text-muted">
                    Drop in your{" "}
                    <strong className="text-foreground">syllabus PDF</strong>{" "}
                    and/or a{" "}
                    <strong className="text-foreground">
                      screenshot of your grades
                    </strong>{" "}
                    (Canvas works great). We&apos;ll pull out the categories,
                    weights, and any scores we can see — and flag anything
                    we&apos;re not sure about instead of guessing.
                  </p>

                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                      setDrag(true);
                    }}
                    onDragLeave={() => setDrag(false)}
                    onDrop={(e) => {
                      e.preventDefault();
                      setDrag(false);
                      addFiles(e.dataTransfer.files);
                    }}
                    onClick={() => inputRef.current?.click()}
                    className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-9 text-center transition-colors ${
                      drag
                        ? "border-accent bg-accent-dim"
                        : "border-border hover:border-white/20 hover:bg-surface-2"
                    }`}
                  >
                    <UploadCloud className="h-7 w-7 text-muted" />
                    <p className="text-sm font-medium text-foreground">
                      Click to choose, or drag files here
                    </p>
                    <p className="text-xs text-muted">
                      PDF, PNG, JPG — up to 4 files
                    </p>
                    <input
                      ref={inputRef}
                      type="file"
                      accept="application/pdf,image/png,image/jpeg,image/webp"
                      multiple
                      className="hidden"
                      onChange={(e) => addFiles(e.target.files)}
                    />
                  </div>

                  {files.length > 0 && (
                    <ul className="mt-3 divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface">
                      {files.map((f, i) => (
                        <li
                          key={i}
                          className="flex items-center justify-between px-3 py-2 text-sm"
                        >
                          <span className="truncate text-foreground">
                            {f.name}
                          </span>
                          <button
                            onClick={() =>
                              setFiles((prev) => prev.filter((_, j) => j !== i))
                            }
                            className="ml-2 rounded-md p-1 text-muted hover:bg-surface-2 hover:text-foreground cursor-pointer"
                            aria-label={`Remove ${f.name}`}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}

                  {error && (
                    <div
                      role="alert"
                      className="mt-3 flex items-start gap-2 rounded-xl border border-accent-soft bg-accent-dim px-3 py-2 text-sm text-foreground"
                    >
                      <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
                      <span>{error}</span>
                    </div>
                  )}

                  {serverBusy && (
                    <div className="mt-3 rounded-xl border border-border bg-surface p-3">
                      <p className="text-xs leading-relaxed text-muted">
                        Paste your own free Gemini key to continue now — it&apos;s
                        saved only in this browser. Or close this and{" "}
                        <span className="font-semibold text-foreground">
                          add the course manually
                        </span>{" "}
                        instead.
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <Input
                          type="password"
                          autoComplete="off"
                          placeholder="AIza…"
                          value={ownKey}
                          onChange={(e) => setOwnKey(e.target.value)}
                          className="h-10"
                          aria-label="Your Gemini API key"
                        />
                        <Button
                          size="sm"
                          onClick={useOwnKeyAndRetry}
                          disabled={busy || !ownKey.trim()}
                        >
                          <Check className="h-4 w-4" />
                          Save &amp; retry
                        </Button>
                      </div>
                      <a
                        href="https://aistudio.google.com/apikey"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-xs font-medium text-accent underline underline-offset-4 hover:no-underline"
                      >
                        Get a free key at Google AI Studio
                      </a>
                    </div>
                  )}

                  <button
                    onClick={onNeedKey}
                    className="mt-4 flex w-full items-center justify-between rounded-lg border-t border-border pt-3 text-left text-xs text-muted hover:text-foreground cursor-pointer"
                  >
                    <span>
                      {apiKey
                        ? "Using your own Gemini key — stored only in this browser."
                        : "Running on a shared free key. Add your own →"}
                    </span>
                    <span className="font-semibold">
                      {apiKey ? "Change" : "Add key"}
                    </span>
                  </button>

                  <div className="mt-5 flex justify-end gap-2">
                    <Button variant="ghost" onClick={() => !busy && onClose()}>
                      Cancel
                    </Button>
                    <Button onClick={() => submit()} disabled={busy || files.length === 0}>
                      {busy ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Reading…
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Extract grades
                        </>
                      )}
                    </Button>
                  </div>
                </>
              )}
            </GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
