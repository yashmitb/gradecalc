import type { Course } from "./types";
import { currentGrade, letterFor, projectedGrade } from "./grades";
import { DEFAULT_SCALE, type GradingScale } from "./scale";
import { semesterGPA, type GradeOverrides } from "./gpa";

/**
 * The "reality check": the guaranteed worst case (score 0 on everything left)
 * and best case (score 100), what letter each lands on, and whether the letter
 * grade is already decided no matter what happens next.
 */
export type CourseReality = {
  /** Worst-case final %, assuming 0 on every ungraded category. */
  floor: number | null;
  /** Best-case final %, assuming 100 on every ungraded category. */
  ceiling: number | null;
  floorLetter: string | null;
  ceilingLetter: string | null;
  /** The letter grade can no longer change, whatever the remaining scores. */
  decided: boolean;
  /** The locked-in letter when `decided`, else null. */
  lockedLetter: string | null;
  /** Worst case is still a failing grade — i.e. failing is still possible. */
  canStillFail: boolean;
  hasUngraded: boolean;
  graded: boolean;
};

/** Lowest percentage that still earns a passing (points > 0) grade. */
function passingMin(scale: GradingScale): number {
  const passing = scale.filter((t) => t.points > 0);
  return passing.length ? Math.min(...passing.map((t) => t.min)) : 0;
}

export function courseReality(course: Course): CourseReality {
  const scale = course.gradingScale ?? DEFAULT_SCALE;
  const cats = course.categories;
  const floor = projectedGrade(cats, 0);
  const ceiling = projectedGrade(cats, 100);
  const floorLetter = floor !== null ? letterFor(floor, scale) : null;
  const ceilingLetter = ceiling !== null ? letterFor(ceiling, scale) : null;
  const decided =
    floor !== null && ceiling !== null && floorLetter === ceilingLetter;
  return {
    floor,
    ceiling,
    floorLetter,
    ceilingLetter,
    decided,
    lockedLetter: decided ? floorLetter : null,
    canStillFail: floor !== null && floor < passingMin(scale),
    hasUngraded: cats.some((c) => c.score === null || c.score === undefined),
    graded: currentGrade(cats) !== null,
  };
}

export type GpaRange = {
  worst: number | null;
  best: number | null;
  /** Courses whose letter grade is already locked (incl. fully graded). */
  lockedCount: number;
  /** Courses still in play (graded, but letter not yet decided). */
  inPlayCount: number;
};

/**
 * Across a set of courses: the worst-case and best-case semester GPA (every
 * course at its floor vs. its ceiling), and how many are already decided.
 */
export function gpaRange(courses: Course[]): GpaRange {
  const floorO: GradeOverrides = {};
  const ceilO: GradeOverrides = {};
  let lockedCount = 0;
  let inPlayCount = 0;
  for (const c of courses) {
    const r = courseReality(c);
    if (r.floor !== null) floorO[c.id] = r.floor;
    if (r.ceiling !== null) ceilO[c.id] = r.ceiling;
    if (!r.graded) continue;
    if (r.decided) lockedCount++;
    else inPlayCount++;
  }
  return {
    worst: semesterGPA(courses, floorO).gpa,
    best: semesterGPA(courses, ceilO).gpa,
    lockedCount,
    inPlayCount,
  };
}
