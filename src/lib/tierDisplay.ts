import type { TierName } from "@/lib/shortlist";

export const TIER_LABELS: Record<TierName, string> = {
  best_pick: "Best pick",
  most_trending: "Most trending",
  value_for_money: "Value for money",
};

export type TierDisplay = { tier: TierName; itemId: string; brand: string };
