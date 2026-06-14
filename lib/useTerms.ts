"use client";

import { useCallback, useEffect, useState } from "react";
import {
  currentSeasonYear,
  findTerm,
  makeTerm,
  sortTermsDesc,
  type Season,
  type Term,
  type TermSystem,
} from "./terms";

const KEY = "gradehq.terms.v1";

type TermState = {
  system: TermSystem;
  terms: Term[];
  activeId: string;
};

function freshState(system: TermSystem = "semester"): TermState {
  const { season, year } = currentSeasonYear(system);
  const term = makeTerm(season, year);
  return { system, terms: [term], activeId: term.id };
}

function load(): TermState {
  if (typeof window === "undefined") return freshState();
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return freshState();
    const parsed = JSON.parse(raw) as Partial<TermState>;
    const system: TermSystem = parsed.system === "quarter" ? "quarter" : "semester";
    let terms = Array.isArray(parsed.terms) ? parsed.terms : [];
    terms = terms.filter(
      (t): t is Term =>
        !!t && typeof t.id === "string" && typeof t.year === "number" && !!t.season,
    );
    if (terms.length === 0) return freshState(system);
    const activeId =
      terms.some((t) => t.id === parsed.activeId) && parsed.activeId
        ? parsed.activeId
        : sortTermsDesc(terms)[0].id;
    return { system, terms, activeId };
  } catch {
    return freshState();
  }
}

export function useTerms() {
  const [state, setState] = useState<TermState>(() => freshState());
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setState(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(state));
    } catch {
      /* ignore */
    }
  }, [state, ready]);

  const setSystem = useCallback((system: TermSystem) => {
    setState((s) => ({ ...s, system }));
  }, []);

  const setActive = useCallback((activeId: string) => {
    setState((s) =>
      s.terms.some((t) => t.id === activeId) ? { ...s, activeId } : s,
    );
  }, []);

  /** Add (or focus, if it already exists) a term and make it active. */
  const addTerm = useCallback((season: Season, year: number) => {
    setState((s) => {
      const existing = findTerm(s.terms, season, year);
      if (existing) return { ...s, activeId: existing.id };
      const term = makeTerm(season, year);
      return { ...s, terms: [...s.terms, term], activeId: term.id };
    });
  }, []);

  /** Remove a term (caller should ensure it has no courses). Keeps ≥1 term. */
  const removeTerm = useCallback((id: string) => {
    setState((s) => {
      const terms = s.terms.filter((t) => t.id !== id);
      if (terms.length === 0) return freshState(s.system);
      const activeId =
        s.activeId === id ? sortTermsDesc(terms)[0].id : s.activeId;
      return { ...s, terms, activeId };
    });
  }, []);

  return {
    ...state,
    ready,
    setSystem,
    setActive,
    addTerm,
    removeTerm,
  };
}
