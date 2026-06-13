import type * as React from "react";

/**
 * A curated set of per-course accent colors. Each entry carries the solid
 * accent plus the soft (border) and dim (fill) translucent variants, so a
 * course can re-theme the whole accent system just by overriding three CSS
 * variables — every `text-accent` / `bg-accent-dim` / `border-accent-soft`
 * utility picks them up automatically. Semantic status colors are untouched.
 *
 * "green" is the app default (matches --color-accent in globals.css), so a
 * course with no color set — or set to green — needs no override at all.
 */
export type CourseColor = {
  key: string;
  label: string;
  base: string;
  soft: string;
  dim: string;
};

export const COURSE_COLORS: CourseColor[] = [
  {
    key: "green",
    label: "Green",
    base: "#5fa88a",
    soft: "rgba(95, 168, 138, 0.24)",
    dim: "rgba(95, 168, 138, 0.12)",
  },
  {
    key: "blue",
    label: "Blue",
    base: "#5b9bd5",
    soft: "rgba(91, 155, 213, 0.26)",
    dim: "rgba(91, 155, 213, 0.13)",
  },
  {
    key: "violet",
    label: "Violet",
    base: "#a78bfa",
    soft: "rgba(167, 139, 250, 0.26)",
    dim: "rgba(167, 139, 250, 0.13)",
  },
  {
    key: "rose",
    label: "Rose",
    base: "#f0789f",
    soft: "rgba(240, 120, 159, 0.26)",
    dim: "rgba(240, 120, 159, 0.13)",
  },
  {
    key: "amber",
    label: "Amber",
    base: "#e0a458",
    soft: "rgba(224, 164, 88, 0.26)",
    dim: "rgba(224, 164, 88, 0.13)",
  },
  {
    key: "teal",
    label: "Teal",
    base: "#4cc4c0",
    soft: "rgba(76, 196, 192, 0.26)",
    dim: "rgba(76, 196, 192, 0.13)",
  },
];

export const DEFAULT_COURSE_COLOR = "green";

/** The solid accent for a course color key (falls back to the default). */
export function courseColorBase(key?: string): string {
  return (
    COURSE_COLORS.find((c) => c.key === key)?.base ??
    COURSE_COLORS[0].base
  );
}

/**
 * Inline style overriding the accent CSS variables for a course's subtree.
 * Returns undefined for the default color so we never emit a no-op override.
 */
export function accentStyle(key?: string): React.CSSProperties | undefined {
  if (!key || key === DEFAULT_COURSE_COLOR) return undefined;
  const c = COURSE_COLORS.find((x) => x.key === key);
  if (!c) return undefined;
  return {
    "--color-accent": c.base,
    "--color-accent-soft": c.soft,
    "--color-accent-dim": c.dim,
  } as React.CSSProperties;
}
