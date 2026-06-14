"use client";

import * as React from "react";
import { AnimatePresence, animate, motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  Plus,
  RefreshCw,
  RotateCcw,
  Sparkles,
  Trash2,
  TriangleAlert,
} from "lucide-react";
import { Button, Card, GlassPanel, Input, Label, Pill } from "./ui";
import { CategoryBreakdown, GradeProgressBar, StatusBadge } from "./Visualizations";
import { InfoTip } from "./InfoTip";
import { Select } from "./Select";
import { AskAiFix, type WireCategory } from "./AskAiFix";
import { springs } from "@/lib/springs";
import type { Category, Course } from "@/lib/types";
import { LETTER_TARGETS } from "@/lib/types";
import {
  courseStatus,
  currentGrade,
  fmt,
  letterFor,
  neededScore,
  totalWeight,
  uid,
} from "@/lib/grades";
import { DEFAULT_CREDITS, effectiveGrade, fmtGPA, gpaPointsFor } from "@/lib/gpa";
import {
  DEFAULT_SCALE,
  SCALE_PRESETS,
  normalizeScale,
  presetIdFor,
  type GradingScale,
} from "@/lib/scale";
import {
  COURSE_COLORS,
  DEFAULT_COURSE_COLOR,
  accentStyle,
} from "@/lib/colors";
import { cn } from "@/lib/cn";

