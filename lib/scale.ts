/**
 * Grading scales: an ordered list of tiers (highest min first) mapping a
 * percentage to a letter grade and GPA points. A course may carry its own
 * scale; everything falls back to DEFAULT_SCALE when it doesn't.
 */
export type GradeTier = {
  /** Minimum percent (inclusive) to earn this tier. */
  min: number;
  letter: string;
  /** GPA points (4.0 scale). */
  points: number;
};

export type GradingScale = GradeTier[];

/** Standard US +/- scale — matches the app's original fixed behavior. */
export const DEFAULT_SCALE: GradingScale = [
  { min: 97, letter: "A+", points: 4.0 },
  { min: 93, letter: "A", points: 4.0 },
  { min: 90, letter: "A-", points: 3.7 },
  { min: 87, letter: "B+", points: 3.3 },
  { min: 83, letter: "B", points: 3.0 },
  { min: 80, letter: "B-", points: 2.7 },
  { min: 77, letter: "C+", points: 2.3 },
  { min: 73, letter: "C", points: 2.0 },
  { min: 70, letter: "C-", points: 1.7 },
  { min: 55, letter: "D", points: 1.0 },
  { min: 0, letter: "F", points: 0.0 },
];

/** Letter-only scale (no plus/minus). */
export const SIMPLE_SCALE: GradingScale = [
  { min: 90, letter: "A", points: 4.0 },
  { min: 80, letter: "B", points: 3.0 },
  { min: 70, letter: "C", points: 2.0 },
  { min: 60, letter: "D", points: 1.0 },
  { min: 0, letter: "F", points: 0.0 },
];

export const SCALE_PRESETS: { id: string; name: string; scale: GradingScale }[] =
  [
    { id: "standard", name: "Standard (+/–)", scale: DEFAULT_SCALE },
    { id: "simple", name: "Letter only", scale: SIMPLE_SCALE },
  ];

/** Sort a scale highest-min first (defensively — editors may leave it unsorted). */
function sorted(scale: GradingScale): GradingScale {
  return scale === DEFAULT_SCALE
    ? scale
    : [...scale].sort((a, b) => b.min - a.min);
}

/** Look up the letter grade for a percent under a scale (default if omitted). */
export function letterForScale(
  grade: number,
  scale: GradingScale = DEFAULT_SCALE,
): string {
  const tiers = sorted(scale);
  for (const t of tiers) if (grade >= t.min) return t.letter;
  return tiers[tiers.length - 1]?.letter ?? "F";
}

/** Look up the GPA points for a percent under a scale (default if omitted). */
export function pointsForScale(
  grade: number,
  scale: GradingScale = DEFAULT_SCALE,
): number {
  const tiers = sorted(scale);
  for (const t of tiers) if (grade >= t.min) return t.points;
  return tiers[tiers.length - 1]?.points ?? 0;
}

/** Sort highest-min first and clamp values into sane ranges. */
export function normalizeScale(scale: GradingScale): GradingScale {
  return [...scale]
    .map((t) => ({
      min: Math.max(0, Math.min(100, Number(t.min) || 0)),
      letter: String(t.letter ?? "").slice(0, 4) || "—",
      points: Math.max(0, Math.min(5, Number(t.points) || 0)),
    }))
    .sort((a, b) => b.min - a.min);
}

function sameScale(a: GradingScale, b: GradingScale): boolean {
  if (a.length !== b.length) return false;
  return a.every(
    (t, i) =>
      t.min === b[i].min && t.letter === b[i].letter && t.points === b[i].points,
  );
}

/** Which preset (if any) a scale matches — "custom" when it matches none. */
export function presetIdFor(scale: GradingScale | undefined): string {
  if (!scale) return "standard";
  const norm = normalizeScale(scale);
  for (const p of SCALE_PRESETS) {
    if (sameScale(norm, normalizeScale(p.scale))) return p.id;
  }
  return "custom";
}
