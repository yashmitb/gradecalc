"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ChevronDown,
  GraduationCap,
  RotateCcw,
  SlidersHorizontal,
} from "lucide-react";
import { Button, Card } from "./ui";
import { InfoTip } from "./InfoTip";
import { fadeUp, springs } from "@/lib/springs";
import { fmt, letterFor } from "@/lib/grades";
import {
  DEFAULT_CREDITS,
  cumulativeGPA,
  effectiveGrade,
  fmtGPA,
  gpaPointsFor,
  neededSemesterGPA,
  semesterGPA,
  type GradeOverrides,
  type NeededGPAResult,
} from "@/lib/gpa";
import { gpaRange } from "@/lib/reality";
import { termNoun, type TermSystem } from "@/lib/terms";
import type { Profile } from "@/lib/useProfile";
import type { Course } from "@/lib/types";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * GPA rollup for the active term plus a cumulative figure that blends every
 * term's courses with the optional "before GradeHQ" prior. Prior/target are
 * configured in Settings — this panel is read-only.
 */
export function GPAPanel({
  termCourses,
  allCourses,
  system,
  profile,
}: {
  termCourses: Course[];
  allCourses: Course[];
  system: TermSystem;
  profile: Profile;
}) {
  const noun = termNoun(system);
  const sem = semesterGPA(termCourses);
  const allSem = semesterGPA(allCourses);
  const range = gpaRange(termCourses);

  const hasPrior =
    profile.priorGPA !== null &&
    profile.priorCredits !== null &&
    profile.priorCredits > 0;

  const termIds = new Set(termCourses.map((c) => c.id));
  const otherCourses = allCourses.filter((c) => !termIds.has(c.id));
  const showCumulative = hasPrior || otherCourses.length > 0;

  const cum = cumulativeGPA(
    profile.priorGPA ?? 0,
    profile.priorCredits ?? 0,
    allSem,
  );

  // "Needed this term" treats everything outside the active term (prior record
  // + other terms' courses) as locked-in.
  const effPrior = cumulativeGPA(
    profile.priorGPA ?? 0,
    profile.priorCredits ?? 0,
    semesterGPA(otherCourses),
  );
  const target = profile.targetCumulativeGPA;
  const needed =
    target !== null && sem.credits > 0
      ? neededSemesterGPA(
          effPrior.gpa ?? 0,
          effPrior.credits,
          sem.credits,
          target,
        )
      : null;

  return (
    <Card className="mb-8 p-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="h-4 w-4 text-accent" />
        <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
          GPA calculator
        </h2>
        <InfoTip
          align="start"
          label={`${cap(noun)} GPA is projected from each course's current grade × its units. Cumulative blends every term with your prior record — set that and a target in Settings.`}
        />
      </div>

      <motion.div
        className="mt-5 grid grid-cols-2 gap-x-6 gap-y-4 sm:grid-cols-3"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.05 } },
        }}
      >
        <Stat
          label={`${cap(noun)} GPA`}
          value={fmtGPA(sem.gpa)}
          sub={sem.credits > 0 ? `${sem.credits} units` : "no graded units yet"}
        />
        {showCumulative && (
          <Stat
            label="Cumulative GPA"
            value={fmtGPA(cum.gpa)}
            sub={`${cum.credits} units total`}
          />
        )}
        {needed && (
          <NeededStat needed={needed} target={target!} noun={noun} />
        )}
      </motion.div>

      {sem.excluded > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {`${sem.excluded} course${sem.excluded === 1 ? "" : "s"} not counted — no grade yet, or marked “don't count toward GPA”.`}
        </p>
      )}

      {range.worst !== null &&
        range.best !== null &&
        range.inPlayCount > 0 && (
          <p className="mt-1 text-xs leading-relaxed text-muted">
            {`This ${noun} could finish anywhere from ${fmtGPA(range.worst)} to ${fmtGPA(range.best)} GPA${
              range.lockedCount > 0
                ? ` — ${range.lockedCount} course${range.lockedCount === 1 ? "" : "s"} already locked in.`
                : "."
            }`}
          </p>
        )}

      <WhatIfSection
        termCourses={termCourses}
        allCourses={allCourses}
        profile={profile}
        noun={noun}
      />
    </Card>
  );
}

/**
 * "What if I get a B+ here?" — per-course sliders for a hypothetical final
 * grade that live-preview the term and cumulative GPA, folded into the GPA
 * card so your real and hypothetical numbers sit side by side. A scratchpad —
 * never touches real category scores.
 */
