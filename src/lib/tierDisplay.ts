import type { TierName } from "@/lib/shortlist";

// The `most_trending` enum value is kept as-is (renaming it would be a DB
// migration for a display string); "Most Popular" is what it has always meant.
export const TIER_LABELS: Record<TierName, string> = {
  best_pick: "Best pick overall",
  most_trending: "Most Popular",
  value_for_money: "Value for money",
};

/**
 * Shorter forms for the badge overlaid on a grid card, where the full label
 * would wrap across a card that's a fifth of the row wide. Same meanings —
 * only trimmed of the words the badge's context already implies.
 */
export const TIER_BADGE_LABELS: Record<TierName, string> = {
  best_pick: "Best pick",
  most_trending: "Most popular",
  value_for_money: "Value for money",
};

/**
 * Order the picks take at the head of the grid under "Recommended" — the same
 * order the AI picks panel lists them in, so the two surfaces agree.
 */
export const TIER_ORDER: Record<TierName, number> = {
  best_pick: 0,
  most_trending: 1,
  value_for_money: 2,
};

export type TierDisplay = { tier: TierName; itemId: string; brand: string };
