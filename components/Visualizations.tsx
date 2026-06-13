"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, TriangleAlert, CircleDashed } from "lucide-react";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/springs";
import { colorFor } from "@/lib/palette";
import { fmt, totalWeight, type CourseStatus } from "@/lib/grades";
import type { Category } from "@/lib/types";

/**
 * Horizontal stacked bar showing each category's share of the final grade,
 * plus a legend with weight and current score. Ungraded categories render
 * at reduced opacity with a hatch pattern so "not graded yet" reads at a
 * glance.
 */
export function CategoryBreakdown({ categories }: { categories: Category[] }) {
  const tw = totalWeight(categories);
  if (categories.length === 0 || tw <= 0) return null;

  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-surface-2">
        {categories.map((c, i) => {
          const w = Number(c.weight) || 0;
          if (w <= 0) return null;
          const pct = (w / tw) * 100;
          const graded = c.score !== null && c.score !== undefined;
          return (
            <motion.div
              key={c.id}
              className="h-full first:rounded-l-full last:rounded-r-full"
              style={{
                background: colorFor(i),
                opacity: graded ? 1 : 0.32,
              }}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ ...springs.smooth, delay: i * 0.04 }}
              title={`${c.name} — ${fmt(w, 0)}% of grade${
                graded ? `, scored ${fmt(c.score)}%` : ", not graded yet"
              }`}
            />
          );
        })}
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {categories.map((c, i) => {
          const w = Number(c.weight) || 0;
          const graded = c.score !== null && c.score !== undefined;
          return (
            <div
              key={c.id}
              className="flex items-center gap-2 rounded-lg px-1 py-1 text-sm"
            >
              <span
                className="h-2.5 w-2.5 shrink-0 rounded-full"
                style={{
                  background: colorFor(i),
                  opacity: graded ? 1 : 0.32,
                }}
                aria-hidden
              />
              <span className="min-w-0 flex-1 truncate font-medium text-foreground">
                {c.name}
              </span>
              <span className="tnum shrink-0 text-muted">{fmt(w, 0)}%</span>
              <span
                className={cn(
                  "tnum shrink-0 w-12 text-right font-semibold",
                  graded ? "text-foreground" : "text-muted",
                )}
              >
                {graded ? `${fmt(c.score)}%` : "—"}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Horizontal progress bar showing the current grade vs. a target grade
 * marker. Fill color shifts with status (secured/on-track/at-risk).
 */
export function GradeProgressBar({
  current,
  target,
  status,
}: {
  current: number | null;
  target: number;
  status: CourseStatus;
}) {
  const fillPct = Math.max(0, Math.min(100, current ?? 0));
  const targetPct = Math.max(0, Math.min(100, target));

  const fillColor =
    status === "secured"
      ? "var(--color-accent)"
      : status === "at-risk"
        ? "#e0717a"
        : "var(--color-accent)";

  return (
    <div className="w-full">
      <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-surface-2">
        <motion.div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ background: fillColor }}
          initial={{ width: 0 }}
          animate={{ width: `${fillPct}%` }}
          transition={springs.smooth}
        />
        <motion.div
          className="absolute top-0 h-full w-[2px] bg-white/50"
          initial={{ left: 0, opacity: 0 }}
          animate={{ left: `${targetPct}%`, opacity: 1 }}
          transition={springs.smooth}
        />
      </div>
      <div className="mt-1.5 flex items-center justify-between text-[11px] font-medium text-muted">
        <span className="tnum">{fmt(current)}% now</span>
        <span className="tnum">{fmt(target, 0)}% target</span>
      </div>
    </div>
  );
}

const STATUS_CONFIG: Record<
  CourseStatus,
  { label: string; icon: React.ElementType; className: string }
> = {
  secured: {
    label: "Secured",
    icon: ShieldCheck,
    className: "border-accent-soft bg-accent-dim text-accent",
  },
  "on-track": {
    label: "On track",
    icon: TrendingUp,
    className: "border-sky-400/25 bg-sky-400/10 text-sky-300",
  },
  "at-risk": {
    label: "At risk",
    icon: TriangleAlert,
    className: "border-red-400/25 bg-red-400/10 text-red-300",
  },
  unknown: {
    label: "No data",
    icon: CircleDashed,
    className: "border-border bg-surface-2 text-muted",
  },
};

export function StatusBadge({
  status,
  count,
  className,
}: {
  status: CourseStatus;
  /** When set, shows the number and hides the text label on small screens —
   *  for compact summary chips like "✓ 2 Secured". */
  count?: number;
  className?: string;
}) {
  const { label, icon: Icon, className: tone } = STATUS_CONFIG[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-tight",
        tone,
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {count !== undefined && <span className="tnum">{count}</span>}
      <span className={count !== undefined ? "hidden sm:inline" : undefined}>
        {label}
      </span>
    </span>
  );
}
