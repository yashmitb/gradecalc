"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Monitor, Moon, Sun } from "lucide-react";
import { Button } from "./ui";
import { springs } from "@/lib/springs";
import { useTheme, type ThemePref } from "@/lib/useTheme";

const ICON: Record<ThemePref, React.ElementType> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
};

// Label describes the *current* mode; cycling order is system → light → dark.
const LABEL: Record<ThemePref, string> = {
  system: "Theme: system (tap for light)",
  light: "Theme: light (tap for dark)",
  dark: "Theme: dark (tap for system)",
};

export function ThemeToggle() {
  const { theme, ready, cycle } = useTheme();

  // Reserve the slot before hydration so the navbar doesn't shift.
  if (!ready) return <div className="h-9 w-9" aria-hidden />;

  const Icon = ICON[theme];
  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={cycle}
      aria-label={LABEL[theme]}
      title={LABEL[theme]}
    >
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={theme}
          initial={{ opacity: 0, rotate: -90, scale: 0.6 }}
          animate={{ opacity: 1, rotate: 0, scale: 1 }}
          exit={{ opacity: 0, rotate: 90, scale: 0.6 }}
          transition={springs.snappy}
          className="flex"
        >
          <Icon className="h-4 w-4" />
        </motion.span>
      </AnimatePresence>
    </Button>
  );
}
