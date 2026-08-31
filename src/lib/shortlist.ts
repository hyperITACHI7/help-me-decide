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
 *  - "most_trending" (shown as "Most Popular") is NOT an AI judgment. It is
 *    pinned to the highest synthetic popularity score (see lib/popularity.ts)
 *    and excluded from the AI's choices, so the model can neither contradict
 *    the number on screen nor assert popularity it has no data for. It only
 *    writes that tier's sentence.
 *  - Answers are optional and may be partial — the picks render before the
 *    shopper answers anything, and improve if they do.
 *  - Comparisons are within one category, so "value_for_money" finally means
 *    something: across categories it was just comparing a jacket's price to a
 *    t-shirt's, which is a category artifact rather than a value judgment.
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

  // Deterministic, and tie-broken by name so the pick never depends on array
  // order (which varies with the wishlist's open-count sort).
  const mostPopular = [...capped].sort(
    (a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name)
  )[0]!;
  const rest = capped.filter((c) => c.id !== mostPopular.id);

  const qaLines = answers.length
    ? answers
        .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`)
        .join("\n")
    : "(The shopper has not answered any narrowing questions — judge on the items alone.)";

  const prompt = `A shopper is deciding between the ${category} on their wishlist.

What they told us:
${qaLines}

The item already assigned to the "Most Popular" tier (do NOT reuse it):
id="${mostPopular.id}" — ${mostPopular.brand} ${mostPopular.name}

The remaining candidates to choose from:
${candidateLines(rest)}

Choose exactly 2 DIFFERENT items from the remaining candidates:
- "best_pick": the item that best suits this shopper. If they answered questions, weigh those answers heavily; if they answered none, judge on the item's own attributes.
- "value_for_money": a DIFFERENT item that gives the most for its price, judged on price against attributes and quality only — never any discount, sale, or predicted price change.

Also write one sentence explaining why the "Most Popular" item above is worth a look, based on its own attributes. Do not claim to know sales figures or how many people bought it.

These are three different lenses on the same category, not three votes for one item. Every reason must be one sentence, grounded in that item's real attributes.

${PRICING_POLICY_LINE}

Return ONLY a JSON object:
{"best_pick": {"itemId": "...", "reason": "..."}, "value_for_money": {"itemId": "...", "reason": "..."}, "most_popular_reason": "..."}`;

  const result = await callGroqJson<{
    best_pick: { itemId: string; reason: string };
    value_for_money: { itemId: string; reason: string };
    most_popular_reason: string;
  }>("large", prompt, { temperature: 0.3 });

  if (!result.configured) return { status: "not_configured" };
  if (result.error || !result.parsed) {
    return { status: "error", message: result.error ?? "No response" };
  }

  const { best_pick, value_for_money, most_popular_reason } = result.parsed;
  if (!best_pick?.itemId || !value_for_money?.itemId || !most_popular_reason) {
    return { status: "error", message: "Model returned an incomplete pick set" };
  }

  // Same hallucinated-id and duplicate-item guards as the cross-wishlist path
  // (edge_case.md EC13/EC14), plus the pinned item must stay excluded.
  const restIds = new Set(rest.map((c) => c.id));
  if (!restIds.has(best_pick.itemId) || !restIds.has(value_for_money.itemId)) {
    return { status: "error", message: "Model picked an item outside the candidate set" };
  }
  if (best_pick.itemId === value_for_money.itemId) {
    return { status: "error", message: "Model returned the same item for two tiers" };
  }

  const reasons = [best_pick.reason, value_for_money.reason, most_popular_reason];
  if (anyViolatesPricingPolicy(reasons)) {
    return { status: "error", message: "A tier reason violated pricing policy" };
  }

  return {
    status: "ok",
    tiers: [
      { tier: "best_pick", itemId: best_pick.itemId, reason: best_pick.reason },
      { tier: "most_trending", itemId: mostPopular.id, reason: most_popular_reason },
      {
        tier: "value_for_money",
        itemId: value_for_money.itemId,
        reason: value_for_money.reason,
      },
    ],
  };
}
