"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { GraduationCap } from "lucide-react";
import { Card } from "./ui";
import { InfoTip } from "./InfoTip";
import { fadeUp } from "@/lib/springs";
import {
  cumulativeGPA,
  fmtGPA,
  neededSemesterGPA,
  semesterGPA,
  type NeededGPAResult,
} from "@/lib/gpa";
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
