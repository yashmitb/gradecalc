"use client";

import { useCallback, useEffect, useState } from "react";

export type ThemePref = "system" | "light" | "dark";

export const THEME_KEY = "gradehq.theme.v1";

const META_COLOR: Record<"light" | "dark", string> = {
  dark: "#0a0a0a",
  light: "#f3f4f3",
};

function systemDark(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  );
}

function resolve(pref: ThemePref): "light" | "dark" {
  return pref === "system" ? (systemDark() ? "dark" : "light") : pref;
}

function apply(resolved: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", resolved);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", META_COLOR[resolved]);
}

/**
 * Theme preference (system / light / dark) persisted to localStorage and
 * applied via `data-theme` on <html>. The initial value is set by the inline
 * script in the root layout (no flash); this hook keeps it in sync afterward
 * and follows the OS when the preference is "system".
 */
export function useTheme() {
  const [theme, setThemeState] = useState<ThemePref>("system");
  const [resolved, setResolved] = useState<"light" | "dark">("dark");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let pref: ThemePref = "system";
    try {
      const raw = window.localStorage.getItem(THEME_KEY);
      if (raw === "light" || raw === "dark" || raw === "system") pref = raw;
    } catch {
      /* ignore */
    }
    setThemeState(pref);
    setResolved(resolve(pref));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const r = resolve(theme);
    setResolved(r);
    apply(r);
    if (theme !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => {
      const nr: "light" | "dark" = systemDark() ? "dark" : "light";
      setResolved(nr);
      apply(nr);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [theme, ready]);

  const setTheme = useCallback((pref: ThemePref) => {
    setThemeState(pref);
    try {
      window.localStorage.setItem(THEME_KEY, pref);
    } catch {
      /* ignore */
    }
  }, []);

  /** Cycle system → light → dark → system, for a single toggle button. */
  const cycle = useCallback(() => {
    setThemeState((prev) => {
      const next: ThemePref =
        prev === "system" ? "light" : prev === "light" ? "dark" : "system";
      try {
        window.localStorage.setItem(THEME_KEY, next);
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  return { theme, resolved, ready, setTheme, cycle };
}
