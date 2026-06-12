export type Category = {
  id: string;
  /** Category name, e.g. "Homework", "Midterm", "Final" */
  name: string;
  /** Weight as a percent of the final grade, e.g. 20 means 20% */
  weight: number;
  /** Current score in this category as a percent (0-100+), or null if not graded yet */
  score: number | null;
};

export type Course = {
  id: string;
  name: string;
  categories: Category[];
};

/** Something the AI couldn't resolve confidently and needs the user to confirm. */
export type ParsedFlag = {
  /** Category name this relates to (or "General"). */
  category: string;
  /** Human-readable explanation of what was found and what to check. */
  reason: string;
};

/** Parsed payload returned by the AI autofill route. */
export type ParsedCourse = {
  name: string;
  categories: { name: string; weight: number; score: number | null }[];
  /** Items the AI left blank / ambiguous on purpose — review before trusting. */
  flags?: ParsedFlag[];
};

export const LETTER_TARGETS: { label: string; min: number }[] = [
  { label: "A+", min: 97 },
  { label: "A", min: 93 },
  { label: "A-", min: 90 },
  { label: "B+", min: 87 },
  { label: "B", min: 83 },
  { label: "B-", min: 80 },
  { label: "C+", min: 77 },
  { label: "C", min: 73 },
  { label: "Pass", min: 70 },
];
