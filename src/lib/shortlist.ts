import "server-only";
import { callGroqJson } from "@/lib/groq";
import { anyViolatesPricingPolicy } from "@/lib/pricingGuard";

// edge_case.md §2.4: swipe triage has no forced minimum discard rate, so a
// 60-item wishlist with nothing discarded could otherwise hand all 60 to the
// AI call, blowing both the latency NFR (problem_statement.md §3.3) and the
// Groq per-minute token ceiling (phased_architecture.md §6.2). Cap here,
// unconditionally, regardless of how many candidates triage produced.
export const MAX_CANDIDATES_FOR_AI = 12;

export type CandidateItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  tags: string[];
};

export type NarrowingQuestion = {
  id: string;
  text: string;
  options: string[];
};

export type TierName = "best_pick" | "most_trending" | "value_for_money";

export type TierResult = { tier: TierName; itemId: string; reason: string };

function candidateLines(items: CandidateItem[]): string {
  return items
    .map(
      (c, i) =>
        `${i + 1}. id="${c.id}" — ${c.brand} ${c.name} | category: ${c.category} | price: ₹${c.price} | tags: ${c.tags.join(", ")}`
    )
    .join("\n");
}

const PRICING_POLICY_LINE =
  "Hard rule: never mention discounts, sales, coupons, cashback, price drops, budget, affordability, or willingness to pay. This is a strict product policy, not a style suggestion.";

export async function generateNarrowingQuestions(
  candidates: CandidateItem[]
): Promise<
  | { status: "ok"; questions: NarrowingQuestion[] }
  | { status: "not_configured" }
  | { status: "error"; message: string }
> {
  const prompt = `You are helping a shopper decide between a few items already shortlisted from their wishlist. Ask 2 or 3 short multiple-choice questions that would help tell which of THESE SPECIFIC items suits them best — base every question on real differences between these items, not generic shopping questions.

Candidate items:
${candidateLines(candidates)}

${PRICING_POLICY_LINE}

Return ONLY a JSON object: {"questions": [{"id": "q1", "text": "...", "options": ["...", "...", "..."]}, ...]} — 2 or 3 questions, each with exactly 3 short options (a few words each).`;

  const result = await callGroqJson<{ questions: NarrowingQuestion[] }>(
    "fast",
    prompt
  );

  if (!result.configured) return { status: "not_configured" };
  if (result.error || !result.parsed) {
    return { status: "error", message: result.error ?? "No response" };
  }

  const questions = result.parsed.questions;
  if (!Array.isArray(questions) || questions.length < 2 || questions.length > 3) {
    return { status: "error", message: "Model returned an unusable question set" };
  }

  const allText = questions.flatMap((q) => [q.text, ...(q.options ?? [])]);
  if (anyViolatesPricingPolicy(allText)) {
    return { status: "error", message: "Generated questions violated pricing policy" };
  }

  return { status: "ok", questions };
}

export type CategoryCandidate = CandidateItem & { popularity: number };

export type CategoryPicksResult =
  | { status: "not_configured" }
  | { status: "error"; message: string }
  | { status: "too_few"; count: number }
  | { status: "ok"; tiers: TierResult[] };

/**
 * Category-scoped version of synthesizeTiers, for the wishlist's per-category
 * picks. Three differences from the cross-wishlist flow, all deliberate:
 *
 *  - "most_trending" (shown as "Most Popular") is NOT an AI judgment. The
 *    crowd number stays ours (see lib/popularity.ts), so the model can neither
 *    contradict the score on screen nor assert popularity it has no data for.
 *  - Answers are optional and may be partial — the picks render before the
 *    shopper answers anything, and improve if they do.
 *  - Comparisons are within one category, so "value_for_money" finally means
 *    something: across categories it was just comparing a jacket's price to a
 *    t-shirt's, which is a category artifact rather than a value judgment.
 *
 * All three tiers are drawn from `fits` — the candidates the model judges to
 * actually match what the shopper said. That ordering matters, and getting it
 * backwards was a real bug: popularity used to be pinned over the WHOLE
 * category before the answers were looked at, which made that tier a pure hash
 * of the product name and therefore frozen — it could not change no matter
 * what the shopper answered, and it was excluded from the model's pool even
 * when it was the best match for them. Value-for-money had the same problem
 * from the other side: its instruction never mentioned the answers at all, so
 * it happily recommended something the shopper had just ruled out as long as
 * it was cheap.
 *
 * Filter first, then rank — the same order a real storefront applies a facet
 * and then sorts by popularity. The model judges fit (a language task); we
 * pick the most popular of those (a number task), so neither does the other's
 * job.
 */
