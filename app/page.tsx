"use client";

import * as React from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CircleHelp,
  KeyRound,
  Plus,
  Sparkles,
} from "lucide-react";
import { Button, Card } from "@/components/ui";
import { Autofill } from "@/components/Autofill";
import { ApiKeyDialog } from "@/components/ApiKeyDialog";
import { CourseDetail } from "@/components/CourseDetail";
import { Welcome } from "@/components/Welcome";
import { GitHubBadge } from "@/components/GitHubBadge";
import { useCourses } from "@/lib/useCourses";
import { useApiKey } from "@/lib/useApiKey";
import { useOnboarding } from "@/lib/useOnboarding";
import { springs, fadeUp } from "@/lib/springs";
import {
  currentGrade,
  emptyCourse,
  fmt,
  letterFor,
  totalWeight,
  uid,
} from "@/lib/grades";
import type { Course, ParsedCourse } from "@/lib/types";

export default function Home() {
  const { courses, ready, addCourse, updateCourse, removeCourse } =
    useCourses();
  const { key, setKey, clearKey, hasKey, hasServerKey } = useApiKey();
  const onboarding = useOnboarding();
  const [activeId, setActiveId] = React.useState<string | null>(null);
  const [autofillOpen, setAutofillOpen] = React.useState(false);
  const [keyOpen, setKeyOpen] = React.useState(false);

  const active = courses.find((c) => c.id === activeId) ?? null;

  const handleParsed = (parsed: ParsedCourse) => {
    const course: Course = {
      id: uid(),
      name: parsed.name,
      categories: parsed.categories.map((c) => ({
        id: uid(),
        name: c.name,
        weight: c.weight,
        score: c.score,
      })),
    };
    addCourse(course);
    setActiveId(course.id);
    setAutofillOpen(false);
  };

  const handleAddManual = () => {
    const c = emptyCourse();
    addCourse(c);
    setActiveId(c.id);
  };

  return (
    <div className="pb-24">
      <GitHubBadge />
      <Welcome open={onboarding.open} onClose={onboarding.dismiss} />
      <Autofill
        open={autofillOpen}
        onClose={() => setAutofillOpen(false)}
        onParsed={handleParsed}
        apiKey={key}
        onSaveKey={setKey}
        onNeedKey={() => setKeyOpen(true)}
      />
      <ApiKeyDialog
        open={keyOpen}
        initialKey={key}
        hasServerKey={hasServerKey}
        onClose={() => setKeyOpen(false)}
        onSave={setKey}
        onClear={clearKey}
      />

      <NavBar
        hasKey={hasKey}
        hasServerKey={hasServerKey}
        onHome={() => setActiveId(null)}
        onKey={() => setKeyOpen(true)}
        onHelp={onboarding.reopen}
      />

      <div className="px-5 pt-28 sm:pt-32">
        {active ? (
          <CourseDetail
            course={active}
            onChange={(patch) => updateCourse(active.id, patch)}
            onBack={() => setActiveId(null)}
            onDelete={() => {
              removeCourse(active.id);
              setActiveId(null);
            }}
          />
        ) : (
          <main className="mx-auto max-w-3xl">
            {/* Hero */}
            <motion.div
              className="mb-14 max-w-2xl"
              initial="hidden"
              animate="show"
              variants={{
                hidden: {},
                show: { transition: { staggerChildren: 0.09 } },
              }}
            >
              <motion.h1
                variants={fadeUp}
                className="text-balance text-5xl font-extrabold leading-[0.95] tracking-tighter sm:text-6xl"
              >
                What do you need on the{" "}
                <span className="relative inline-block">
                  final
                  <motion.span
                    className="absolute inset-x-0 -bottom-1 h-[3px] origin-left rounded-full bg-accent"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: 1 }}
                    transition={{ ...springs.smooth, delay: 0.45 }}
                  />
                </span>
                ?
              </motion.h1>
              <motion.p
                variants={fadeUp}
                className="mt-5 max-w-md text-pretty text-base leading-relaxed text-muted"
              >
                Add your courses, enter your grades, and get the exact score
                you need to land the grade you want.
              </motion.p>
              <motion.div
                variants={fadeUp}
                className="mt-7 flex flex-wrap items-center gap-2.5"
              >
                <Button onClick={() => setAutofillOpen(true)}>
                  <Sparkles className="h-4 w-4" />
                  Auto-fill from syllabus
                </Button>
                <Button variant="outline" onClick={handleAddManual}>
                  <Plus className="h-4 w-4" />
                  Add course manually
                </Button>
              </motion.div>
            </motion.div>

            {!ready ? null : courses.length === 0 ? (
              <EmptyState onAdd={handleAddManual} />
            ) : (
              <>
                <div className="mb-3 text-[11px] font-semibold uppercase tracking-[0.12em] text-muted">
                  Your courses
                </div>
                <motion.div
                  className="grid gap-4 sm:grid-cols-2"
                  initial="hidden"
                  animate="show"
                  variants={{
                    hidden: {},
                    show: { transition: { staggerChildren: 0.07 } },
                  }}
                >
                  {courses.map((course) => (
                    <CourseTile
                      key={course.id}
                      course={course}
                      onOpen={() => setActiveId(course.id)}
                    />
                  ))}
                </motion.div>
              </>
            )}
          </main>
        )}

        <footer className="mx-auto mt-20 max-w-3xl border-t border-border pt-6 text-xs leading-relaxed text-muted">
          Free and open. No account, no tracking — your grades never leave
          your browser, except the file you choose to auto-fill.
        </footer>
      </div>
    </div>
  );
}

