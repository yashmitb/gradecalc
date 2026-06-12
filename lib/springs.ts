import type { Transition, Variants } from "framer-motion";

/** Shared spring presets — reuse these everywhere instead of one-off tuning. */
export const springs = {
  /** Nav, toggles — quick settle. */
  snappy: { type: "spring", stiffness: 420, damping: 30 } as Transition,
  /** Cards, panels — calm settle. */
  smooth: { type: "spring", stiffness: 320, damping: 28 } as Transition,
  /** Button press, pops — overshoots a little. */
  bouncy: { type: "spring", stiffness: 460, damping: 20 } as Transition,
  /** The travelling nav highlight. */
  liquid: { type: "spring", stiffness: 280, damping: 22 } as Transition,
} as const;

/** Scroll/stagger reveal: fades up on a spring. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0, transition: springs.smooth },
};

/** Press/release feel for any tappable element. */
export const tapBounce = {
  whileHover: { scale: 1.02, y: -2 },
  whileTap: { scale: 0.97 },
  transition: springs.bouncy,
};
