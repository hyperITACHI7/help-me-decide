import "server-only";
import { prisma } from "@/lib/prisma";
import { popularityFor } from "@/lib/popularity";
import {
  generateNarrowingQuestions,
  synthesizeCategoryTiers,
  type CategoryCandidate,
  type NarrowingQuestion,
  type TierResult,
} from "@/lib/shortlist";

export type CategoryAnswer = { question: string; answer: string };

export type CategoryPicksView =
  | { status: "ok"; tiers: TierResult[]; questions: NarrowingQuestion[] }
  | { status: "too_few"; count: number; questions: NarrowingQuestion[] }
  | { status: "not_configured" }
  | { status: "error"; message: string };

/** Row shape the wishlist page already loads. */
export type CategoryItem = {
  id: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  tags: string[];
  openCount: number;
};

function hash(input: string): string {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(36);
}

/**
 * Colourway variants of one product ("… — Charcoal Edit") are near-duplicates.
 * Left in, the model will happily return three shades of the same shirt as
 * three different "picks", which is useless as a decision aid. Collapse to one
 * row per base product first, keeping the variant this shopper has actually
 * opened most (their own revealed preference, F2), tie-broken deterministically
 * so the representative never depends on array order.
 */
export function dedupeToBaseProduct(items: CategoryItem[]): CategoryItem[] {
  const groups = new Map<string, CategoryItem[]>();
  for (const item of items) {
    const baseName = item.name.split(" — ")[0]!;
    const group = groups.get(baseName);
    if (group) group.push(item);
    else groups.set(baseName, [item]);
  }

  return [...groups.values()].map(
    (group) =>
      [...group].sort(
        (a, b) =>
          b.openCount - a.openCount || a.price - b.price || a.id.localeCompare(b.id)
      )[0]!
  );
}

/**
 * Bump when the selection logic changes in a way that would make already-cached
 * picks wrong rather than merely old. Folded into itemsHash, so every existing
 * row stops matching and is simply never read again (the model rewrites them on
 * next view) without deleting anything.
 *
 * v2: all three tiers are now drawn from the answer-relevant set. Rows cached
 * under v1 have a "Most Popular" pinned over the whole category before the
 * answers were read, so they cannot respond to the narrowing questions at all.
 */
const PICKS_LOGIC_VERSION = "v2";

/**
 * Identity of a category's contents. Deliberately built from the full item id
 * set (not a count, and not the deduped set) so that adding OR removing any
 * item — including a Clean Wishlist deletion of a current pick — produces a
 * different hash and forces a fresh evaluation.
 */
function itemsHashFor(items: CategoryItem[]): string {
  return hash(
    `${PICKS_LOGIC_VERSION}:${items
      .map((i) => i.id)
      .sort()
      .join(",")}`
  );
}

function answersHashFor(answers: CategoryAnswer[]): string {
  if (answers.length === 0) return "";
  return hash(
    answers
      .map((a) => `${a.question}=${a.answer}`)
      .sort()
      .join("|")
  );
}

function toCandidates(items: CategoryItem[]): CategoryCandidate[] {
  return items.map((item) => ({
    id: item.id,
    name: item.name,
    brand: item.brand,
    category: item.category,
    price: item.price,
    tags: item.tags,
    popularity: popularityFor(item.name.split(" — ")[0]!),
  }));
}

/**
 * The wishlist's per-category picks. Cached on (session, category, contents,
 * answers), so a category costs its AI calls once rather than on every page
 * view — the shopper opening the same category again, or reloading, is free.
 */
export async function getCategoryPicks(
  sessionId: string,
  category: string,
  categoryItems: CategoryItem[],
  answers: CategoryAnswer[] = []
): Promise<CategoryPicksView> {
  const itemsHash = itemsHashFor(categoryItems);
  const answersHash = answersHashFor(answers);

  const cached = await prisma.categoryPicks.findUnique({
    where: {
      sessionId_category_itemsHash_answersHash: {
        sessionId,
        category,
        itemsHash,
        answersHash,
      },
    },
  });

  // Questions depend only on the category's contents, so they live on the
  // base row and are reused by every answer combination.
  const baseRow =
    answersHash === ""
      ? cached
      : await prisma.categoryPicks.findUnique({
          where: {
            sessionId_category_itemsHash_answersHash: {
              sessionId,
              category,
              itemsHash,
              answersHash: "",
            },
          },
        });

  let cachedQuestions = (baseRow?.questions as NarrowingQuestion[] | null) ?? null;

  // A cached row with an empty question set is usually a poisoned result from
  // a transient generation failure the first time this category was ever
  // evaluated (picks synthesis and question generation are two independent
  // calls; one can succeed while the other fails) — not a genuine "nothing to
  // ask". Left alone, that failure caches silently forever: the early return
  // below fires on `picks` alone and never reaches the "regenerate if empty"
  // logic further down, since that only runs on a fresh (uncached) row. Retry
  // once here, and only the questions — the tiers are still good, so this
  // shouldn't cost a re-synthesis.
  if (baseRow && cachedQuestions !== null && cachedQuestions.length === 0) {
    const retryCandidates = toCandidates(dedupeToBaseProduct(categoryItems));
    if (retryCandidates.length >= 3) {
      const retry = await generateNarrowingQuestions(retryCandidates);
      if (retry.status === "ok" && retry.questions.length > 0) {
        cachedQuestions = retry.questions;
        await prisma.categoryPicks.update({
          where: { id: baseRow.id },
          data: { questions: retry.questions },
        });
      }
    }
  }

  if (cached) {
    const picks = cached.picks as TierResult[] | null;
    if (picks && picks.length === 3) {
      return { status: "ok", tiers: picks, questions: cachedQuestions ?? [] };
    }
  }

  const candidates = toCandidates(dedupeToBaseProduct(categoryItems));

  // Only ask for questions once per category-contents, then reuse.
  let questions: NarrowingQuestion[] = cachedQuestions ?? [];
  if (questions.length === 0 && candidates.length >= 3) {
    const q = await generateNarrowingQuestions(candidates);
    if (q.status === "ok") questions = q.questions;
  }

  if (candidates.length < 3) {
    return { status: "too_few", count: candidates.length, questions };
  }

  const result = await synthesizeCategoryTiers(category, candidates, answers);

  if (result.status === "not_configured") return { status: "not_configured" };
  if (result.status === "error") return { status: "error", message: result.message };
  if (result.status === "too_few") {
    return { status: "too_few", count: result.count, questions };
  }

  await prisma.categoryPicks.upsert({
    where: {
      sessionId_category_itemsHash_answersHash: {
        sessionId,
        category,
        itemsHash,
        answersHash,
      },
    },
    create: {
      sessionId,
      category,
      itemsHash,
      answersHash,
      questions,
      picks: result.tiers,
    },
    update: { picks: result.tiers, questions },
  });

  return { status: "ok", tiers: result.tiers, questions };
}
