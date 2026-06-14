"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, Plus, Trash2, X } from "lucide-react";
import { Button, Input, Label } from "./ui";
import { InfoTip } from "./InfoTip";
import { springs } from "@/lib/springs";
import { useTheme, type ThemePref } from "@/lib/useTheme";
import { semesterGPA, fmtGPA } from "@/lib/gpa";
import {
  currentSeasonYear,
  seasonsFor,
  sortTermsDesc,
  termLabel,
  termNoun,
  type Season,
  type Term,
  type TermSystem,
} from "@/lib/terms";
import type { Course } from "@/lib/types";
import type { Profile } from "@/lib/useProfile";

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="flex gap-1 rounded-xl border border-border bg-surface p-1">
      {options.map((o) => (
        <button
          key={o.value}
          onClick={() => onChange(o.value)}
          className={`flex-1 cursor-pointer rounded-lg px-2 py-1.5 text-xs font-semibold transition-colors ${
            value === o.value
              ? "bg-accent text-[#0a0a0a]"
              : "text-muted hover:bg-surface-2 hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function SettingsDialog({
  open,
  onClose,
  courses,
  system,
  terms,
  activeId,
  setSystem,
  setActive,
  addTerm,
  removeTerm,
  profile,
  updateProfile,
}: {
  open: boolean;
  onClose: () => void;
  courses: Course[];
  system: TermSystem;
  terms: Term[];
  activeId: string;
  setSystem: (s: TermSystem) => void;
  setActive: (id: string) => void;
  addTerm: (season: Season, year: number) => void;
  removeTerm: (id: string) => void;
  profile: Profile;
  updateProfile: (patch: Partial<Profile>) => void;
}) {
  const { theme, setTheme } = useTheme();
  const seasons = seasonsFor(system);
  const [season, setSeason] = React.useState<Season>(seasons[seasons.length - 1]);
  const [year, setYear] = React.useState<number>(currentSeasonYear(system).year);

  // Keep the add-term season valid when the system changes.
  React.useEffect(() => {
    if (!seasons.includes(season)) setSeason(seasons[seasons.length - 1]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [system]);

  React.useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const profileField = (
    key: "priorGPA" | "priorCredits" | "targetCumulativeGPA",
    opts: { min?: number; max?: number } = {},
  ) => ({
    value: profile[key] ?? "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => {
      const v = e.target.value;
      if (v === "") return updateProfile({ [key]: null });
      const n = parseFloat(v) || 0;
      const clamped = Math.max(
        opts.min ?? 0,
        opts.max !== undefined ? Math.min(opts.max, n) : n,
      );
      updateProfile({ [key]: clamped });
    },
  });

  const noun = termNoun(system);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            className="fixed inset-0 z-[55]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            initial={{ opacity: 0, scale: 0.96, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -8 }}
            transition={springs.snappy}
            style={{ transformOrigin: "top right" }}
            className="glass specular fixed right-3 top-20 z-[60] max-h-[78vh] w-[min(360px,calc(100vw-1.5rem))] overflow-y-auto rounded-2xl border border-[color:var(--glass-border)] p-5 shadow-[var(--elev-shadow)] sm:right-5"
          >
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold tracking-tight">Settings</h2>
              <button
                onClick={onClose}
                aria-label="Close settings"
                className="rounded-lg p-1.5 text-muted transition-colors hover:bg-surface-2 hover:text-foreground cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Term system */}
            <section className="mb-5">
              <Label className="flex items-center gap-1.5">
                Term system
                <InfoTip
                  align="start"
                  label="Pick how your school splits the year. This sets the seasons you can add and the wording used for term GPA."
                />
              </Label>
              <Segmented<TermSystem>
                value={system}
                onChange={setSystem}
                options={[
                  { value: "semester", label: "Semester" },
                  { value: "quarter", label: "Quarter" },
                ]}
              />
            </section>

            {/* Terms */}
            <section className="mb-5">
              <Label className="flex items-center gap-1.5">
                Your {noun}s
                <InfoTip
                  align="start"
                  label={`Switch the active ${noun} to view its courses. New courses you add land in the active ${noun}. Cumulative GPA blends them all.`}
                />
              </Label>
              <div className="space-y-1.5">
                {sortTermsDesc(terms).map((t) => {
                  const inTerm = courses.filter((c) => c.termId === t.id);
                  const gpa = semesterGPA(inTerm).gpa;
                  const isActive = t.id === activeId;
                  return (
                    <div
                      key={t.id}
                      className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                        isActive
                          ? "border-accent-soft bg-accent-dim"
                          : "border-border bg-surface"
                      }`}
                    >
                      <button
                        onClick={() => setActive(t.id)}
                        className="flex min-w-0 flex-1 items-center gap-2 text-left cursor-pointer"
                        aria-pressed={isActive}
                      >
                        <span
                          className={`flex h-4 w-4 shrink-0 items-center justify-center rounded-full border ${
                            isActive
                              ? "border-accent bg-accent text-[#0a0a0a]"
                              : "border-border"
                          }`}
                        >
                          {isActive && <Check className="h-3 w-3" />}
                        </span>
                        <span className="min-w-0 flex-1 truncate text-sm font-semibold">
                          {termLabel(t)}
                        </span>
                        <span className="tnum shrink-0 text-xs text-muted">
                          {inTerm.length === 0
                            ? "empty"
                            : `${inTerm.length} · ${fmtGPA(gpa)}`}
                        </span>
                      </button>
                      {terms.length > 1 && inTerm.length === 0 && (
                        <button
                          onClick={() => removeTerm(t.id)}
                          aria-label={`Remove ${termLabel(t)}`}
                          className="shrink-0 rounded-md p-1 text-muted transition-colors hover:bg-surface-2 hover:text-red-400 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Add term */}
              <div className="mt-2.5 flex items-center gap-2">
                <select
                  value={season}
                  onChange={(e) => setSeason(e.target.value as Season)}
                  aria-label="Season"
                  className="h-10 flex-1 cursor-pointer rounded-xl border border-border bg-surface px-2.5 text-sm text-foreground outline-none transition-colors focus:border-accent"
                >
                  {seasons.map((s) => (
                    <option key={s} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  inputMode="numeric"
                  value={Number.isFinite(year) ? year : ""}
                  onChange={(e) =>
                    setYear(parseInt(e.target.value, 10) || new Date().getFullYear())
                  }
                  className="h-10 w-20 text-center"
                  aria-label="Year"
                />
                <Button
                  size="sm"
                  onClick={() => addTerm(season, year)}
                  className="h-10 shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  Add
                </Button>
              </div>
            </section>

            {/* Theme */}
            <section className="mb-5">
              <Label>Theme</Label>
              <Segmented<ThemePref>
                value={theme}
                onChange={setTheme}
                options={[
                  { value: "system", label: "System" },
                  { value: "light", label: "Light" },
                  { value: "dark", label: "Dark" },
                ]}
              />
            </section>

            {/* GPA setup */}
            <section>
              <Label className="flex items-center gap-1.5">
                GPA setup
                <InfoTip
                  align="start"
                  label="Your record before GradeHQ. We blend it with every term's courses for your cumulative GPA, and use the target to tell you what you need."
                />
              </Label>
              <div className="space-y-3">
                <div>
                  <span className="mb-1 block text-xs text-muted">
                    Prior cumulative GPA
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step={0.01}
                    placeholder="e.g. 3.85"
                    {...profileField("priorGPA", { min: 0, max: 4 })}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs text-muted">
                    Completed units (before these terms)
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    placeholder="e.g. 60"
                    {...profileField("priorCredits", { min: 0 })}
                  />
                </div>
                <div>
                  <span className="mb-1 block text-xs text-muted">
                    Target cumulative GPA
                  </span>
                  <Input
                    type="number"
                    inputMode="decimal"
                    step={0.01}
                    placeholder="e.g. 3.80"
                    {...profileField("targetCumulativeGPA", { min: 0, max: 4 })}
                  />
                </div>
              </div>
            </section>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
