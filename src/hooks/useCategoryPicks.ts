"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { fetchCategoryPicks } from "@/app/wishlist/categoryActions";
import type { CategoryPicksView } from "@/lib/categoryPicks";
import type { NarrowingQuestion } from "@/lib/shortlist";

export type CategoryPicksState = {
  view: CategoryPicksView | null;
  answers: Record<string, string>;
  /** True while a re-evaluation is in flight after an answer changed. */
  pending: boolean;
  answer: (question: NarrowingQuestion, option: string) => void;
  clearAnswers: () => void;
};

/**
 * The open category's AI picks, owned by the wishlist rather than by the picks
 * panel.
 *
 * It lives here because two surfaces need the same answer now: the panel that
 * presents the three picks, and the grid below it, which badges those same
 * items and floats them to the top. Fetching in both would mean two model
 * calls for one question — the first of which is a live call, and the Groq key
 * is shared (see the CategoryPicks comment in schema.prisma). One fetch, one
 * source of truth, passed down to both.
 *
 * Pass `null` for "View all": no category is open, so no AI runs at all, which
 * is what keeps a Ready Buyer from ever meeting the feature.
 */
export function useCategoryPicks(category: string | null): CategoryPicksState {
  const [view, setView] = useState<CategoryPicksView | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  // Which category the state above describes. Compared during render, not in
  // an effect: an effect would let one frame paint the previous category's
  // picks against the new category's grid, badging the wrong items.
  const [loadedFor, setLoadedFor] = useState(category);
  // Monotonic, so a reply from a category (or an answer set) the shopper has
  // already moved on from is dropped instead of overwriting the current one.
  const requestId = useRef(0);

  if (category !== loadedFor) {
    setLoadedFor(category);
    setView(null);
    setAnswers({});
  }

  useEffect(() => {
    if (!category) return;
    const id = ++requestId.current;
    void fetchCategoryPicks(category).then((result) => {
      if (requestId.current === id) setView(result);
    });
  }, [category]);

  const questions: NarrowingQuestion[] =
    view && (view.status === "ok" || view.status === "too_few") ? view.questions : [];

  function refetch(next: Record<string, string>) {
    if (!category) return;
    const payload = questions
      .filter((q) => next[q.id])
      .map((q) => ({ question: q.text, answer: next[q.id]! }));

    const id = ++requestId.current;
    startTransition(async () => {
      const result = await fetchCategoryPicks(category, payload);
      if (requestId.current === id) setView(result);
    });
  }

  function answer(question: NarrowingQuestion, option: string) {
    const next = { ...answers };
    // Tapping the chosen option again clears it — answering is optional, so
    // un-answering has to be possible too.
    if (answers[question.id] === option) delete next[question.id];
    else next[question.id] = option;
    setAnswers(next);
    refetch(next);
  }

  function clearAnswers() {
    setAnswers({});
    refetch({});
  }

  return { view, answers, pending, answer, clearAnswers };
}
