/**
 * Everything the item page shows that isn't a column on WishlistItem.
 *
 * Same discipline as lib/popularity.ts and lib/display.ts, for the same
 * reason: this is a seeded simulation with no Myntra integration, so a real
 * PDP's merchandising data has to be stood up locally. All of it is derived
 * by hash from a stable key, never `Math.random()` — a re-roll on every render
 * would desync server and client (hydration mismatch) and make the badges
 * shuffle on reload.
 *
 * Presentation only. Nothing here is persisted, sorted on, or fed to the AI
 * prompts — the same wall lib/display.ts already draws around review counts.
 */

import { popularityFor } from "@/lib/popularity";
import { discountPercent } from "@/lib/display";

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Colourway variants share one base product, so they share crowd signals. */
function baseName(name: string): string {
  return name.split(" — ")[0]!;
}

// ── Badges ──────────────────────────────────────────────────────────────────

export type BadgeKind =
  | "best_seller"
  | "top_rated"
  | "new_arrival"
  | "most_popular"
  | "value_for_money";

export const BADGE_LABELS: Record<BadgeKind, string> = {
  best_seller: "Best Seller",
  top_rated: "Top Rated",
  new_arrival: "New Arrival",
  most_popular: "Most Popular",
  value_for_money: "Value for Money",
};

/**
 * Awarded in this order, and an item can only hold one. Each badge goes to the
 * best *unbadged* item for its measure, so a category yields up to five
 * distinct badged items rather than one item sweeping every award — which is
 * what makes a badge mean something when you see it.
 */
const BADGE_ORDER: BadgeKind[] = [
  "best_seller",
  "top_rated",
  "new_arrival",
  "most_popular",
  "value_for_money",
];

export type BadgeCandidate = {
  id: string;
  name: string;
  category: string;
  rating: number;
  price: number;
  originalPrice: number | null;
  createdAt: Date;
};

/** Higher wins. Each badge reads a different signal, so no two can tie by construction. */
function scoreFor(kind: BadgeKind, item: BadgeCandidate): number {
  switch (kind) {
    // Crowd signal — how much the whole user base buys it (lib/popularity.ts).
    case "best_seller":
      return popularityFor(baseName(item.name));
    case "top_rated":
      return item.rating;
    case "new_arrival":
      return item.createdAt.getTime();
    // Talked-about rather than bought-most: keyed on the synthetic review
    // count, so it can't just restate best_seller.
    case "most_popular":
      return hash(`reviews:${baseName(item.name)}`) % 100000;
    // Rating earned per rupee, nudged by the discount — a cheap bad item and
    // an excellent expensive one should both lose to a good cheap one.
    case "value_for_money":
      return (item.rating / item.price) * 10000 +
        (discountPercent(item.price, item.originalPrice) ?? 0) / 10;
  }
}

/**
 * One badge per item, at most one item per badge per category.
 *
 * Categories are scored independently on purpose: "Best Seller" across a mixed
 * wishlist would just mean "the category with the most popular thing in it",
 * which tells a shopper comparing two shirts nothing.
 */
export function assignBadges(
  items: BadgeCandidate[]
): Map<string, BadgeKind> {
  const badges = new Map<string, BadgeKind>();
  const byCategory = new Map<string, BadgeCandidate[]>();

  for (const item of items) {
    const group = byCategory.get(item.category);
    if (group) group.push(item);
    else byCategory.set(item.category, [item]);
  }

  for (const group of byCategory.values()) {
    const taken = new Set<string>();
    for (const kind of BADGE_ORDER) {
      let winner: BadgeCandidate | null = null;
      let best = -Infinity;
      for (const item of group) {
        if (taken.has(item.id)) continue;
        const score = scoreFor(kind, item);
        // Tie-break on id so the winner never depends on array order.
        if (score > best || (score === best && winner && item.id < winner.id)) {
          best = score;
          winner = item;
        }
      }
      if (!winner) break; // every item in this category already has one
      taken.add(winner.id);
      badges.set(winner.id, kind);
    }
  }

  return badges;
}

// ── Sizes ───────────────────────────────────────────────────────────────────

export type SizeOption = {
  label: string;
  /** Shown on hover, focus AND selection — see SizePicker for why all three. */
  fit: string;
};

const APPAREL_SIZES: SizeOption[] = [
  { label: "S", fit: "Chest 36–38\" · true to size" },
  { label: "M", fit: "Chest 38–40\" · our most-bought size" },
  { label: "L", fit: "Chest 40–42\" · roomy through the shoulder" },
  { label: "XL", fit: "Chest 42–44\" · relaxed all over" },
  { label: "XXL", fit: "Chest 44–46\" · generous, size down if between" },
];

const TROUSER_SIZES: SizeOption[] = [
  { label: "28", fit: "Waist 28\" · slim through the hip" },
  { label: "30", fit: "Waist 30\" · true to size" },
  { label: "32", fit: "Waist 32\" · our most-bought size" },
  { label: "34", fit: "Waist 34\" · comfortable mid-rise" },
  { label: "36", fit: "Waist 36\" · relaxed through the thigh" },
];

const SHOE_SIZES: SizeOption[] = [
  { label: "UK 6", fit: "EU 40 · runs true to size" },
  { label: "UK 7", fit: "EU 41 · true to size" },
  { label: "UK 8", fit: "EU 42 · our most-bought size" },
  { label: "UK 9", fit: "EU 43 · roomy toe box" },
  { label: "UK 10", fit: "EU 44 · size down if between" },
  { label: "UK 11", fit: "EU 45 · widest fit" },
];

