"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button, Card } from "./ui";
import { InfoTip } from "./InfoTip";
import { springs, fadeUp } from "@/lib/springs";
import { fmt, letterFor } from "@/lib/grades";
import {
  DEFAULT_CREDITS,
  cumulativeGPA,
  effectiveGrade,
  fmtGPA,
  gpaPointsFor,
  semesterGPA,
  type GradeOverrides,
} from "@/lib/gpa";
import { termNoun, type TermSystem } from "@/lib/terms";
import type { Profile } from "@/lib/useProfile";
import type { Course } from "@/lib/types";

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

/**
 * "What if I get a B+ here and an A- there?" — per-course sliders for a
 * hypothetical final grade that live-update that course's letter grade/GPA
 * points, plus the active term's GPA and the blended cumulative. Purely a
 * scratchpad — never touches real category scores.
 */
export function WhatIfPanel({
  courses,
  allCourses,
  profile,
  system,
}: {
  /** Active-term courses (the sliders). */
  courses: Course[];
  /** Every course across terms (for the projected cumulative). */
  allCourses: Course[];
  profile: Profile;
  system: TermSystem;
}) {
  const noun = termNoun(system);
  const [open, setOpen] = React.useState(false);
  const [overrides, setOverrides] = React.useState<GradeOverrides>({});

  const eligible = React.useMemo(
    () =>
      courses
        .map((course) => ({ course, current: effectiveGrade(course) }))
        .filter(
          (c): c is { course: Course; current: number } => c.current !== null,
        ),
    [courses],
  );

  if (eligible.length === 0) return null;

  const hasOverrides = Object.keys(overrides).length > 0;
  const sem = semesterGPA(courses, overrides);
  const allSem = semesterGPA(allCourses, overrides);
  const hasPrior =
    profile.priorGPA !== null &&
    profile.priorCredits !== null &&
    profile.priorCredits > 0;
  const termIds = new Set(courses.map((c) => c.id));
  const showCumulative = hasPrior || allCourses.some((c) => !termIds.has(c.id));
  const cum = showCumulative
    ? cumulativeGPA(profile.priorGPA ?? 0, profile.priorCredits ?? 0, allSem)
    : null;

  const setOverride = (id: string, value: number) =>
    setOverrides((prev) => ({ ...prev, [id]: value }));

  return (
    <Card className="mb-8 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="h-4 w-4 text-accent" />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            What-if scenarios
          </h2>
          <InfoTip
            align="start"
            label="Drag any course to a hypothetical final grade to preview your semester and cumulative GPA. Your real grades aren't changed."
          />
        </div>
        <button
          onClick={() => setOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-foreground cursor-pointer"
          aria-expanded={open}
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
            <div className="mt-5 border-t border-border pt-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <p className="max-w-md text-xs leading-relaxed text-muted">
                  {`Drag a course to a hypothetical final grade and watch your ${noun}${showCumulative ? " and cumulative" : ""} GPA update — your real grades aren't touched.`}
                </p>
                {hasOverrides && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setOverrides({})}
                    className="shrink-0"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    Reset
                  </Button>
                )}
              </div>

              <motion.div
                className="mt-5 space-y-5"
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
    </Card>
  );
}
