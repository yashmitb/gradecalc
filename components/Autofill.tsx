"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  Check,
  Loader2,
  Plus,
  RefreshCw,
  Sparkles,
  TriangleAlert,
  UploadCloud,
  X,
} from "lucide-react";
import { Button, GlassPanel, Input } from "./ui";
import { springs } from "@/lib/springs";
import { fmt } from "@/lib/grades";
import { planMerge, type MergePlan } from "@/lib/merge";
import type { Course, ParsedCourse } from "@/lib/types";

// Cycled through while a request is in flight so the button doesn't look
// stuck on a long extract — purely cosmetic, doesn't reflect real progress.
// Tailored a bit based on what was uploaded (PDF syllabus vs. grade
// screenshots) so it reads as if it's actually working through each file.
// Kept to 2-3 words each so they crossfade quickly without wrapping.
// "Almost done…" is intentionally NOT in this list — it's only shown once
// the cycle has looped a couple times, so it doesn't give false hope on a
// request that's actually just getting started.
function statusMessages(files: File[]): string[] {
  const hasPdf = files.some((f) => f.type === "application/pdf");
  const hasImage = files.some((f) => f.type.startsWith("image/"));

  const messages = ["Reading files…"];
  if (hasPdf) messages.push("Scanning syllabus…");
  if (hasPdf) messages.push("Finding categories…");
  if (hasImage) messages.push("Reading grades…");
  if (hasImage) messages.push("Matching scores…");
  messages.push("Checking weights…");
  messages.push("Cross-checking…");
  return messages;
}

const ALMOST_DONE = "Almost done…";
// How many full loops through the cycle before switching to "Almost done…".
const LOOPS_BEFORE_ALMOST_DONE = 2;

