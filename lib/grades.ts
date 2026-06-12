import type { Category, Course } from "./types";

export function uid(): string {
  return Math.random().toString(36).slice(2, 10);
}

/** Sum of all category weights (should ideally be 100). */
export function totalWeight(categories: Category[]): number {
  return categories.reduce((sum, c) => sum + (Number(c.weight) || 0), 0);
}

const isGraded = (c: Category) =>
  c.score !== null && c.score !== undefined && !Number.isNaN(c.score);

/**
 * Current grade = weighted average over the GRADED categories only,
 * renormalized by the weight that has actually been graded so far.
 * Returns null if nothing is graded yet.
 */
export function currentGrade(categories: Category[]): number | null {
  const graded = categories.filter(isGraded);
  const gradedWeight = totalWeight(graded);
  if (gradedWeight <= 0) return null;
  const earned = graded.reduce(
    (sum, c) => sum + (Number(c.score) || 0) * (Number(c.weight) || 0),
    0,
  );
  return earned / gradedWeight;
}

/**
 * Projected final grade if every ungraded category scores `assume` percent.
 * Uses the full weight (graded + ungraded). Assumes weights are on a 100 scale.
 */
export function projectedGrade(
  categories: Category[],
  assume: number,
): number | null {
  const total = totalWeight(categories);
  if (total <= 0) return null;
  const earned = categories.reduce((sum, c) => {
    const w = Number(c.weight) || 0;
    const s = isGraded(c) ? (Number(c.score) || 0) : assume;
    return sum + s * w;
  }, 0);
  return earned / total;
}

export type NeededResult =
  | { kind: "no-target-category" }
  | { kind: "already-secured"; have: number }
  | { kind: "impossible"; needed: number; maxPossible: number }
  | { kind: "trivial"; needed: number }
  | { kind: "possible"; needed: number };

/**
 * Solve: what score do I need in `targetCategoryId` to end the course at
 * exactly `targetGrade`, assuming all OTHER ungraded categories score `assume`?
 */
export function neededScore(
  categories: Category[],
  targetCategoryId: string,
  targetGrade: number,
  assume = 0,
): NeededResult {
  const target = categories.find((c) => c.id === targetCategoryId);
  if (!target) return { kind: "no-target-category" };

  const total = totalWeight(categories);
  const targetWeight = Number(target.weight) || 0;
  if (total <= 0 || targetWeight <= 0) return { kind: "no-target-category" };

  // Points locked in from everything except the target category.
  const otherPoints = categories.reduce((sum, c) => {
    if (c.id === targetCategoryId) return sum;
    const w = Number(c.weight) || 0;
    const s = isGraded(c) ? (Number(c.score) || 0) : assume;
    return sum + s * w;
  }, 0);

  // total * targetGrade = otherPoints + needed * targetWeight
  const needed = (targetGrade * total - otherPoints) / targetWeight;

  if (needed <= 0) {
    const have = projectedGrade(categories, assume);
    return { kind: "already-secured", have: have ?? 0 };
  }
  if (needed > 100) {
    const maxPossible = (otherPoints + 100 * targetWeight) / total;
    return { kind: "impossible", needed, maxPossible };
  }
  if (needed < 1) return { kind: "trivial", needed };
  return { kind: "possible", needed };
}

export function letterFor(grade: number): string {
  if (grade >= 93) return "A";
  if (grade >= 90) return "A-";
  if (grade >= 87) return "B+";
  if (grade >= 83) return "B";
  if (grade >= 80) return "B-";
  if (grade >= 77) return "C+";
  if (grade >= 73) return "C";
  if (grade >= 70) return "C-";
  if (grade >= 67) return "D+";
  if (grade >= 60) return "D";
  return "F";
}

export function emptyCourse(name = "New Course"): Course {
  return {
    id: uid(),
    name,
    categories: [
      { id: uid(), name: "Homework", weight: 20, score: null },
      { id: uid(), name: "Midterm", weight: 30, score: null },
      { id: uid(), name: "Final", weight: 50, score: null },
    ],
  };
}

export function fmt(n: number | null, digits = 1): string {
  if (n === null || n === undefined || Number.isNaN(n)) return "—";
  return n.toFixed(digits);
}
