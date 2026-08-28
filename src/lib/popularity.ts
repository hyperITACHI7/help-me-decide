/**
 * "Most Popular" — how popular an item is across the whole user base.
 *
 * This is a REAL Myntra metric that we have no access to, so it is stood up
 * here as synthetic demo data. Two things follow from that, both deliberate:
 *
 *  1. It is seeded, not random. `Math.random()` would re-roll on every render:
 *     the "Most Popular" pick would change on every reload, server and client
 *     renders would disagree (hydration mismatch), and it would defeat the
 *     per-category caching this feature depends on. Same FNV-1a hash the
 *     catalog already uses for seededOpenCount, so a product's popularity is
 *     stable forever.
 *
 *  2. It is keyed on the product NAME, not the row id. WishlistItem ids are
 *     cuids minted per session, so an id-keyed score would give the same
 *     product a different popularity in every demo session.
 *
 * Distinct from seededOpenCount (F2), which is how often THIS shopper opened
 * the item — a personal signal. This is a crowd signal. They answer different
 * questions and must not be conflated.
 *
 * Swap this one function for the real field if the metric ever becomes
 * available; nothing else needs to change.
 */

function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

/** Synthetic popularity, 0–100. Higher is more popular across the user base. */
export function popularityFor(productName: string): number {
  return hash(`popularity:${productName}`) % 101;
}

/** Human-facing label, kept vague on purpose — it is not a real measurement. */
export function popularityBand(score: number): string {
  if (score >= 80) return "Very popular";
  if (score >= 55) return "Popular";
  return "Steady seller";
}
