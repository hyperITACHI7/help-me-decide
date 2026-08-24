import "server-only";
import { callGroqJson } from "@/lib/groq";
import { anyViolatesPricingPolicy, violatesPricingPolicy } from "@/lib/pricingGuard";

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

/** Internal to synthesizeTiers — no shortlistId, since nothing is persisted yet. */
export type TierSynthesisResult =
  | { status: "not_configured" }
  | { status: "error"; message: string }
  | { status: "not_separable"; reason: string }
  | { status: "ok"; tiers: TierResult[] };

/** What the client actually receives, once actions.ts has persisted the row. */
export type ShortlistOutcome =
  | { status: "not_configured" }
  | { status: "error"; message: string }
  | { status: "not_separable"; reason: string }
  | { status: "ok"; shortlistId: string; tiers: TierResult[] };

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

export async function synthesizeTiers(
  candidates: CandidateItem[],
  answers: { question: string; answer: string }[]
): Promise<TierSynthesisResult> {
  const qaLines = answers
    .map((a, i) => `Q${i + 1}: ${a.question}\nA${i + 1}: ${a.answer}`)
    .join("\n");

  const prompt = `A shopper answered these narrowing questions about items on their wishlist:
${qaLines}

Their candidate items:
${candidateLines(candidates)}

Assign exactly 3 of these items to three DIFFERENT tiers — one item per tier, ideally covering all 3 candidates if there are exactly 3:
- "best_pick": the item that best matches what they said they want
- "most_trending": whichever OTHER item carries the strongest current style/trend signal — this is deliberately a different lens than "best_pick", not a second vote for the same item, so pick the next-most-interesting candidate even if it doesn't match their stated answers as closely
- "value_for_money": whichever OTHER remaining item offers the strongest value for its price — again a different lens on a different item, based on price and attributes only, NOT any discount, sale, or predicted future price change

The whole point of 3 tiers instead of 1 ranked pick is to show the shopper different angles on their candidates, not to re-confirm the same top item three times. Only report "too similar to separate" for a much narrower case: when 2+ candidates are near-duplicates of each other (same product, trivial variant) with nothing else in the set to fill the other tiers — NOT simply because most candidates don't match the shopper's stated answer. Not matching the stated preference is exactly what "most_trending" and "value_for_money" are for.

Each tier must reference a different item by its exact id from the list above. Give a one-sentence reason for each, grounded in that item's actual attributes (and the shopper's answers, where relevant).

${PRICING_POLICY_LINE}

Return ONLY a JSON object, either:
{"separable": true, "tiers": [{"tier": "best_pick", "itemId": "...", "reason": "..."}, {"tier": "most_trending", "itemId": "...", "reason": "..."}, {"tier": "value_for_money", "itemId": "...", "reason": "..."}]}
or
{"separable": false, "reason": "one-sentence honest explanation"}`;

  const result = await callGroqJson<
    | { separable: true; tiers: { tier: TierName; itemId: string; reason: string }[] }
    | { separable: false; reason: string }
  >("large", prompt, { temperature: 0.3 });

  if (!result.configured) return { status: "not_configured" };
  if (result.error || !result.parsed) {
    return { status: "error", message: result.error ?? "No response" };
  }

  const parsed = result.parsed;

  if (parsed.separable === false) {
    if (violatesPricingPolicy(parsed.reason ?? "")) {
      return { status: "error", message: "Honest-empty-state reason violated pricing policy" };
    }
    return { status: "not_separable", reason: parsed.reason ?? "These are too similar to separate." };
  }

  const tiers = parsed.tiers;
  if (!Array.isArray(tiers) || tiers.length !== 3) {
    return { status: "error", message: "Model did not return exactly 3 tiers" };
  }

  // edge_case.md EC13: reject any tier pointing at an item outside the real
  // candidate set (a hallucinated id).
  const candidateIds = new Set(candidates.map((c) => c.id));
  const tierNames = new Set(tiers.map((t) => t.tier));
  const itemIds = tiers.map((t) => t.itemId);
  const distinctItemIds = new Set(itemIds);

  const allIdsValid = itemIds.every((id) => candidateIds.has(id));
  const tiersDistinct = tierNames.size === 3;
  // edge_case.md EC14: reject a repeated item across two tiers.
  const itemsDistinct = distinctItemIds.size === 3;
  const expectedTiers: TierName[] = ["best_pick", "most_trending", "value_for_money"];
  const namesValid = expectedTiers.every((t) => tierNames.has(t));

  if (!allIdsValid || !tiersDistinct || !itemsDistinct || !namesValid) {
    return { status: "error", message: "Model output failed tier/id validation" };
  }

  if (anyViolatesPricingPolicy(tiers.map((t) => t.reason))) {
    return { status: "error", message: "A tier reason violated pricing policy" };
  }

  return { status: "ok", tiers };
}
