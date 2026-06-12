"use client";

import * as React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/cn";
import { springs } from "@/lib/springs";

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "icon";
};

export function Button({
  className,
  variant = "primary",
  size = "md",
  disabled,
  ...props
}: ButtonProps) {
  const variants: Record<string, string> = {
    // accent fill, soft glow on hover — the one warm thing on the page
    primary:
      "bg-accent text-[#0a0a0a] border border-accent hover:shadow-[0_0_24px_-2px_rgba(95,168,138,0.55)]",
    // glass-adjacent: bordered, fills on hover
    outline:
      "border border-border bg-surface text-foreground hover:bg-surface-2 hover:border-white/15",
    ghost: "bg-transparent text-muted hover:text-foreground hover:bg-surface-2",
    danger: "bg-transparent text-muted hover:text-red-400 hover:bg-surface-2",
  };
  const sizes: Record<string, string> = {
    sm: "h-9 px-3.5 text-sm rounded-lg",
    md: "h-11 px-5 text-sm rounded-xl",
    icon: "h-9 w-9 rounded-lg",
  };
  return (
    <motion.button
      whileHover={disabled ? undefined : { scale: 1.02, y: -2 }}
      whileTap={disabled ? undefined : { scale: 0.97 }}
      transition={springs.bouncy}
      disabled={disabled}
      className={cn(
        "inline-flex items-center justify-center gap-2 font-medium tracking-tight cursor-pointer select-none",
        "transition-colors duration-150",
        "outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background",
        "disabled:opacity-40 disabled:pointer-events-none disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className,
      )}
      {...(props as React.ComponentProps<typeof motion.button>)}
    />
  );
}

export function Card({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-border bg-surface",
        className,
      )}
      {...props}
    />
  );
}

/** A `.glass` panel: floating, frosted, with a hairline border + lift shadow. */
export function GlassPanel({
  className,
  specular = true,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { specular?: boolean }) {
  return (
    <div
      className={cn(
        "glass rounded-2xl border border-white/10 shadow-[0_8px_30px_-6px_rgba(0,0,0,0.6)]",
        specular && "specular",
        className,
      )}
      {...props}
    />
  );
}

type InputProps = React.InputHTMLAttributes<HTMLInputElement> & {
  suffix?: string;
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  function Input({ className, suffix, ...props }, ref) {
    return (
      <div className="relative min-w-0">
        <input
          ref={ref}
          className={cn(
            "h-11 w-full min-w-0 rounded-xl border border-border bg-surface px-3 text-sm text-foreground tnum",
            "placeholder:text-muted",
            "outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent-dim",
            suffix && "pr-8",
            className,
          )}
          {...props}
        />
        {suffix && (
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-sm text-muted">
            {suffix}
          </span>
        )}
      </div>
    );
  },
);

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn(
        "mb-2 block text-[11px] font-semibold uppercase tracking-[0.12em] text-muted",
        className,
      )}
      {...props}
    />
  );
}

export function Pill({
  className,
  active = false,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & { active?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-semibold tracking-tight",
        active
          ? "border-accent-soft bg-accent-dim text-accent"
          : "border-border text-muted",
        className,
      )}
      {...props}
    />
  );
}
