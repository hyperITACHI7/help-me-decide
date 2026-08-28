/**
 * Myntra leans on a small set of hot accents — red, pink, orange, yellow, a
 * neon green and cyan — and spends them sparingly: never on surfaces, only on
 * the thing the cursor is touching. That restraint is the whole effect, so
 * these are wash-strength tints (the 50/100 steps) rather than the saturated
 * source colours, and they only ever appear on hover or on the one selected
 * item.
 *
 * Written as complete class strings because Tailwind scans source text — a
 * built-up `bg-${colour}-100` would never be generated.
 */
export type Accent = {
  name: string;
  /**
   * Wash behind a nav label while it is hovered. Background only, kept off the
   * link itself: a single pill slides between items on a shared layoutId, and
   * giving each link its own background would hide that travel behind a
   * cross-fade.
   */
  pill: string;
  /** Label colour while hovered — this one does go on the link. */
  text: string;
  /** Circle tint while hovered, applied through the wrapper's `group`. */
  circleHover: string;
  /** Circle tint while it is the selected category. */
  circleSelected: string;
};

export const ACCENTS: Accent[] = [
  {
    name: "pink",
    pill: "bg-pink-100",
    text: "text-pink-700",
    circleHover: "group-hover:border-pink-300 group-hover:bg-pink-50 group-hover:text-pink-600",
    circleSelected: "border-pink-400 bg-pink-50 text-pink-700",
  },
  {
    name: "orange",
    pill: "bg-orange-100",
    text: "text-orange-700",
    circleHover: "group-hover:border-orange-300 group-hover:bg-orange-50 group-hover:text-orange-600",
    circleSelected: "border-orange-400 bg-orange-50 text-orange-700",
  },
  {
    name: "cyan",
    pill: "bg-cyan-100",
    text: "text-cyan-700",
    circleHover: "group-hover:border-cyan-300 group-hover:bg-cyan-50 group-hover:text-cyan-600",
    circleSelected: "border-cyan-400 bg-cyan-50 text-cyan-700",
  },
  {
    name: "yellow",
    pill: "bg-yellow-100",
    // 800 rather than 700: yellow-700 on a yellow wash fails contrast.
    text: "text-yellow-800",
    circleHover: "group-hover:border-yellow-400 group-hover:bg-yellow-50 group-hover:text-yellow-700",
    circleSelected: "border-yellow-500 bg-yellow-50 text-yellow-800",
  },
  {
    name: "neon",
    pill: "bg-lime-100",
    text: "text-lime-700",
    circleHover: "group-hover:border-lime-400 group-hover:bg-lime-50 group-hover:text-lime-600",
    circleSelected: "border-lime-500 bg-lime-50 text-lime-700",
  },
  {
    name: "red",
    pill: "bg-red-100",
    text: "text-red-700",
    circleHover: "group-hover:border-red-300 group-hover:bg-red-50 group-hover:text-red-600",
    circleSelected: "border-red-400 bg-red-50 text-red-700",
  },
];

/** Cycles, so the palette never runs out however many categories exist. */
export function accentAt(index: number): Accent {
  return ACCENTS[index % ACCENTS.length]!;
}
