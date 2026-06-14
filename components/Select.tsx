"use client";

import * as React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/springs";

export type SelectOption = { value: string; label: string; hint?: string };

/**
 * Styled dropdown that matches the app's popover language instead of the
 * native OS `<select>` menu: input-styled trigger + a frosted option list with
 * the active item accent-highlighted. Closes on select, outside click, Escape.
 */
export function Select({
  value,
  options,
  onChange,
  ariaLabel,
  placeholder = "Select",
  className,
  triggerClassName,
}: {
  value: string;
  options: SelectOption[];
  onChange: (value: string) => void;
  ariaLabel?: string;
  placeholder?: string;
  className?: string;
  triggerClassName?: string;
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.value === value);

  React.useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        className={cn(
          "flex w-full cursor-pointer items-center justify-between gap-2 rounded-xl border border-border bg-surface px-3 text-sm text-foreground outline-none transition-colors hover:border-foreground/20 focus:border-accent focus:ring-2 focus:ring-accent-dim",
          triggerClassName ?? "h-11",
        )}
      >
        <span className="truncate">{active ? active.label : placeholder}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={springs.snappy}
          className="flex shrink-0 text-muted"
        >
          <ChevronDown className="h-4 w-4" />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="listbox"
            initial={{ opacity: 0, scale: 0.97, y: -6 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -6 }}
            transition={springs.snappy}
            style={{ transformOrigin: "top" }}
            className="absolute left-0 right-0 top-full z-50 mt-2 max-h-64 overflow-auto rounded-xl border border-[color:var(--glass-border)] bg-surface-2 p-1 shadow-[var(--elev-shadow)]"
          >
            {options.map((o) => {
              const isActive = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  role="option"
                  aria-selected={isActive}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors",
                    isActive
                      ? "bg-accent-dim font-semibold text-accent"
                      : "text-foreground hover:bg-surface",
                  )}
                >
                  <Check
                    className={cn(
                      "h-3.5 w-3.5 shrink-0",
                      isActive ? "opacity-100" : "opacity-0",
                    )}
                  />
                  <span className="min-w-0 flex-1 truncate">{o.label}</span>
                  {o.hint && (
                    <span className="shrink-0 text-xs text-muted">{o.hint}</span>
                  )}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
