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
    body: "Drop in your syllabus PDF or a screenshot of your grades. Gemini reads off the categories, weights, and scores for you — nothing to type.",
  },
  {
    icon: PenLine,
    title: "Or build it by hand",
    body: "Prefer to type it yourself? Add categories, weights, and scores manually in about 30 seconds. Either way ends up in the same calculator.",
  },
  {
    icon: ShieldCheck,
    title: "Remembered, right here",
    body: "Everything you add is saved in this browser automatically — no account, no sign-in. Come back later and your courses are exactly as you left them.",
  },
] as const;

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
          aria-label="Welcome to GradeCalc"
          initial="hidden"
          animate="show"
          exit="hidden"
        >
          <motion.div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            variants={{ hidden: { opacity: 0 }, show: { opacity: 1 } }}
            transition={{ duration: 0.2 }}
            onClick={onClose}
          />
          <motion.div
            variants={{
              hidden: { opacity: 0, scale: 0.96, y: 12 },
              show: { opacity: 1, scale: 1, y: 0 },
            }}
            transition={springs.smooth}
            className="w-full max-w-xl"
          >
            <GlassPanel className="relative w-full p-6 sm:p-8">
              <motion.div
                initial="hidden"
                animate="show"
                variants={{
                  hidden: {},
                  show: { transition: { staggerChildren: 0.07 } },
                }}
              >
                <motion.div
                  variants={fadeUp}
                  className="mb-1 flex items-center gap-2"
                >
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-dim text-accent">
                    <Sparkles className="h-4.5 w-4.5" />
                  </span>
                  <h2 className="text-xl font-extrabold tracking-tight">
                    Welcome to GradeCalc
                  </h2>
                </motion.div>
                <motion.p
                  variants={fadeUp}
                  className="mb-6 text-sm leading-relaxed text-muted"
                >
                  A free grade calculator that tells you exactly what you need
                  to score on what&apos;s left to hit the grade you want.
                </motion.p>

                <div className="flex flex-col gap-3">
                  {FEATURES.map((f) => (
                    <motion.div
                      key={f.title}
                      variants={fadeUp}
                      className="flex items-start gap-3 rounded-xl border border-border bg-surface px-4 py-3.5"
                    >
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent-dim text-accent">
                        <f.icon className="h-4 w-4" />
                      </span>
                      <div>
                        <div className="text-sm font-bold tracking-tight">
                          {f.title}
                        </div>
                        <p className="mt-0.5 text-sm leading-relaxed text-muted">
                          {f.body}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.div variants={fadeUp} className="mt-6 flex justify-end">
                  <Button onClick={onClose}>
                    Get started
                    <ArrowRight className="h-4 w-4" />
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
