import { uid } from "./grades";
import type { Course, ParsedCourse } from "./types";

/**
 * One line in a re-sync preview, describing what happens to a single
 * category when a fresh upload is merged into an existing course.
 */
export type MergeRow =
  | { kind: "updated"; name: string; from: number | null; to: number }
  | { kind: "unchanged"; name: string; score: number | null }
  | { kind: "kept"; name: string; score: number | null }
  | { kind: "added"; name: string; weight: number; score: number | null };

export type MergePlan = {
  /** The course as it would look after applying the merge. */
  merged: Course;
  rows: MergeRow[];
  /** Count of existing categories whose score changed. */
  updated: number;
  /** Count of brand-new categories pulled in from the upload. */
  added: number;
};

/** Loose name match so "Homework" and "homework " line up across uploads. */
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

/**
 * Plan a re-sync: fold a freshly-parsed upload into an existing course
 * without creating a duplicate. The rules are deliberately conservative so a
 * re-sync never destroys work:
 *
 *   - Matched category, new score present and different → update the score
 *     (weights are left alone — they're structural and may be hand-corrected).
 *   - Matched category, no new score (or unchanged) → left untouched. A blank
 *     score in the upload never wipes an existing one.
 *   - Existing category absent from the upload → kept as-is (the screenshot
 *     may simply not show every category).
 *   - Parsed category with no existing match → added as a new category.
 *
 * The course's own name is preserved; re-syncing is about scores, not
 * renaming the course the user already set up.
 */
export function planMerge(course: Course, parsed: ParsedCourse): MergePlan {
  const parsedByName = new Map<string, ParsedCourse["categories"][number]>();
  for (const p of parsed.categories) {
    const key = norm(p.name);
    if (key && !parsedByName.has(key)) parsedByName.set(key, p);
  }

  const consumed = new Set<string>();
  const rows: MergeRow[] = [];
  let updated = 0;

  const mergedExisting = course.categories.map((c) => {
    const key = norm(c.name);
    const p = parsedByName.get(key);
    if (!p) {
      rows.push({ kind: "kept", name: c.name, score: c.score });
      return c;
    }
    consumed.add(key);
    if (p.score !== null && p.score !== c.score) {
      updated++;
      rows.push({ kind: "updated", name: c.name, from: c.score, to: p.score });
      return { ...c, score: p.score };
    }
    rows.push({ kind: "unchanged", name: c.name, score: c.score });
    return c;
  });

  const addedCats: Course["categories"] = [];
  for (const [key, p] of parsedByName) {
    if (consumed.has(key)) continue;
    addedCats.push({
      id: uid(),
      name: p.name,
      weight: p.weight,
      score: p.score,
    });
    rows.push({
      kind: "added",
      name: p.name,
      weight: p.weight,
      score: p.score,
    });
  }

  return {
    merged: {
      ...course,
      categories: [...mergedExisting, ...addedCats],
      // A fresh syllabus upload refreshes the notes; a gradebook-only re-sync
      // (no notes) leaves the existing ones untouched.
      ...(parsed.syllabusNotes
        ? { syllabusNotes: parsed.syllabusNotes }
        : {}),
    },
    rows,
    updated,
    added: addedCats.length,
  };
}
