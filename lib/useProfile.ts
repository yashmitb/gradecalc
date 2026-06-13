"use client";

import { useCallback, useEffect, useState } from "react";

export type Profile = {
  /** Cumulative GPA before this semester, or null if not set. */
  priorGPA: number | null;
  /** Completed credit hours before this semester, or null if not set. */
  priorCredits: number | null;
  /** Target cumulative GPA for the "what do I need" solver, or null if not set. */
  targetCumulativeGPA: number | null;
};

const KEY = "gradehq.profile.v1";

const DEFAULT_PROFILE: Profile = {
  priorGPA: null,
  priorCredits: null,
  targetCumulativeGPA: null,
};

function load(): Profile {
  if (typeof window === "undefined") return DEFAULT_PROFILE;
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return DEFAULT_PROFILE;
    const parsed = JSON.parse(raw);
    return { ...DEFAULT_PROFILE, ...parsed };
  } catch {
    return DEFAULT_PROFILE;
  }
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile>(DEFAULT_PROFILE);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setProfile(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(profile));
    } catch {
      /* storage full or blocked — ignore */
    }
  }, [profile, ready]);

  const update = useCallback((patch: Partial<Profile>) => {
    setProfile((prev) => ({ ...prev, ...patch }));
  }, []);

  return { profile, ready, update };
}
