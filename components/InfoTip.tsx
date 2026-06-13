"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Info } from "lucide-react";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/springs";

/**
 * A small "i" affordance that reveals a short instruction. Opens on hover
 * (desktop) and stays pinned on click/tap (mobile + deliberate desktop use);
 * closes on outside click or Escape. Keep `label` to one or two plain
 * sentences — it's a hint, not documentation.
 */
export function InfoTip({
  label,
  align = "center",
  side = "top",
  className,
}: {
  label: string;
  /** Horizontal anchor of the bubble relative to the icon. */
  align?: "start" | "center" | "end";
  /** Which side of the icon the bubble appears on. */
  side?: "top" | "bottom";
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const [shift, setShift] = React.useState(0);
  const pinned = React.useRef(false);
  const ref = React.useRef<HTMLSpanElement>(null);
  const bubbleRef = React.useRef<HTMLSpanElement>(null);

  // Nudge the bubble horizontally if it would spill past the viewport edge,
  // so tips stay fully on-screen no matter where the icon sits in a row.
  React.useLayoutEffect(() => {
    if (!open) {
      setShift(0);
      return;
    }
    const el = bubbleRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const vw = document.documentElement.clientWidth;
    const pad = 12;
    if (r.right > vw - pad) {
      setShift(vw - pad - r.right);
    } else if (r.left < pad) {
      setShift(pad - r.left);
    }
  }, [open]);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        pinned.current = false;
        setOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        pinned.current = false;
        setOpen(false);
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <span ref={ref} className={cn("relative inline-flex align-middle", className)}>
      <button
        type="button"
        aria-label={open ? "Hide explanation" : "More info"}
        aria-expanded={open}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          pinned.current = !pinned.current;
          setOpen(pinned.current);
        }}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => {
          if (!pinned.current) setOpen(false);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          if (!pinned.current) setOpen(false);
        }}
        className="inline-flex h-4 w-4 cursor-pointer items-center justify-center rounded-full text-muted/60 transition-colors hover:text-foreground"
      >
        <Info className="h-3.5 w-3.5" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.span
            ref={bubbleRef}
            role="tooltip"
            style={{ marginLeft: shift }}
            initial={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: side === "top" ? 4 : -4 }}
            transition={springs.snappy}
            className={cn(
              "absolute z-50 w-52 rounded-xl border border-white/10 bg-surface-2 p-3 text-xs font-normal normal-case leading-relaxed tracking-normal text-muted shadow-[0_8px_30px_-6px_rgba(0,0,0,0.65)]",
              side === "top" ? "bottom-full mb-2" : "top-full mt-2",
              align === "center" && "left-1/2 -translate-x-1/2",
              align === "start" && "left-0",
              align === "end" && "right-0",
            )}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