export function CourseDetail({
  course,
  onChange,
  onBack,
  onResync,
  onDelete,
  apiKey,
  onNeedKey,
}: {
  course: Course;
  onChange: (patch: Partial<Course>) => void;
  onBack: () => void;
  /** Open the auto-fill dialog in re-sync mode to update this course. */
  onResync: () => void;
  onDelete: () => void;
  /** Gemini key (own or shared) for the conversational "fix this" edits. */
  apiKey: string;
  onNeedKey: () => void;
}) {
  const cats = course.categories;
  const tw = totalWeight(cats);
  const weightOk = Math.abs(tw - 100) < 0.5;
  const cur = currentGrade(cats);

  const ungraded = cats.filter((c) => c.score === null);
  const [targetCatId, setTargetCatId] = React.useState<string>("");
  const [customizeOpen, setCustomizeOpen] = React.useState(false);
  const targetGrade = course.targetGrade ?? 90;
  const setTargetGrade = (v: number) => onChange({ targetGrade: v });
  const status = courseStatus(cats, targetGrade);

  const egrade = effectiveGrade(course);
  const gpaPoints =
    egrade !== null ? gpaPointsFor(egrade, course.gradingScale) : null;
  const scale = course.gradingScale;
  const includeInGPA = course.includeInGPA ?? true;

  // The course title is an auto-growing textarea so long names wrap instead
  // of clipping on narrow screens. Re-measure on edit and on viewport resize.
  const nameRef = React.useRef<HTMLTextAreaElement>(null);
  React.useLayoutEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const resize = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    resize();
    window.addEventListener("resize", resize);
    return () => window.removeEventListener("resize", resize);
  }, [course.name]);

  React.useEffect(() => {
    const stillValid = cats.some((c) => c.id === targetCatId);
    if (!stillValid) {
      const preferred =
        ungraded.find((c) => /final/i.test(c.name)) ??
        ungraded[ungraded.length - 1] ??
        cats[cats.length - 1];
      setTargetCatId(preferred?.id ?? "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [course.id, cats.length]);

  const setCat = (id: string, patch: Partial<Category>) =>
    onChange({
      categories: cats.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    });

  const addCat = () =>
    onChange({
      categories: [
        ...cats,
        { id: uid(), name: "New category", weight: 0, score: null },
      ],
    });

  const removeCat = (id: string) =>
    onChange({ categories: cats.filter((c) => c.id !== id) });

  // Apply an AI "fix this" edit, reusing existing category ids by name so the
  // UI stays stable for untouched rows.
  const applyAiEdit = (result: { name: string; categories: WireCategory[] }) => {
    const byName = new Map(cats.map((c) => [c.name.toLowerCase().trim(), c]));
    const used = new Set<string>();
    const next = result.categories.map((rc) => {
      const key = rc.name.toLowerCase().trim();
      const existing = byName.get(key);
      if (existing && !used.has(key)) {
        used.add(key);
        return { ...existing, name: rc.name, weight: rc.weight, score: rc.score };
      }
      return { id: uid(), name: rc.name, weight: rc.weight, score: rc.score };
    });
    onChange({ name: result.name, categories: next });
  };

  const result = targetCatId
    ? neededScore(cats, targetCatId, targetGrade)
    : null;
  const targetCat = cats.find((c) => c.id === targetCatId);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={springs.smooth}
      style={accentStyle(course.color)}
      className="mx-auto w-full max-w-3xl"
    >
      <div className="mb-8 flex items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={onBack} className="-ml-2">
          <ArrowLeft className="h-4 w-4" />
          All courses
        </Button>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onResync}>
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Update from upload</span>
            <span className="sm:hidden">Update</span>
          </Button>
          <Button variant="danger" size="sm" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </div>

      {/* Course name + current grade */}
      <Card className="mb-6 p-6">
        <textarea
          ref={nameRef}
          value={course.name}
          onChange={(e) => onChange({ name: e.target.value })}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              e.currentTarget.blur();
            }
          }}
          rows={1}
          className="w-full resize-none overflow-hidden bg-transparent text-2xl font-extrabold leading-tight tracking-tight text-foreground outline-none placeholder:text-muted sm:text-3xl"
          placeholder="Course name"
          aria-label="Course name"
        />
        <div className="mt-3 flex flex-wrap items-baseline gap-3">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
            Current
          </span>
          <span className="tnum text-2xl font-bold leading-none">
            {fmt(cur)}
            {cur !== null && (
              <span className="text-lg font-medium text-muted">%</span>
            )}
          </span>
          {cur !== null && (
            <span className="rounded-full border border-accent-soft bg-accent-dim px-2.5 py-0.5 text-sm font-bold text-accent">
              {letterFor(cur, scale)}
            </span>
          )}
          {cur !== null && <StatusBadge status={status} />}
        </div>

        {cur !== null && (
          <div className="mt-5">
            <GradeProgressBar current={cur} target={targetGrade} status={status} />
          </div>
        )}
      </Card>

      {/* Category breakdown */}
      {cats.length > 0 && (
        <Card className="mb-6 p-6">
          <div className="mb-4 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Category breakdown
          </div>
          <CategoryBreakdown categories={cats} />
        </Card>
      )}

      {/* Categories */}
      <Card className="overflow-hidden">
        <div className="grid grid-cols-[1fr_88px_88px_44px] gap-2 border-b border-border px-4 py-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          <span>Category</span>
          <span className="text-right">Weight %</span>
          <span className="text-right">Score %</span>
          <span />
        </div>

        <div className="divide-y divide-border">
          {cats.map((c) => (
            <div
              key={c.id}
              className="grid grid-cols-[1fr_88px_88px_44px] items-center gap-2 px-4 py-2.5"
            >
              <input
                value={c.name}
                onChange={(e) => setCat(c.id, { name: e.target.value })}
                className="h-10 w-full min-w-0 rounded-lg bg-transparent px-2 text-sm font-medium text-foreground outline-none focus:bg-surface-2"
                aria-label="Category name"
              />
              <Input
                type="number"
                inputMode="decimal"
                value={Number.isFinite(c.weight) ? c.weight : ""}
                onChange={(e) =>
                  setCat(c.id, {
                    weight: Math.max(0, parseFloat(e.target.value) || 0),
                  })
                }
                className="h-10 text-right"
                aria-label={`${c.name} weight`}
              />
              <Input
                type="number"
                inputMode="decimal"
                placeholder="—"
                value={c.score ?? ""}
                onChange={(e) => {
                  const v = e.target.value;
                  setCat(c.id, {
                    score: v === "" ? null : Math.max(0, parseFloat(v) || 0),
                  });
                }}
                className="h-10 text-right"
                aria-label={`${c.name} score`}
              />
              <button
                onClick={() => removeCat(c.id)}
                className="flex h-10 w-11 items-center justify-center rounded-lg text-muted hover:bg-surface-2 hover:text-red-400 cursor-pointer transition-colors"
                aria-label={`Remove ${c.name}`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-border px-4 py-2.5">
          <Button variant="ghost" size="sm" onClick={addCat} className="-ml-2">
            <Plus className="h-4 w-4" />
            Add category
          </Button>
          <div className="flex items-center gap-2 text-sm">
            <span className="text-muted">Total</span>
            <Pill active={weightOk} className="tnum">
              {fmt(tw, 0)}%
            </Pill>
          </div>
        </div>
      </Card>

      {!weightOk && (
        <p className="mt-3 flex items-center gap-1.5 px-0.5 text-sm text-muted">
          <TriangleAlert className="h-4 w-4" />
          Weights total {fmt(tw, 0)}%, not 100%. Results use these weights as
          given.
        </p>
      )}

      {/* Target controls — only needed while something is left to grade */}
      {ungraded.length > 0 ? (
        <div className="mt-10">
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <Label>I want at least</Label>
              <div className="mb-2 flex flex-wrap gap-1 rounded-xl border border-border bg-surface p-1">
                {LETTER_TARGETS.map((t) => (
                  <motion.button
                    key={t.label}
                    onClick={() => setTargetGrade(t.min)}
                    whileHover={{ scale: 1.04 }}
                    whileTap={{ scale: 0.96 }}
                    transition={springs.snappy}
                    className={`tnum flex-1 cursor-pointer rounded-lg px-2 py-2 text-sm font-semibold transition-colors ${
                      targetGrade === t.min
                        ? "bg-accent text-[#0a0a0a]"
                        : "text-muted hover:bg-surface-2 hover:text-foreground"
                    }`}
                  >
                    {t.label}
                  </motion.button>
                ))}
              </div>
              <Input
                type="number"
                inputMode="decimal"
                suffix="%"
                value={Number.isFinite(targetGrade) ? targetGrade : ""}
                onChange={(e) => setTargetGrade(parseFloat(e.target.value) || 0)}
                aria-label="Target grade percent"
              />
            </div>

            <div>
              <Label>On this</Label>
              <Select
                value={targetCatId}
                onChange={setTargetCatId}
                ariaLabel="Category to solve for"
                options={cats.map((c) => ({
                  value: c.id,
                  label: c.name,
                  hint: c.score !== null ? "graded" : undefined,
                }))}
              />
              <p className="mt-2 text-xs leading-relaxed text-muted">
                Other ungraded categories are assumed to score 0% — a worst-case
                answer.
              </p>
            </div>
          </div>

          <Reveal
            result={result}
            targetCat={targetCat}
            targetGrade={targetGrade}
            scale={scale}
          />
        </div>
      ) : (
        cur !== null && <FinalGrade grade={cur} scale={scale} />
      )}

      {/* Everything optional lives behind one quiet toggle. */}
      <Card className="mt-10 overflow-hidden">
        <button
          onClick={() => setCustomizeOpen((v) => !v)}
          aria-expanded={customizeOpen}
          className="flex w-full cursor-pointer items-center justify-between gap-3 p-5 text-left"
        >
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
            Customize
          </span>
          <span className="flex items-center gap-2 text-xs text-muted">
            <span className="hidden sm:inline">
              Units · GPA scale · color · AI fix
            </span>
            <motion.span
              animate={{ rotate: customizeOpen ? 180 : 0 }}
              transition={springs.snappy}
              className="flex"
            >
              <ChevronDown className="h-3.5 w-3.5" />
            </motion.span>
          </span>
        </button>

        <AnimatePresence initial={false}>
          {customizeOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={springs.smooth}
              className="overflow-hidden"
            >
              <div className="space-y-6 border-t border-border p-6">
                {/* Units · count toward GPA · color */}
                <div className="flex flex-wrap items-center gap-x-5 gap-y-3 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      Units
                    </span>
                    <Input
                      type="number"
                      inputMode="decimal"
                      min={0}
                      value={course.credits ?? DEFAULT_CREDITS}
                      onChange={(e) =>
                        onChange({
                          credits: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      className="h-9 w-16 px-2 text-center"
                      aria-label="Credit units"
                    />
                    <InfoTip
                      align="start"
                      label="Credit hours for this course — used to weight it in your GPA."
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <label className="flex cursor-pointer items-center gap-2 text-muted">
                      <input
                        type="checkbox"
                        checked={includeInGPA}
                        onChange={(e) =>
                          onChange({ includeInGPA: e.target.checked })
                        }
                        className="h-4 w-4 cursor-pointer rounded border-border bg-surface accent-[var(--color-accent)]"
                      />
                      Count toward GPA
                    </label>
                    <InfoTip
                      align="start"
                      label="Turn this off for pass/fail or audited courses so they don't affect your GPA."
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-semibold uppercase tracking-[0.12em] text-muted">
                      Color
                    </span>
                    <div className="flex items-center gap-1.5">
                      {COURSE_COLORS.map((c) => {
                        const selected =
                          (course.color ?? DEFAULT_COURSE_COLOR) === c.key;
                        return (
                          <motion.button
                            key={c.key}
                            onClick={() => onChange({ color: c.key })}
                            whileHover={{ scale: 1.15 }}
                            whileTap={{ scale: 0.9 }}
                            transition={springs.snappy}
                            aria-label={`${c.label} accent`}
                            aria-pressed={selected}
                            className={cn(
                              "h-5 w-5 cursor-pointer rounded-full ring-2 ring-offset-2 ring-offset-surface transition-shadow",
                              selected ? "ring-foreground" : "ring-transparent",
                            )}
                            style={{ backgroundColor: c.base }}
                          />
                        );
                      })}
                    </div>
                  </div>
                  {gpaPoints !== null && includeInGPA && (
                    <span className="tnum ml-auto rounded-full border border-accent-soft bg-accent-dim px-2.5 py-1 text-xs font-bold text-accent">
                      {fmtGPA(gpaPoints)} GPA pts
                    </span>
                  )}
                </div>

                {/* Grading scale */}
                <div className="border-t border-border pt-5">
                  <GradingScaleEditor
                    value={course.gradingScale}
                    onChange={(s) => onChange({ gradingScale: s })}
                  />
                </div>

                {/* Ask AI to fix */}
                <div className="border-t border-border pt-5">
                  <div className="mb-3 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-accent" />
                    <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                      Ask AI to fix
                    </h3>
                    <InfoTip
                      align="start"
                      label="Describe a change in plain words — “midterm is 25% not 30%”, “add a 10% quiz”, “I got 95 on homework”. You'll see exactly what changes before it applies."
                    />
                  </div>
                  <AskAiFix
                    name={course.name}
                    categories={cats.map((c) => ({
                      name: c.name,
                      weight: c.weight,
                      score: c.score,
                    }))}
                    apiKey={apiKey}
                    onNeedKey={onNeedKey}
                    onApply={applyAiEdit}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
}

/**
 * Inline per-course grading scale editor: pick a preset, or edit the
 * %→letter→GPA rows directly. Stored on the course; `undefined` = use default.
 */
function GradingScaleEditor({
  value,
  onChange,
}: {
  value?: GradingScale;
  onChange: (scale: GradingScale | undefined) => void;
}) {
  const scale = value ?? DEFAULT_SCALE;
  const activePreset = presetIdFor(value);

  const setTier = (i: number, patch: Partial<GradingScale[number]>) =>
    onChange(scale.map((t, j) => (j === i ? { ...t, ...patch } : t)));
  const addTier = () =>
    onChange([...scale, { min: 0, letter: "—", points: 0 }]);
  const removeTier = (i: number) =>
    onChange(scale.filter((_, j) => j !== i));
  const applyPreset = (id: string) => {
    if (id === "standard") return onChange(undefined); // default → store nothing
    const p = SCALE_PRESETS.find((x) => x.id === id);
    if (p) onChange(normalizeScale(p.scale));
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
          Grading scale
        </h3>
        <InfoTip
          align="start"
          label="How percentages become letters and GPA points for this course. Auto-detected from a syllabus when possible — or pick a preset and fine-tune it."
        />
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {SCALE_PRESETS.map((p) => (
          <button
            key={p.id}
            onClick={() => applyPreset(p.id)}
            className={`cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
              activePreset === p.id
                ? "bg-accent text-[#0a0a0a]"
                : "border border-border text-muted hover:bg-surface-2 hover:text-foreground"
            }`}
          >
            {p.name}
          </button>
        ))}
        {value !== undefined && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange(undefined)}
            className="ml-auto"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset
          </Button>
        )}
      </div>

      <div className="grid grid-cols-[1fr_84px_84px_44px] gap-2 px-1 pb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        <span>Letter</span>
        <span className="text-right">Min %</span>
        <span className="text-right">GPA</span>
        <span />
      </div>
      <div className="space-y-1.5">
        {scale.map((t, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_84px_84px_44px] items-center gap-2"
          >
            <Input
              value={t.letter}
              onChange={(e) => setTier(i, { letter: e.target.value })}
              className="h-10"
              aria-label={`Tier ${i + 1} letter`}
            />
            <Input
              type="number"
              inputMode="decimal"
              value={Number.isFinite(t.min) ? t.min : ""}
              onChange={(e) =>
                setTier(i, {
                  min: Math.max(
                    0,
                    Math.min(100, parseFloat(e.target.value) || 0),
                  ),
                })
              }
              className="h-10 text-right"
              aria-label={`Tier ${i + 1} minimum percent`}
            />
            <Input
              type="number"
              inputMode="decimal"
              step={0.1}
              value={Number.isFinite(t.points) ? t.points : ""}
              onChange={(e) =>
                setTier(i, {
                  points: Math.max(
                    0,
                    Math.min(5, parseFloat(e.target.value) || 0),
                  ),
                })
              }
              className="h-10 text-right"
              aria-label={`Tier ${i + 1} GPA points`}
            />
            <button
              onClick={() => removeTier(i)}
              className="flex h-10 w-11 items-center justify-center rounded-lg text-muted transition-colors hover:bg-surface-2 hover:text-red-400 cursor-pointer"
              aria-label={`Remove tier ${i + 1}`}
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        ))}
      </div>
      <Button
        variant="ghost"
        size="sm"
        onClick={addTier}
        className="mt-2 -ml-2"
      >
        <Plus className="h-4 w-4" />
        Add row
      </Button>
    </div>
  );
}

function Reveal({
  result,
  targetCat,
  targetGrade,
  scale,
}: {
  result: ReturnType<typeof neededScore> | null;
  targetCat: Category | undefined;
  targetGrade: number;
  scale?: GradingScale;
}) {
  if (!result || !targetCat) return null;

  let big: React.ReactNode = null;
  let caption: React.ReactNode = null;
  let tone: "accent" | "neutral" = "accent";

  switch (result.kind) {
    case "no-target-category":
      return null;
    case "already-secured":
      big = "LOCKED";
      caption = (
        <>
          Already secured — even a <span className="tnum">0%</span> on the{" "}
          {targetCat.name} keeps you at or above{" "}
          <span className="tnum">{fmt(targetGrade, 0)}%</span>.
        </>
      );
      break;
    case "trivial":
      big = <CountUp value={result.needed} />;
      caption = (
        <>
          Basically guaranteed — that&apos;s all you need on the{" "}
          {targetCat.name}.
        </>
      );
      break;
    case "possible":
      big = <CountUp value={result.needed} />;
      caption = (
        <>
          needed on the{" "}
          <span className="font-semibold text-foreground">
            {targetCat.name}
          </span>{" "}
          to finish at {fmt(targetGrade, 0)}% ({letterFor(targetGrade, scale)})
        </>
      );
      break;
    case "impossible":
      tone = "neutral";
      big = "OUT OF REACH";
      caption = (
        <>
          Even a perfect <span className="tnum">100%</span> on the{" "}
          {targetCat.name} caps you at{" "}
          <span className="tnum">{fmt(result.maxPossible)}%</span>. Try a lower
          target.
        </>
      );
      break;
  }

  const isWord =
    result.kind === "already-secured" || result.kind === "impossible";

  return (
    <motion.div
      key={`${result.kind}-${
        "needed" in result ? fmt(result.needed) : ""
      }-${targetGrade}-${targetCat.id}`}
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springs.smooth}
    >
      <GlassPanel
        className={`mt-6 overflow-hidden px-6 py-8 ${
          tone === "accent" ? "border-accent-soft" : ""
        }`}
      >
        <motion.div
          initial={{ y: "110%" }}
          animate={{ y: "0%" }}
          transition={{ ...springs.smooth, delay: 0.05 }}
          className={`font-extrabold leading-[0.9] tracking-tighter ${
            isWord
              ? "text-4xl sm:text-5xl text-foreground"
              : "text-7xl sm:text-8xl text-accent"
          }`}
        >
          {big}
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-muted"
        >
          {caption}
        </motion.p>
      </GlassPanel>
    </motion.div>
  );
}

/** Shown once every category is graded — the course is done. */
function FinalGrade({ grade, scale }: { grade: number; scale?: GradingScale }) {
  return (
    <motion.div
      key="final-grade"
      role="status"
      aria-live="polite"
      initial={{ opacity: 0, y: 16, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={springs.smooth}
    >
      <GlassPanel className="mt-10 overflow-hidden border-accent-soft px-6 py-8">
        <motion.div
          initial={{ y: "110%" }}
          animate={{ y: "0%" }}
          transition={{ ...springs.smooth, delay: 0.05 }}
          className="font-extrabold leading-[0.9] tracking-tighter text-7xl sm:text-8xl text-accent"
        >
          <CountUp value={grade} />
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.25, duration: 0.4 }}
          className="mt-4 max-w-md text-pretty text-sm leading-relaxed text-muted"
        >
          Final grade —{" "}
          <span className="font-semibold text-foreground">
            {letterFor(grade, scale)}
          </span>
          . Every category is graded, nothing left to project.
        </motion.p>
      </GlassPanel>
    </motion.div>
  );
}

/** Animated count-up for the big needed-score number. */
function CountUp({ value }: { value: number }) {
  const [display, setDisplay] = React.useState(0);
  React.useEffect(() => {
    const controls = animate(0, value, {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setDisplay(v),
    });
    return () => controls.stop();
  }, [value]);
  return (
    <>
      <span className="tnum">{display.toFixed(1)}</span>
      <span className="align-top text-[0.4em] font-bold">%</span>
    </>
  );
}