export function sizesFor(category: string): SizeOption[] {
  if (category === "Sports Shoes") return SHOE_SIZES;
  if (category === "Trousers") return TROUSER_SIZES;
  return APPAREL_SIZES;
}

// ── Merchandising numbers ───────────────────────────────────────────────────

/**
 * Derived from the same popularity score the Best Seller badge reads, so the
 * two never contradict each other — the badged item is always the one with the
 * highest count on screen.
 */
export function soldThisWeek(name: string): number {
  const popularity = popularityFor(baseName(name));
  return Math.round((150 + popularity * 58) / 50) * 50;
}

/** 2–6 days, stable per item. */
export function deliveryDays(id: string): number {
  return 2 + (hash(`delivery:${id}`) % 5);
}

// ── Perks ───────────────────────────────────────────────────────────────────

/**
 * `icon` is a key, not a component, so this stays a plain data module — the
 * key is resolved to an actual glyph in ProductPerks. Every perk gets its own:
 * three identical checkmarks say only "three good things" and leave the reader
 * to parse the text to find out what kind, which is what an icon is for.
 */
export type PerkIconKey =
  | "feather"
  | "leaf"
  | "wind"
  | "snowflake"
  | "flame"
  | "sun"
  | "run"
  | "mountain"
  | "tent"
  | "barbell"
  | "briefcase"
  | "hanger"
  | "shirt"
  | "award"
  | "trending"
  | "ruler"
  | "minimize"
  | "maximize"
  | "building"
  | "umbrella"
  | "luggage"
  | "grid"
  | "shoe"
  | "shield"
  | "return";

export type Perk = { title: string; detail: string; icon: PerkIconKey };

/**
 * Read off the item's own `tags`, so the perks describe the actual product
 * rather than being three interchangeable sentences bolted onto every page.
 */
const TAG_PERKS: Record<string, Perk> = {
  cotton: { title: "Pure cotton", detail: "Breathable enough for all-day wear", icon: "feather" },
  linen: { title: "Linen blend", detail: "Stays cool through the afternoon", icon: "leaf" },
  fleece: { title: "Fleece lined", detail: "Traps warmth without the bulk", icon: "flame" },
  // Not another snowflake: this co-occurs with the `winter` tag on every
  // quilted product, and two identical glyphs side by side is the problem
  // these icons exist to solve. A quilt is a grid.
  quilted: { title: "Quilted shell", detail: "Insulated for a real winter", icon: "grid" },
  mesh: { title: "Breathable mesh", detail: "Vents heat while you move", icon: "wind" },
  canvas: { title: "Canvas upper", detail: "Softens as you break it in", icon: "shoe" },
  denim: { title: "Rigid denim", detail: "Holds its shape wash after wash", icon: "hanger" },
  winter: { title: "Built for winter", detail: "Rated for cold mornings", icon: "snowflake" },
  summer: { title: "Summer weight", detail: "Light enough for humid days", icon: "sun" },
  running: { title: "Running-ready", detail: "Cushioned for daily distance", icon: "run" },
  trail: { title: "Trail grip", detail: "Lugged sole for loose ground", icon: "mountain" },
  sports: { title: "Made to move", detail: "Holds up to real training", icon: "barbell" },
  formal: { title: "Office-ready", detail: "Structured enough to dress up", icon: "briefcase" },
  // Distinct from `denim`'s hanger: the two share a product (the denim
  // trucker is tagged both).
  casual: { title: "Everyday cut", detail: "Works with what you already own", icon: "shirt" },
  premium: { title: "Premium build", detail: "Finished to last past a season", icon: "award" },
  trending: { title: "Trending now", detail: "Moving fast in this category", icon: "trending" },
  // Paired opposites, and neither reuses the fallback's ruler.
  "slim-fit": { title: "Slim fit", detail: "Tapered without being tight", icon: "minimize" },
  oversized: { title: "Oversized cut", detail: "Deliberately roomy — size as-is", icon: "maximize" },
  streetwear: { title: "Street-ready", detail: "Made to be seen out", icon: "building" },
  // Not `cotton`'s feather — the windbreaker carries both.
  lightweight: { title: "Packs light", detail: "Folds down into a bag", icon: "luggage" },
  "rain-resistant": { title: "Rain-resistant", detail: "Shrugs off a light shower", icon: "umbrella" },
  // Not `trail`'s mountain — the trail shoe is tagged both.
  outdoor: { title: "Outdoor-rated", detail: "Built for weather and distance", icon: "tent" },
};

/** Used when an item's tags don't yield three — never leaves the page short. */
const FALLBACK_PERKS: Perk[] = [
  { title: "Quality checked", detail: "Inspected before it ships", icon: "shield" },
  { title: "True to size", detail: "Fits as the size chart says", icon: "ruler" },
  { title: "Easy returns", detail: "14 days, no questions asked", icon: "return" },
];

export function perksFor(tags: string[]): Perk[] {
  const picked: Perk[] = [];
  for (const tag of tags) {
    const perk = TAG_PERKS[tag];
    if (perk && !picked.some((p) => p.title === perk.title)) picked.push(perk);
    if (picked.length === 3) return picked;
  }
  for (const perk of FALLBACK_PERKS) {
    if (picked.length === 3) break;
    if (!picked.some((p) => p.title === perk.title)) picked.push(perk);
  }
  return picked;
}
