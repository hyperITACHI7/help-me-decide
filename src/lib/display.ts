// Presentation-only derived values — never persisted, never fed into any
// decision the app makes (sort, triage, AI prompts). Exists purely so the
// homepage's product cards can show a review-count the way Myntra's real
// listing pages do, without inventing a field the AI or the floor-rule logic
// could ever accidentally treat as real signal (unlike seededOpenCount,
// which IS real signal — see catalog.ts).
function hash(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return Math.abs(h);
}

export function reviewCountFor(id: string): number {
  return 40 + (hash(id) % 18000);
}

export function formatReviewCount(n: number): string {
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

export function discountPercent(
  price: number,
  originalPrice: number | null
): number | null {
  if (!originalPrice || originalPrice <= price) return null;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
}
