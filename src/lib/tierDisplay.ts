import type { TierName } from "@/lib/shortlist";

// The `most_trending` enum value is kept as-is (renaming it would be a DB
// migration for a display string); "Most Popular" is what it has always meant.
export const TIER_LABELS: Record<TierName, string> = {
  best_pick: "Best pick overall",
  most_trending: "Most Popular",
  value_for_money: "Value for money",
};

export type TierDisplay = { tier: TierName; itemId: string; brand: string };