export async function synthesizeCategoryTiers(
  category: string,
  candidates: CategoryCandidate[],
  answers: { question: string; answer: string }[]
): Promise<CategoryPicksResult> {
  if (candidates.length < 3) {
    return { status: "too_few", count: candidates.length };
  }

  const capped = candidates.slice(0, MAX_CANDIDATES_FOR_AI);
  const byId = new Map(capped.map((c) => [c.id, c]));

  const qaLines = answers.length
    ? answers
        .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`)
        .join("\n")
    : "(The shopper has not answered any narrowing questions — treat every candidate as fitting.)";

  const prompt = `A shopper is deciding between the ${category} on their wishlist.

What they told us:
${qaLines}

The candidates:
${candidateLines(capped)}

First work out "fits": the ids of the candidates that genuinely match what the shopper told us, best fit first. Never include an item that contradicts something they said: if they asked for linen, a flannel shirt does not fit. Be honest about how many really match — if only one does, return only that one; if they answered nothing, treat every candidate as fitting.

Then:
- "best_pick": the single item that best suits what they said — from "fits" whenever "fits" is not empty.
- "value_for_money": a DIFFERENT item that gives the most for its price. Prefer one from "fits"; never recommend something they ruled out just because it is cheap. Judge price against attributes and quality only, never any discount, sale, or predicted price change.

Then "reasons": for EVERY candidate id above, one sentence on why that item is worth a look, grounded in that item's own attributes. Do not claim to know sales figures or how many people bought it.

These are different lenses on the same category, not votes for one item. Every reason must be one sentence, grounded in that item's real attributes.

${PRICING_POLICY_LINE}

Return ONLY a JSON object:
{"fits": ["id", ...], "best_pick": {"itemId": "...", "reason": "..."}, "value_for_money": {"itemId": "...", "reason": "..."}, "reasons": {"id": "sentence", ...}}`;

  const result = await callGroqJson<{
    fits: string[];
    best_pick: { itemId: string; reason: string };
    value_for_money: { itemId: string; reason: string };
    reasons: Record<string, string>;
  }>("large", prompt, { temperature: 0.3 });

  if (!result.configured) return { status: "not_configured" };
  if (result.error || !result.parsed) {
    return { status: "error", message: result.error ?? "No response" };
  }

  const { fits, best_pick, value_for_money, reasons } = result.parsed;
  if (!reasons) {
    return { status: "error", message: "Model returned no reasons" };
  }

  // Hallucinated-id guard (edge_case.md EC13/EC14), applied to the fit set
  // itself so everything downstream is already known-good.
  const fitIds = Array.isArray(fits)
    ? [...new Set(fits.filter((id) => typeof id === "string" && byId.has(id)))]
    : [];

  // Fits are a priority order, NOT a filter: candidates are deduped to one
  // row per base product (see dedupeToBaseProduct), so a category can be as
  // small as four, and a specific answer — "linen" against four shirts —
  // can honestly match exactly one. Three tiers still need three items, so
  // anything unfitting stays available to fill the remainder rather than
  // turning a correct, narrow answer into a failed panel.
  const filler = capped
    .filter((c) => !fitIds.includes(c.id))
    .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name))
    .map((c) => c.id);
  const pool = [...fitIds, ...filler];
  if (pool.length < 3) {
    return { status: "too_few", count: pool.length };
  }

  const taken = new Set<string>();
  const claim = (...preferences: (string | undefined)[]): string => {
    for (const wanted of preferences) {
      if (wanted && byId.has(wanted) && !taken.has(wanted)) {
        taken.add(wanted);
        return wanted;
      }
    }
    const next = pool.find((id) => !taken.has(id))!;
    taken.add(next);
    return next;
  };

  // Best pick is claimed first, so the one item that actually matches a very
  // narrow answer goes to the tier that is about matching them.
  const bestId = claim(best_pick?.itemId, fitIds[0]);

  // Ours, not the model's — but measured over what the shopper asked for
  // rather than the whole category, which is what used to freeze this tier.
  // Tie-broken by name so it never depends on array order (which varies with
  // the wishlist's open-count sort).
  const popularFirst = (ids: string[]) =>
    ids
      .filter((id) => !taken.has(id))
      .map((id) => byId.get(id)!)
      .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name))[0]?.id;
  const pinnedId = claim(popularFirst(fitIds), popularFirst(pool));

  // Claiming third, this tier is the one most often left with whatever the
  // other two didn't want — and `claim`'s last resort walks `pool`, which is
  // ordered by fit then popularity and never looks at price. So when the
  // model's own value pick was already taken, prefer the cheapest thing still
  // going before falling back to pool order.
  const cheapestFirst = (ids: string[]) =>
    ids
      .filter((id) => !taken.has(id))
      .map((id) => byId.get(id)!)
      .sort((a, b) => a.price - b.price || a.name.localeCompare(b.name))[0]?.id;
  const claimedValueId = claim(
    value_for_money?.itemId,
    cheapestFirst(fitIds),
    cheapestFirst(pool)
  );

  // Even so, after dedupeToBaseProduct thins a category to ~4 candidates the
  // two cheapest are often already spoken for, and the price tier ends up
  // dearer than both cards beside it. On Jackets that produced a "Value for
  // money" card at ₹2499 next to ₹1599 and ₹1999, over a sentence that just
  // described the product ("a lightweight sleeveless puffer vest…") because a
  // displaced tier falls back to `reasons`. Nothing there argues value; the
  // label was doing all the work, and a shopper can falsify it by looking one
  // card left.
  //
  // Where the model actually chose this item as its value pick, that judgement
  // stands — price against quality is its call, and its own sentence makes the
  // case. It's only when the tier was reassigned that there is no judgement
  // left to respect, and then price is the one value signal we have, so the
  // label goes to the cheapest of the three actually on screen.
  const modelChoseValue = claimedValueId === value_for_money?.itemId;
  const chosen = [bestId, pinnedId, claimedValueId].map((id) => byId.get(id)!);
  const valueItem = modelChoseValue
    ? byId.get(claimedValueId)!
    : [...chosen].sort((a, b) => a.price - b.price || a.name.localeCompare(b.name))[0]!;
  const others = chosen.filter((item) => item.id !== valueItem.id);
  // Keeps the model's best pick on the best-pick card whenever the relabel
  // above didn't take that very item for value.
  const bestItem = others.find((item) => item.id === best_pick?.itemId) ?? others[0]!;
  const pinnedItem = others.find((item) => item.id !== bestItem.id)!;

  const valueId = valueItem.id;

  // A reassigned tier loses the sentence the model wrote for its own choice,
  // so fall back to that item's own entry in `reasons`.
  const bestReason =
    bestItem.id === best_pick?.itemId ? best_pick.reason : reasons[bestItem.id];
  const valueReason = modelChoseValue
    ? value_for_money!.reason
    : reasons[valueId];
  const pinnedReason = reasons[pinnedItem.id];

  if (!bestReason || !valueReason || !pinnedReason) {
    return { status: "error", message: "Model returned an incomplete pick set" };
  }

  if (anyViolatesPricingPolicy([bestReason, valueReason, pinnedReason])) {
    return { status: "error", message: "A tier reason violated pricing policy" };
  }

  return {
    status: "ok",
    tiers: [
      { tier: "best_pick", itemId: bestItem.id, reason: bestReason },
      { tier: "most_trending", itemId: pinnedItem.id, reason: pinnedReason },
      { tier: "value_for_money", itemId: valueId, reason: valueReason },
    ],
  };
}
