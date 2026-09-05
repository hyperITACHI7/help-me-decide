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

First work out "fits": the ids of the candidates that genuinely match what the shopper told us, best fit first — at least 3, at most 6. Never include an item that contradicts something they said: if they asked for linen, a flannel shirt does not fit. If they answered nothing, treat every candidate as fitting.

Then, choosing ONLY from "fits":
- "best_pick": the single item that best suits what they said.
- "value_for_money": a DIFFERENT item from "fits" that gives the most for its price. It must still match what they told us — never recommend something they ruled out just because it is cheap. Judge price against attributes and quality only, never any discount, sale, or predicted price change.

Then "fit_reasons": for EVERY id in "fits", one sentence on why that item is worth a look, grounded in that item's own attributes. Do not claim to know sales figures or how many people bought it.

These are different lenses on the same category, not votes for one item. Every reason must be one sentence, grounded in that item's real attributes.

${PRICING_POLICY_LINE}

Return ONLY a JSON object:
{"fits": ["id", ...], "best_pick": {"itemId": "...", "reason": "..."}, "value_for_money": {"itemId": "...", "reason": "..."}, "fit_reasons": {"id": "sentence", ...}}`;

  const result = await callGroqJson<{
    fits: string[];
    best_pick: { itemId: string; reason: string };
    value_for_money: { itemId: string; reason: string };
    fit_reasons: Record<string, string>;
  }>("large", prompt, { temperature: 0.3 });

  if (!result.configured) return { status: "not_configured" };
  if (result.error || !result.parsed) {
    return { status: "error", message: result.error ?? "No response" };
  }

  const { fits, best_pick, value_for_money, fit_reasons } = result.parsed;

  // Hallucinated-id guard (edge_case.md EC13/EC14), applied to the fit set
  // itself so everything downstream is already known-good.
  const fitIds = Array.isArray(fits)
    ? [...new Set(fits.filter((id) => typeof id === "string" && byId.has(id)))]
    : [];
  if (fitIds.length < 3 || !fit_reasons) {
    return { status: "error", message: "Model returned an unusable fit set" };
  }

  // Ours, not the model's — but measured over what the shopper actually
  // asked for rather than the whole category. Tie-broken by name so the pick
  // never depends on array order (which varies with the open-count sort).
  const pinned = fitIds
    .map((id) => byId.get(id)!)
    .sort((a, b) => b.popularity - a.popularity || a.name.localeCompare(b.name))[0]!;

  // The model can't know which item the popularity pin will land on, so a
  // collision with its own two picks is expected rather than a failure —
  // fall through to the next-best fit instead of erroring the whole panel.
  const taken = new Set<string>([pinned.id]);
  const claim = (wanted: string | undefined): string | undefined => {
    const id =
      wanted && fitIds.includes(wanted) && !taken.has(wanted)
        ? wanted
        : fitIds.find((candidate) => !taken.has(candidate));
    if (id) taken.add(id);
    return id;
  };

  const bestId = claim(best_pick?.itemId);
  const valueId = claim(value_for_money?.itemId);
  if (!bestId || !valueId) {
    return { status: "error", message: "Model returned too few distinct fits" };
  }

  // A reassigned tier loses the sentence the model wrote for its own choice,
  // so fall back to that item's own fit_reason.
  const bestReason =
    bestId === best_pick?.itemId ? best_pick.reason : fit_reasons[bestId];
  const valueReason =
    valueId === value_for_money?.itemId ? value_for_money.reason : fit_reasons[valueId];
  const pinnedReason = fit_reasons[pinned.id];

  if (!bestReason || !valueReason || !pinnedReason) {
    return { status: "error", message: "Model returned an incomplete pick set" };
  }

  if (anyViolatesPricingPolicy([bestReason, valueReason, pinnedReason])) {
    return { status: "error", message: "A tier reason violated pricing policy" };
  }

  return {
    status: "ok",
    tiers: [
      { tier: "best_pick", itemId: bestId, reason: bestReason },
      { tier: "most_trending", itemId: pinned.id, reason: pinnedReason },
      { tier: "value_for_money", itemId: valueId, reason: valueReason },
    ],
  };
}
