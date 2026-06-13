import type { Course } from "./types";
import { currentGrade, projectedGrade } from "./grades";

/**
 * Standard unweighted 4.0 GPA scale, aligned with letterFor()'s percent
 * boundaries in lib/grades.ts. (A+ doesn't earn extra points — matches
 * most US university scales, including UCSD's.)
 */
export const GPA_SCALE: { min: number; points: number; letter: string }[] = [
  { min: 97, points: 4.0, letter: "A+" },
  { min: 93, points: 4.0, letter: "A" },
  { min: 90, points: 3.7, letter: "A-" },
  { min: 87, points: 3.3, letter: "B+" },
  { min: 83, points: 3.0, letter: "B" },
  { min: 80, points: 2.7, letter: "B-" },
  { min: 77, points: 2.3, letter: "C+" },
  { min: 73, points: 2.0, letter: "C" },
  { min: 70, points: 1.7, letter: "C-" },
  { min: 55, points: 1.0, letter: "D" },
  { min: 0, points: 0.0, letter: "F" },
];

/** Default credit hours for a course when none is set. */
export const DEFAULT_CREDITS = 4;

export function gpaPointsFor(grade: number): number {
  for (const tier of GPA_SCALE) {
    if (grade >= tier.min) return tier.points;
  }
  return 0;
}

/**
 * The grade used for GPA purposes: the current grade so far, projected to
 * the end of the course assuming remaining (ungraded) categories continue
 * at the same average. Returns null if nothing is graded yet.
 */
export function effectiveGrade(course: Course): number | null {
  const cur = currentGrade(course.categories);
  if (cur === null) return null;
  const hasUngraded = course.categories.some(
    (c) => c.score === null || c.score === undefined,
  );
  if (!hasUngraded) return cur;
  return projectedGrade(course.categories, cur);
}

export type CourseGPA = {
  course: Course;
  credits: number;
  /** Effective (projected) grade, or null if nothing is graded yet. */
  grade: number | null;
  /** GPA points for `grade`, or null if `grade` is null. */
  points: number | null;
  /** Whether this course is counted in semester/cumulative GPA totals. */
  counted: boolean;
};

/**
 * Map of course id -> a hypothetical "what-if" final grade (0-100) that
 * overrides `effectiveGrade()` for that course. Used by the what-if slider
 * scenario tool to preview semester/cumulative GPA impact without touching
 * real category scores.
 */
export type GradeOverrides = Record<string, number>;

export function courseGPAs(
  courses: Course[],
  overrides?: GradeOverrides,
): CourseGPA[] {
  return courses.map((course) => {
    const credits = course.credits ?? DEFAULT_CREDITS;
    const override = overrides?.[course.id];
    const grade = override !== undefined ? override : effectiveGrade(course);
    const points = grade !== null ? gpaPointsFor(grade) : null;
    const counted = (course.includeInGPA ?? true) && points !== null && credits > 0;
    return { course, credits, grade, points, counted };
  });
}

export type SemesterGPA = {
  gpa: number | null;
  credits: number;
  /** Number of courses NOT counted (pass/fail, audit, or no grade yet). */
  excluded: number;
};

export function semesterGPA(
  courses: Course[],
  overrides?: GradeOverrides,
): SemesterGPA {
  const all = courseGPAs(courses, overrides);
  const included = all.filter((c) => c.counted);
  const credits = included.reduce((sum, c) => sum + c.credits, 0);
  const excluded = all.length - included.length;
  if (credits <= 0) return { gpa: null, credits: 0, excluded };
  const points = included.reduce((sum, c) => sum + c.points! * c.credits, 0);
  return { gpa: points / credits, credits, excluded };
}

export type CumulativeGPA = {
  gpa: number | null;
  credits: number;
};

/** Blend a prior (already-completed) GPA with this semester's projected GPA. */
export function cumulativeGPA(
  priorGPA: number,
  priorCredits: number,
  sem: SemesterGPA,
): CumulativeGPA {
  const totalCredits = priorCredits + sem.credits;
  if (totalCredits <= 0) return { gpa: null, credits: 0 };
  const priorPoints = priorGPA * priorCredits;
  const semPoints = (sem.gpa ?? 0) * sem.credits;
  return { gpa: (priorPoints + semPoints) / totalCredits, credits: totalCredits };
}

export type NeededGPAResult =
  | { kind: "no-data" }
  | { kind: "already-secured" }
  | { kind: "impossible"; needed: number }
  | { kind: "possible"; needed: number };

/**
 * Solve: what semester GPA is needed (across `semCredits` units) to bring
 * the cumulative GPA — blended with `priorGPA` over `priorCredits` — up to
 * `targetCumGPA`?
 */
export function neededSemesterGPA(
  priorGPA: number,
  priorCredits: number,
  semCredits: number,
  targetCumGPA: number,
): NeededGPAResult {
  if (semCredits <= 0) return { kind: "no-data" };
  const totalCredits = priorCredits + semCredits;
  const needed = (targetCumGPA * totalCredits - priorGPA * priorCredits) / semCredits;
  if (needed <= 0) return { kind: "already-secured" };
  if (needed > 4.0) return { kind: "impossible", needed };
  return { kind: "possible", needed };
}

export function fmtGPA(n: number | null, digits = 2): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}