export function Autofill({
  open,
  onClose,
  onParsed,
  apiKey,
  onSaveKey,
  onNeedKey,
  mergeTarget,
  onMerge,
}: {
  open: boolean;
  onClose: () => void;
  onParsed: (parsed: ParsedCourse) => void;
  apiKey: string;
  /** Persist a key the user pastes in after the shared server is busy. */
  onSaveKey: (key: string) => void;
  onNeedKey: () => void;
  /** When set, the dialog runs in "re-sync" mode: a fresh upload is merged
   *  into this existing course (scores updated in place) rather than added as
   *  a new course. */
  mergeTarget?: Course | null;
  /** Apply a planned merge to the existing course. Required in merge mode. */
  onMerge?: (merged: Course) => void;
}) {
  const merging = !!mergeTarget;
  const [files, setFiles] = React.useState<File[]>([]);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [drag, setDrag] = React.useState(false);
  const [pending, setPending] = React.useState<ParsedCourse | null>(null);
  // In merge mode, a computed preview of how the upload folds into the
  // existing course — shown for confirmation before anything is applied.
  const [mergePlan, setMergePlan] = React.useState<MergePlan | null>(null);
  // Shown when the shared free key hits its daily limit — lets the user
  // paste their own key inline and retry without leaving this dialog.
  const [serverBusy, setServerBusy] = React.useState(false);
  const [ownKey, setOwnKey] = React.useState("");
  const [statusIndex, setStatusIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);

  // Cycle the "thinking" status while a request is in flight, so it reads
  // as progress rather than a frozen spinner on slow extracts.
  const messages = React.useMemo(() => statusMessages(files), [files]);

  React.useEffect(() => {
    if (!busy) {
      setStatusIndex(0);
      return;
    }
    const id = setInterval(() => {
      // Loop through the cycle, but after a couple full passes settle on
      // "Almost done…" — by then it plausibly is, and we stop claiming it
      // before that.
      setStatusIndex((i) =>
        i + 1 >= messages.length * LOOPS_BEFORE_ALMOST_DONE
          ? messages.length * LOOPS_BEFORE_ALMOST_DONE
          : i + 1,
      );
    }, 1300);
    return () => clearInterval(id);
  }, [busy, messages.length]);

  const statusText =
    statusIndex >= messages.length * LOOPS_BEFORE_ALMOST_DONE
      ? ALMOST_DONE
      : messages[statusIndex % messages.length];

  React.useEffect(() => {
    if (!open) {
      setFiles([]);
      setError(null);
      setBusy(false);
      setPending(null);
      setMergePlan(null);
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
      if (mergeTarget) {
        // Re-sync: show a diff of how this upload folds into the existing
        // course before changing anything.
        setMergePlan(planMerge(mergeTarget, parsed));
      } else if (parsed.flags && parsed.flags.length > 0) {
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

              {mergePlan ? (
                <MergePreview
                  plan={mergePlan}
                  courseName={mergeTarget?.name ?? "this course"}
                  onBack={() => setMergePlan(null)}
                  onConfirm={() => {
                    onMerge?.(mergePlan.merged);
                    setMergePlan(null);
                  }}
                />
              ) : pending ? (
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
                    {merging ? (
                      <RefreshCw className="h-5 w-5 text-accent" />
                    ) : (
                      <Sparkles className="h-5 w-5 text-accent" />
                    )}
                    <h2 className="text-lg font-bold tracking-tight">
                      {merging
                        ? `Update ${mergeTarget?.name ?? "course"}`
                        : "Auto-fill with AI"}
                    </h2>
                  </div>
                  {merging ? (
                    <p className="mb-5 text-sm leading-relaxed text-muted">
                      Drop in a newer{" "}
                      <strong className="text-foreground">
                        screenshot of your grades
                      </strong>{" "}
                      (or an updated syllabus). We&apos;ll update your scores and
                      pull in any new categories — your weights and edits stay
                      put, and you&apos;ll see exactly what changes first.
                    </p>
                  ) : (
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
                  )}

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
                        : "border-border hover:border-foreground/20 hover:bg-surface-2"
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
                          <span className="relative inline-grid overflow-hidden">
                            <AnimatePresence mode="wait" initial={false}>
                              <motion.span
                                key={statusIndex}
                                initial={{ opacity: 0, y: 6 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -6 }}
                                transition={{ duration: 0.2 }}
                                className="col-start-1 row-start-1"
                              >
                                {statusText}
                              </motion.span>
                            </AnimatePresence>
                          </span>
                        </>
                      ) : merging ? (
                        <>
                          <RefreshCw className="h-4 w-4" />
                          Review update
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

/** Score as a percent, or an em-dash when not graded. */
function scoreLabel(score: number | null): string {
  return score === null ? "—" : `${fmt(score)}%`;
}

/**
 * Re-sync confirmation: shows exactly which scores will change and which
 * categories will be added before anything touches the saved course.
 */
function MergePreview({
  plan,
  courseName,
  onBack,
  onConfirm,
}: {
  plan: MergePlan;
  courseName: string;
  onBack: () => void;
  onConfirm: () => void;
}) {
  const changed = plan.rows.filter(
    (r) => r.kind === "updated" || r.kind === "added",
  );
  const unchanged = plan.rows.length - changed.length;
  const nothingChanged = plan.updated === 0 && plan.added === 0;

  return (
    <>
      <div className="mb-1 flex items-center gap-2">
        <RefreshCw className="h-5 w-5 text-accent" />
        <h2 className="text-lg font-bold tracking-tight">
          {nothingChanged ? "Already up to date" : "Review the update"}
        </h2>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-muted">
        {nothingChanged ? (
          <>
            Nothing new for{" "}
            <strong className="text-foreground">{courseName}</strong> — the
            scores in this upload already match what you have.
          </>
        ) : (
          <>
            Here&apos;s what will change in{" "}
            <strong className="text-foreground">{courseName}</strong>.
            Everything else stays exactly as it is.
          </>
        )}
      </p>

      {changed.length > 0 && (
        <motion.ul
          className="divide-y divide-border overflow-hidden rounded-xl border border-border bg-surface"
          initial="hidden"
          animate="show"
          variants={{
            hidden: {},
            show: { transition: { staggerChildren: 0.04 } },
          }}
        >
          {changed.map((r, i) => (
            <motion.li
              key={i}
              variants={{
                hidden: { opacity: 0, y: 6 },
                show: { opacity: 1, y: 0 },
              }}
              className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm"
            >
              <div className="flex min-w-0 items-center gap-2">
                {r.kind === "added" ? (
                  <Plus className="h-3.5 w-3.5 shrink-0 text-accent" />
                ) : (
                  <RefreshCw className="h-3.5 w-3.5 shrink-0 text-accent" />
                )}
                <span className="truncate font-semibold text-foreground">
                  {r.name}
                </span>
                {r.kind === "added" && (
                  <span className="shrink-0 rounded-full border border-accent-soft bg-accent-dim px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-accent">
                    New
                  </span>
                )}
              </div>
              <div className="tnum flex shrink-0 items-center gap-1.5 font-semibold">
                {r.kind === "updated" ? (
                  <>
                    <span className="text-muted">{scoreLabel(r.from)}</span>
                    <ArrowRight className="h-3.5 w-3.5 text-muted" />
                    <span className="text-foreground">{scoreLabel(r.to)}</span>
                  </>
                ) : (
                  <span className="text-foreground">
                    {scoreLabel(r.score)}
                    <span className="ml-1 text-xs font-medium text-muted">
                      · {fmt(r.weight, 0)}%
                    </span>
                  </span>
                )}
              </div>
            </motion.li>
          ))}
        </motion.ul>
      )}

      {unchanged > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {`${unchanged} categor${unchanged === 1 ? "y" : "ies"} unchanged.`}
        </p>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <Button variant="ghost" onClick={onBack}>
          Back
        </Button>
        <Button onClick={onConfirm}>
          {nothingChanged ? (
            "Done"
          ) : (
            <>
              <Check className="h-4 w-4" />
              {`Apply ${plan.updated + plan.added} change${
                plan.updated + plan.added === 1 ? "" : "s"
              }`}
            </>
          )}
        </Button>
      </div>
    </>
  );
}
