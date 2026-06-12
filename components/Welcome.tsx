"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowRight,
  PenLine,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { Button, GlassPanel } from "./ui";
import { springs, fadeUp } from "@/lib/springs";

const FEATURES = [
  {
    icon: Sparkles,
    title: "Auto-fill with AI",
    body: "Drop in your syllabus PDF or a screenshot of your grades — Gemini reads off the categories, weights, and scores for you. Nothing to type.",
  },
  {
    icon: PenLine,
    title: "Or build it by hand",
    body: "Prefer to type it yourself? Add categories, weights, and scores manually in about 30 seconds. Either way lands in the same calculator.",
  },
  {
    icon: ShieldCheck,
    title: "Remembered, right here",
    body: "Everything you add is saved in this browser automatically. No account, no sign-in — come back later and it's exactly as you left it.",
  },
] as const;

const icon: import("framer-motion").Variants = {
  hidden: { opacity: 0, scale: 0.4, rotate: -18 },
  show: { opacity: 1, scale: 1, rotate: 0, transition: springs.bouncy },
};

export function Welcome({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    if (open) document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Welcome to GradeHQ"
          initial="hidden"
          animate="show"
          exit="hidden"
        >
          <motion.div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.94, y: 16 },
              show: { opacity: 1, scale: 1, y: 0 },
            }}
            transition={springs.smooth}
            className="w-full max-w-xl"
          >
            <GlassPanel className="relative max-h-[calc(100dvh-2rem)] w-full overflow-y-auto overflow-x-hidden p-6 sm:p-8">
              {/* ambient glow */}
              <motion.div
                aria-hidden
                className="pointer-events-none absolute -right-24 -top-24 h-64 w-64 rounded-full bg-accent-dim blur-3xl"
                initial={{ opacity: 0, scale: 0.6 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />

              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.09 } },
                }}
                className="relative"
              >
                <motion.div variants={fadeUp} className="mb-2 flex items-center gap-3">
                  <motion.span
                    variants={icon}
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-accent-dim text-accent"
                  >
                    <Sparkles className="h-5 w-5" />
                  </motion.span>
                  <h2 className="text-2xl font-extrabold tracking-tight">
                    Welcome to{" "}
                    <span className="text-accent">GradeHQ</span>
                  </h2>
                </motion.div>
                <motion.p
                  variants={fadeUp}
                  className="mb-7 max-w-md text-[15px] leading-relaxed text-foreground/70"
                >
                  A free grade calculator that tells you exactly what you
                  need to score on what&apos;s left to hit the grade you
                  want.
                </motion.p>

                <div className="flex flex-col gap-3">
                  {FEATURES.map((f, i) => (
                    <motion.div
                      key={f.title}
                      variants={fadeUp}
                      whileHover={{ scale: 1.015, y: -2 }}
                      transition={springs.snappy}
                      className="group flex items-start gap-4 rounded-xl border border-border bg-surface/80 px-4 py-4 transition-colors hover:border-accent-soft hover:bg-surface-2"
                    >
                      <motion.span
                        variants={icon}
                        className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent-dim text-accent transition-transform group-hover:scale-110"
                      >
                        <f.icon className="h-5 w-5" />
                      </motion.span>
                      <div>
                        <div className="flex items-center gap-2 text-[15px] font-bold tracking-tight">
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent-dim text-[11px] font-bold text-accent">
                            {i + 1}
                          </span>
                          {f.title}
                        </div>
                        <p className="mt-1.5 text-sm leading-relaxed text-foreground/70">
                          {f.body}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div
                  variants={fadeUp}
                  className="mt-7 flex flex-col-reverse items-stretch gap-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <p className="text-xs leading-relaxed text-muted">
                    You can revisit this anytime from the{" "}
                    <span className="font-semibold text-foreground/80">
                      ?
                    </span>{" "}
                    button.
                  </p>
                  <Button onClick={onClose} className="group justify-center">
                    Get started
                    <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                  </Button>
                </motion.div>
              </motion.div>
            </GlassPanel>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
