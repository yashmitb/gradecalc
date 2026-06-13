"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "gradehq.geminiKey.v1";

/**
 * Stores the user's own Gemini API key in localStorage (their browser only).
 * It is never persisted on our server — it's sent with a parse request solely
 * so the server can call Google on their behalf, then discarded.
 */
export function useApiKey() {
  const [key, setKeyState] = useState<string>("");
  const [ready, setReady] = useState(false);
  // Whether a shared/free Gemini key is configured on the server. `null`
  // while we haven't checked yet.
  const [hasServerKey, setHasServerKey] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setKeyState(window.localStorage.getItem(KEY) ?? "");
    } catch {
      /* ignore */
    }
    setReady(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/parse")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!cancelled) setHasServerKey(!!data?.hasServerKey);
      })
      .catch(() => {
        if (!cancelled) setHasServerKey(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const setKey = useCallback((value: string) => {
    const v = value.trim();
    setKeyState(v);
    try {
      if (v) window.localStorage.setItem(KEY, v);
      else window.localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }, []);

  const clearKey = useCallback(() => setKey(""), [setKey]);

  return {
    key,
    setKey,
    clearKey,
    ready,
    hasKey: key.length > 0,
    hasServerKey,
  };
}
