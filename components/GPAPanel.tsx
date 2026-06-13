"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, GraduationCap } from "lucide-react";
import { Card, Input, Label } from "./ui";
import { springs, fadeUp } from "@/lib/springs";
import {
  cumulativeGPA,
  fmtGPA,
  neededSemesterGPA,
  semesterGPA,
  type NeededGPAResult,
} from "@/lib/gpa";
import { useProfile } from "@/lib/useProfile";
import type { Course } from "@/lib/types";

/**
 * Cross-course GPA calculator: semester GPA rollup from each course's
 * projected grade × credit hours, optional cumulative GPA blending with
 * prior credits/GPA, and a "what GPA do I need this semester" solver.
 */
export function GPAPanel({ courses }: { courses: Course[] }) {
  const { profile, ready, update } = useProfile();
  const [settingsOpen, setSettingsOpen] = React.useState(false);

  if (!ready) return null;

  const sem = semesterGPA(courses);
  const hasPrior =
    profile.priorGPA !== null &&
    profile.priorCredits !== null &&
    profile.priorCredits > 0;
  const cum = hasPrior
    ? cumulativeGPA(profile.priorGPA!, profile.priorCredits!, sem)
    : null;

  const target = profile.targetCumulativeGPA;
  const needed =
    hasPrior && target !== null && sem.credits > 0
      ? neededSemesterGPA(
          profile.priorGPA!,
          profile.priorCredits!,
          sem.credits,
          target,
        )
      : null;

  const numField = (
    key: "priorGPA" | "priorCredits" | "targetCumulativeGPA",
    opts: { min?: number; max?: number } = {},
  ) => ({
    value: profile[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v === "") return update({ [key]: null });
      const n = parseFloat(v) || 0;
      const clamped = Math.max(
        opts.min ?? 0,
        opts.max !== undefined ? Math.min(opts.max, n) : n,
      );
      update({ [key]: clamped });
    },
  });

  return (
    <Card className="mb-8 p-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <GraduationCap className="h-4 w-4 text-accent" />
          <h2 className="text-[11px] font-bold uppercase tracking-[0.12em] text-muted">
            GPA calculator
          </h2>
        </div>
        <button
          onClick={() => setSettingsOpen((v) => !v)}
          className="flex items-center gap-1 text-xs font-semibold text-muted transition-colors hover:text-foreground cursor-pointer"
          aria-expanded={settingsOpen}
        >
          {settingsOpen ? "Hide" : "Cumulative GPA"}
          <motion.span
            animate={{ rotate: settingsOpen ? 180 : 0 }}
            transition={springs.snappy}
            className="flex"
          >
            <ChevronDown className="h-3.5 w-3.5" />
          </motion.span>
        </button>
      </div>

      <motion.div
        className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3"
        initial="hidden"
        animate="show"
        variants={{
          hidden: {},
          show: { transition: { staggerChildren: 0.05 } },
        }}
      >
        <Stat
          label="Semester GPA"
          value={fmtGPA(sem.gpa)}
          sub={sem.credits > 0 ? `${sem.credits} units` : "no graded units yet"}
        />
        {hasPrior && (
          <Stat
            label="Cumulative GPA"
            value={fmtGPA(cum?.gpa ?? null)}
            sub={`${cum?.credits ?? 0} units total`}
          />
        )}
        {needed && <NeededStat needed={needed} target={target!} />}
      </motion.div>

      {sem.excluded > 0 && (
        <p className="mt-3 text-xs leading-relaxed text-muted">
          {`${sem.excluded} course${sem.excluded === 1 ? "" : "s"} not counted — no grade yet, or marked “don't count toward GPA”.`}
        </p>
      )}

      <AnimatePresence initial={false}>
        {settingsOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={springs.smooth}
            className="overflow-hidden"
          >
            <div className="mt-5 grid gap-4 border-t border-border pt-5 sm:grid-cols-3">
              <div>
                <Label>Prior cumulative GPA</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step={0.01}
                  placeholder="e.g. 3.85"
                  {...numField("priorGPA", { min: 0, max: 4 })}
                />
              </div>
              <div>
                <Label>Completed units</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  placeholder="e.g. 60"
                  {...numField("priorCredits", { min: 0 })}
                />
              </div>
              <div>
                <Label>Target cumulative GPA</Label>
                <Input
                  type="number"
                  inputMode="decimal"
                  step={0.01}
                  placeholder="e.g. 3.80"
                  {...numField("targetCumulativeGPA", { min: 0, max: 4 })}
                />
              </div>
            </div>
            <p className="mt-3 text-xs leading-relaxed text-muted">
              Your semester GPA is projected from each course&apos;s current
              grade, assuming remaining work continues at the same average.
              Enter your prior GPA and completed units to see your blended
              cumulative GPA — and add a target to find out what you need
              this semester.
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </Card>
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
    <motion.div
      variants={fadeUp}
      className="rounded-2xl border border-border bg-surface-2 p-4"
    >
      <div className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
        {label}
      </div>
      <div className="tnum mt-2 text-2xl font-extrabold tracking-tight">
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-muted">{sub}</div>}
    </motion.div>
  );
}

function NeededStat({
  needed,
  target,
}: {
  needed: NeededGPAResult;
  target: number;
}) {
  switch (needed.kind) {
    case "already-secured":
      return (
        <Stat
          label="Needed this semester"
          value="Locked in"
          sub={`Already on track for ${fmtGPA(target)}`}
        />
      );
    case "impossible":
      return (
        <Stat
          label="Needed this semester"
          value="4.00 max"
          sub={`${fmtGPA(target)} isn't reachable this term`}
        />
      );
    case "possible":
      return (
        <Stat
          label="Needed this semester"
          value={fmtGPA(needed.needed)}
          sub={`to reach ${fmtGPA(target)} cumulative`}
        />
      );
    default:
      return null;
  }
}
