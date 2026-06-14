import { uid } from "./grades";

/**
 * Academic term model. Courses belong to a term; the dashboard, term GPA, and
 * what-if sliders all operate on the active term, while cumulative GPA blends
 * every term together.
 */
export type TermSystem = "semester" | "quarter";
export type Season = "Winter" | "Spring" | "Summer" | "Fall";

export type Term = {
  id: string;
  season: Season;
  year: number;
};

/** Month anchor per season — drives chronological sort + "current" detection. */
const SEASON_MONTH: Record<Season, number> = {
  Winter: 1,
  Spring: 4,
  Summer: 7,
  Fall: 10,
};

/** Seasons offered when creating a term, per system. */
export const SEASONS_BY_SYSTEM: Record<TermSystem, Season[]> = {
  semester: ["Spring", "Summer", "Fall"],
  quarter: ["Winter", "Spring", "Summer", "Fall"],
};

export function seasonsFor(system: TermSystem): Season[] {
  return SEASONS_BY_SYSTEM[system];
}

/** The noun for a term in this system ("semester" / "quarter"). */
export function termNoun(system: TermSystem): string {
  return system === "quarter" ? "quarter" : "semester";
}

/** Sortable chronological key (ascending = oldest first). */
export function termSortKey(t: Term): number {
  return t.year * 12 + SEASON_MONTH[t.season];
}

export function termLabel(t: Term): string {
  return `${t.season} ${t.year}`;
}

/** Most-recent-first sort. */
export function sortTermsDesc(terms: Term[]): Term[] {
  return [...terms].sort((a, b) => termSortKey(b) - termSortKey(a));
}

/** Smart guess at the current term from today's date + system. */
export function currentSeasonYear(
  system: TermSystem,
  date = new Date(),
): { season: Season; year: number } {
  const m = date.getMonth() + 1;
  const year = date.getFullYear();
  if (system === "quarter") {
    if (m <= 3) return { season: "Winter", year };
    if (m <= 6) return { season: "Spring", year };
    if (m <= 8) return { season: "Summer", year };
    return { season: "Fall", year };
  }
  // semester
  if (m <= 5) return { season: "Spring", year };
  if (m <= 7) return { season: "Summer", year };
  return { season: "Fall", year };
}

export function makeTerm(season: Season, year: number): Term {
  return { id: uid(), season, year };
}

/** Find an existing term matching season+year, if any. */
export function findTerm(
  terms: Term[],
  season: Season,
  year: number,
): Term | undefined {
  return terms.find((t) => t.season === season && t.year === year);
}