function WhatIfSection({
  termCourses,
  allCourses,
  profile,
  noun,
}: {
  termCourses: Course[];
  allCourses: Course[];
  profile: Profile;
  noun: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [overrides, setOverrides] = React.useState<GradeOverrides>({});

  const eligible = React.useMemo(
    () =>
      termCourses
        .map((course) => ({ course, current: effectiveGrade(course) }))
        .filter(
          (c): c is { course: Course; current: number } => c.current !== null,
        ),
    [termCourses],
  );

  if (eligible.length === 0) return null;

  const hasOverrides = Object.keys(overrides).length > 0;
  const sem = semesterGPA(termCourses, overrides);
  const allSem = semesterGPA(allCourses, overrides);
  const hasPrior =
    profile.priorGPA !== null &&
    profile.priorCredits !== null &&
    profile.priorCredits > 0;
  const termIds = new Set(termCourses.map((c) => c.id));
  const showCumulative = hasPrior || allCourses.some((c) => !termIds.has(c.id));
  const cum = showCumulative
    ? cumulativeGPA(profile.priorGPA ?? 0, profile.priorCredits ?? 0, allSem)
    : null;

  const setOverride = (id: string, value: number) =>
    setOverrides((prev) => ({ ...prev, [id]: value }));

  return (
    <div className="mt-5 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-accent" />
          <h3 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            What if?
          </h3>
          <InfoTip
            align="start"
            label="Drag any course to a hypothetical final grade to preview your GPA. Your real grades aren't changed."
          />
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          className="flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-foreground cursor-pointer"
        >
          {open ? "Hide" : "Try it"}
          <motion.span
            animate={{ rotate: open ? 180 : 0 }}
            transition={springs.snappy}
            className="flex"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.span>
        </button>
      </div>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springs.smooth}
            className="overflow-hidden"
          >
            <div className="pt-5">
              {hasOverrides && (
                <div className="mb-4 flex justify-end">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOverrides({})}
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                </div>
              )}

              <motion.div
                className="space-y-5"
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.04 } },
                }}
              >
                {eligible.map(({ course, current }) => {
                  const value = overrides[course.id] ?? current;
                  const pts = gpaPointsFor(value, course.gradingScale);
                  const pct = Math.max(0, Math.min(100, value));
                  const includeInGPA = course.includeInGPA ?? true;
                  return (
                    <motion.div key={course.id} variants={fadeUp}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {course.name}
                        </span>
                        <div className="tnum flex shrink-0 items-center gap-2">
                          <span className="text-sm font-bold">
                            {fmt(value)}%
                          </span>
                          <span className="rounded-full border border-accent-soft bg-accent-dim px-2 py-0.5 text-xs font-bold text-accent transition-colors duration-150">
                            {letterFor(value, course.gradingScale)}
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.5}
                        value={value}
                        onChange={(e) =>
                          setOverride(course.id, parseFloat(e.target.value))
                        }
                        className="slider mt-3"
                        style={{
                          background: `linear-gradient(to right, var(--color-accent) ${pct}%, var(--color-border) ${pct}%)`,
                        }}
                        aria-label={`Hypothetical final grade for ${course.name}`}
                      />
                      <div className="mt-1.5 flex items-center justify-between text-[11px] text-muted">
                        <span>{course.credits ?? DEFAULT_CREDITS} units</span>
                        <span>
                          {includeInGPA
                            ? `${fmtGPA(pts)} GPA pts`
                            : "not counted toward GPA"}
                        </span>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              <div className="mt-6 grid grid-cols-1 gap-3 rounded-2xl border border-accent-soft bg-accent-dim p-4 sm:grid-cols-2">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                    Projected {cap(noun)} GPA
                  </div>
                  <div className="tnum mt-1 text-2xl font-extrabold tracking-tight text-foreground">
                    {fmtGPA(sem.gpa)}
                  </div>
                </div>
                {showCumulative && (
                  <div>
                    <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-accent">
                      Projected cumulative GPA
                    </div>
                    <div className="tnum mt-1 text-2xl font-extrabold tracking-tight text-foreground">
                      {fmtGPA(cum?.gpa ?? null)}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Stat({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <motion.div variants={fadeUp}>
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <div className="tnum mt-1.5 text-2xl font-extrabold tracking-tight">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </motion.div>
  );
}

function NeededStat({
  needed,
  target,
  noun,
}: {
  needed: NeededGPAResult;
  target: number;
  noun: string;
}) {
  const label = `Needed this ${noun}`;
  switch (needed.kind) {
    case "already-secured":
      return (
        <Stat
          label={label}
          value="Locked in"
          sub={`Already on track for ${fmtGPA(target)}`}
        />
      );
    case "impossible":
      return (
        <Stat
          label={label}
          value="4.00 max"
          sub={`${fmtGPA(target)} isn't reachable this term`}
        />
      );
    case "possible":
      return (
        <Stat
          label={label}
          value={fmtGPA(needed.needed)}
          sub={`to reach ${fmtGPA(target)} cumulative`}
        />
      );
    default:
      return null;
  }
}
