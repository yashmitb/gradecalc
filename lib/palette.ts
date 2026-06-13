/**
 * Categorical color palette for category breakdown charts.
 * Picked to read clearly on the dark surface background and to harmonize
 * with the green accent (first slot reuses it).
 */
export const CHART_COLORS = [
  "#5fa88a", // accent green
  "#7c9cf0", // periwinkle
  "#f0b65f", // amber
  "#e07a8f", // rose
  "#9d7cf0", // violet
  "#5fc4d6", // cyan
  "#c4d65f", // lime
  "#f0875f", // orange
] as const;

export function colorFor(index: number): string {
  return CHART_COLORS[index % CHART_COLORS.length];
}
