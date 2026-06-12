"use client";

import { useCallback, useEffect, useState } from "react";
import type { Course } from "./types";
import { emptyCourse } from "./grades";

const KEY = "gradecalc.courses.v1";

function load(): Course[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Course[]) : [];
  } catch {
    return [];
  }
}

export function useCourses() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setCourses(load());
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(KEY, JSON.stringify(courses));
    } catch {
      /* storage full or blocked — ignore */
    }
  }, [courses, ready]);

  const addCourse = useCallback((course?: Course) => {
    const c = course ?? emptyCourse();
    setCourses((prev) => [...prev, c]);
    return c.id;
  }, []);

  const updateCourse = useCallback((id: string, patch: Partial<Course>) => {
    setCourses((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...patch } : c)),
    );
  }, []);

  const removeCourse = useCallback((id: string) => {
    setCourses((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { courses, ready, addCourse, updateCourse, removeCourse };
}
