"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "gradehq.onboarded.v1";

/**
 * Tracks whether the welcome/intro screen has been shown before. Defaults to
 * open on a user's first visit (nothing in localStorage yet), then stays
 * dismissed across visits once they close it.
 */
export function useOnboarding() {
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(KEY)) setOpen(true);
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  const dismiss = useCallback(() => {
    setOpen(false);
    try {
      window.localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
  }, []);

  const reopen = useCallback(() => setOpen(true), []);

  return { open, ready, dismiss, reopen };
}