function NavBar({
  hasKey,
  hasServerKey,
  onHome,
  onKey,
  onHelp,
}: {
  hasKey: boolean;
  hasServerKey: boolean | null;
  onHome: () => void;
  onKey: () => void;
  onHelp: () => void;
}) {
  const [scrolled, setScrolled] = React.useState(false);

  // Three-state key status:
  // - "own": the user supplied their own Gemini key (green)
  // - "free": no personal key, but the shared/free key is available (yellow)
  // - "none": no personal key and no shared key configured (red)
  // - "checking": still waiting on the server-key check
  const keyStatus = hasKey
    ? "own"
    : hasServerKey === null
      ? "checking"
      : hasServerKey
        ? "free"
        : "none";

  const dotClass =
    keyStatus === "own"
      ? "bg-emerald-400"
      : keyStatus === "free"
        ? "bg-yellow-400"
        : keyStatus === "none"
          ? "bg-red-400"
          : "bg-muted";

  const label =
    keyStatus === "own"
      ? "Your key connected"
      : keyStatus === "free"
        ? "Free key available"
        : keyStatus === "none"
          ? "No key available"
          : "Checking key…";

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ opacity: 0, y: -12 }}
      animate={{
        opacity: 1,
        y: 0,
        backgroundColor: scrolled
          ? "rgba(28, 28, 32, 0.72)"
          : "rgba(17, 17, 17, 0)",
        boxShadow: scrolled
          ? "0 8px 30px -6px rgba(0,0,0,0.6)"
          : "0 0 0 0 rgba(0,0,0,0)",
        borderColor: scrolled ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0)",
      }}
      transition={springs.smooth}
      className="specular fixed left-5 right-5 top-4 z-50 mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-full border px-4 py-2.5 sm:px-5"
      style={{
        backdropFilter: scrolled ? "blur(20px) saturate(1.6)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(20px) saturate(1.6)" : "none",
      }}
    >
      <button
        onClick={onHome}
        className="flex items-center gap-2.5 cursor-pointer"
        aria-label="GradeHQ home"
      >
        <img
          src="/logo.svg"
          alt=""
          className="h-7 w-7 rounded-[7px]"
          width={32}
          height={32}
        />
        <span className="text-base font-extrabold tracking-tight">
          GradeHQ
        </span>
      </button>
      <div className="flex items-center gap-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onHelp}
          aria-label="What is GradeHQ?"
          title="What is GradeHQ?"
        >
          <CircleHelp className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onKey}
          className={
            keyStatus === "own"
              ? "border-accent-soft bg-accent-dim text-accent hover:bg-accent-dim hover:border-accent-soft"
              : keyStatus === "none"
                ? "border-red-500/30 bg-red-500/10 text-red-300 hover:border-red-500/30 hover:bg-red-500/10"
                : undefined
          }
        >
          <span className="relative flex h-2 w-2 shrink-0">
            {keyStatus === "none" && (
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-400 opacity-75" />
            )}
            <span
              className={`relative inline-flex h-2 w-2 rounded-full transition-colors ${dotClass}`}
            />
          </span>
          <KeyRound className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">{label}</span>
        </Button>
      </div>
    </motion.header>
  );
}

function CourseTile({
  course,
  onOpen,
}: {
  course: Course;
  onOpen: () => void;
}) {
  const cur = currentGrade(course.categories);
  const remaining = course.categories.filter((c) => c.score === null).length;
  const tw = totalWeight(course.categories);

  return (
    <motion.button
      variants={fadeUp}
      whileHover={{ scale: 1.02, y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={springs.bouncy}
      onClick={onOpen}
      className="group flex flex-col items-start gap-6 rounded-2xl border border-border bg-surface p-5 text-left cursor-pointer transition-colors hover:bg-surface-2 hover:border-white/10"
    >
      <div className="flex w-full items-start justify-between gap-2">
        <h3 className="font-bold tracking-tight">{course.name}</h3>
        <ArrowRight className="h-4 w-4 shrink-0 text-muted transition-transform group-hover:translate-x-1 group-hover:text-accent" />
      </div>
      <div className="flex w-full items-end justify-between">
        <div className="tnum text-4xl font-extrabold leading-none tracking-tighter">
          {fmt(cur)}
          {cur !== null && (
            <span className="text-xl font-bold text-muted">%</span>
          )}
        </div>
        {cur !== null && (
          <span className="rounded-full border border-accent-soft bg-accent-dim px-2.5 py-0.5 text-sm font-bold text-accent">
            {letterFor(cur)}
          </span>
        )}
      </div>
      <div className="flex w-full items-center gap-2 text-xs text-muted">
        <span>{course.categories.length} categories</span>
        <span aria-hidden>·</span>
        <span>
          {remaining > 0 ? `${remaining} left to grade` : "fully graded"}
        </span>
        {Math.abs(tw - 100) >= 0.5 && (
          <>
            <span aria-hidden>·</span>
            <span className="font-semibold text-foreground">
              {fmt(tw, 0)}% weighted
            </span>
          </>
        )}
      </div>
    </motion.button>
  );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <Card className="flex flex-col items-start gap-4 p-8">
      <h2 className="text-xl font-bold tracking-tight">No courses yet</h2>
      <p className="max-w-sm text-sm leading-relaxed text-muted">
        Auto-fill from your syllabus, or add a course by hand. Takes about 30
        seconds.
      </p>
      <Button variant="outline" size="sm" onClick={onAdd}>
        <Plus className="h-4 w-4" />
        Add your first course
      </Button>
    </Card>
  );
}
