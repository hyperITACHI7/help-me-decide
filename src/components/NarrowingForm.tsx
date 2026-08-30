"use client";

import { useEffect, useState } from "react";
import { IconChevronLeft, IconChevronRight } from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { submitAnswers } from "@/app/wishlist/decide/shortlist/actions";
import type { NarrowingQuestion, ShortlistOutcome } from "@/lib/shortlist";
import { TIER_LABELS } from "@/lib/tierDisplay";
import { ShareControls } from "@/components/ShareControls";
import { Card, Carousel, type CardData } from "@/components/ui/apple-cards-carousel";
import { LoaderOne } from "@/components/ui/loader";
import { CircleIconButton, PillButton } from "@/components/ui/pill-button";

type CandidateDisplay = {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
};

/**
 * Same one-question-at-a-time pipeline as the per-category "Narrow it down"
 * panel (CategoryPicksPanel), reusing its PillButton/CircleIconButton — but
 * two things are genuinely different here, not just re-skinned:
 *
 *  - These questions are generated fresh per submission by
 *    generateNarrowingQuestions() against whichever items the shopper kept
 *    (lib/shortlist.ts), never a fixed set — "base every question on real
 *    differences between these items" is the literal instruction in that
 *    prompt, so a jackets-and-shoes selection gets different questions than
 *    a jackets-only one already, with no UI change needed to make that true.
 *  - Answering is mandatory here (all 3 tiers need every question weighed),
 *    where the category panel's questions are optional. Forward is disabled
 *    until the current question has a pick, so you can't page past a gap —
 *    back is unrestricted, for revisiting and changing an earlier answer.
 */
export function NarrowingForm({
  questions,
  candidateItems,
  friendVoteEnabled,
}: {
  questions: NarrowingQuestion[];
  candidateItems: CandidateDisplay[];
  friendVoteEnabled: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [activeIndex, setActiveIndex] = useState(0);
  const [editingFromSummary, setEditingFromSummary] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<ShortlistOutcome | null>(null);
  // edge_case.md EC18: distinguish "still thinking" from "taking too long" —
  // a silent multi-second spinner reads as broken on first contact.
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!submitting) return;
    const timer = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(timer);
  }, [submitting]);

  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  const showSummary = allAnswered && !editingFromSummary;
  const safeIndex = Math.min(activeIndex, Math.max(questions.length - 1, 0));
  const activeQuestion = questions[safeIndex] ?? null;

  function goBack() {
    setActiveIndex((i) => Math.max(0, i - 1));
  }

  function goForward() {
    if (!activeQuestion || !answers[activeQuestion.id]) return;
    setActiveIndex((i) => Math.min(questions.length - 1, i + 1));
  }

  /** Re-opens one answered question from the summary so its pick can change. */
  function editAnswer(index: number) {
    setActiveIndex(index);
    setEditingFromSummary(true);
  }

  function answer(question: NarrowingQuestion, option: string) {
    const isUnanswering = answers[question.id] === option;
    setAnswers((prev) => {
      const next = { ...prev };
      if (isUnanswering) delete next[question.id];
      else next[question.id] = option;
      return next;
    });
    if (isUnanswering) return;
    setEditingFromSummary(false);
    setActiveIndex((i) => Math.min(questions.length - 1, i + 1));
  }

  async function handleSubmit() {
    if (!allAnswered || submitting) return;
    setSlow(false);
    setSubmitting(true);
    const started = performance.now();
    try {
      const payload = questions.map((q) => ({
        question: q.text,
        answer: answers[q.id]!,
      }));
      const result = await submitAnswers(payload);
      // §3.3 NFR check — logged for verification, not shown to the shopper.
      console.log(`[shortlist] resolved in ${Math.round(performance.now() - started)}ms`);
      setOutcome(result);
    } finally {
      setSubmitting(false);
    }
  }

  if (outcome) {
    return (
      <ShortlistResult
        outcome={outcome}
        candidateItems={candidateItems}
        friendVoteEnabled={friendVoteEnabled}
      />
    );
  }

  if (submitting) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
        <LoaderOne />
        <p className="text-sm font-medium text-muted">
          {slow ? "Still working on it — a little longer than usual…" : "Finding your 3 picks…"}
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col px-4 py-6">
      <h1 className="text-lg font-bold text-ink">A couple of quick questions</h1>
      <p className="mt-1 text-sm text-muted">
        {showSummary
          ? "Tap any answer to change it."
          : `This narrows your ${candidateItems.length} kept items to 3 picks.`}
      </p>

      <div className="mt-8 flex flex-1 flex-col items-center justify-center">
        {/* mode="wait": the outgoing question (or the summary) finishes its
            fade before the next thing starts fading in, rather than the two
            cross-dissolving. */}
        <AnimatePresence mode="wait">
          {showSummary ? (
            <motion.div
              key="summary"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="flex flex-col items-center gap-3"
            >
              {questions.map((question, index) => (
                <PillButton
                  key={question.id}
                  large
                  selected
                  onClick={() => editAnswer(index)}
                  aria-label={`${question.text}: ${answers[question.id]}. Tap to change.`}
                >
                  {answers[question.id]}
                </PillButton>
              ))}
            </motion.div>
          ) : (
            activeQuestion && (
              <motion.div
                key={activeQuestion.id}
                role="group"
                aria-label={activeQuestion.text}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="flex flex-col items-center"
              >
                <div className="flex items-center gap-3">
                  <CircleIconButton
                    icon={IconChevronLeft}
                    onClick={goBack}
                    disabled={safeIndex === 0}
                    label="Previous question"
                  />
                  <span className="text-[11px] font-semibold tabular-nums tracking-widest text-muted">
                    {safeIndex + 1} / {questions.length}
                  </span>
                  <CircleIconButton
                    icon={IconChevronRight}
                    onClick={goForward}
                    disabled={!answers[activeQuestion.id] || safeIndex === questions.length - 1}
                    label="Next question"
                  />
                </div>

                <p className="mt-4 max-w-xs text-center text-xl font-bold leading-snug text-ink">
                  {activeQuestion.text}
                </p>
                <div className="mt-6 flex flex-col items-center gap-3">
                  {activeQuestion.options.map((option) => (
                    <PillButton
                      key={option}
                      selected={answers[activeQuestion.id] === option}
                      onClick={() => answer(activeQuestion, option)}
                    >
                      {option}
                    </PillButton>
                  ))}
                </div>
              </motion.div>
            )
          )}
        </AnimatePresence>
      </div>

      {showSummary && (
        <button
          type="button"
          onClick={() => void handleSubmit()}
          className="mt-8 w-full rounded-lg bg-brand py-3 text-center text-sm font-bold text-white"
        >
          See my picks
        </button>
      )}
    </div>
  );
}

function ShortlistResult({
  outcome,
  candidateItems,
  friendVoteEnabled,
}: {
  outcome: ShortlistOutcome;
  candidateItems: CandidateDisplay[];
  friendVoteEnabled: boolean;
}) {
  if (outcome.status === "not_configured" || outcome.status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-base font-bold text-ink">Couldn&apos;t reach the AI right now</p>
        <p className="mt-2 text-sm text-muted">
          {outcome.status === "not_configured"
            ? "GROQ_API_KEY is missing on the server — a setup gap, not a verdict on your items."
            : "This is a connection hiccup, not a verdict on your items. Try again in a moment."}
        </p>
      </div>
    );
  }

  if (outcome.status === "not_separable") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-base font-bold text-ink">These are too close to call</p>
        <p className="mt-2 text-sm text-muted">{outcome.reason}</p>
      </div>
    );
  }

  // Same card as the category picks panel's carousel — tier + price on the
  // face, brand/price/reason in the expand modal.
  const cards: CardData[] = outcome.tiers.flatMap((tier) => {
    const item = candidateItems.find((c) => c.id === tier.itemId);
    if (!item) return [];
    return [
      {
        src: item.imageUrl,
        title: item.name,
        category: `${TIER_LABELS[tier.tier]} · ₹${item.price}`,
        content: (
          <div className="space-y-3">
            <p className="text-sm font-bold text-ink">{item.brand}</p>
            <p className="text-base font-semibold text-ink">₹{item.price}</p>
            <p className="text-sm leading-relaxed text-muted">{tier.reason}</p>
          </div>
        ),
      },
    ];
  });

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 py-6">
      <h1 className="text-lg font-bold text-ink">Your 3 picks</h1>
      <p className="mt-1 text-xs text-muted">
        An AI suggestion based on your answers — not the final word.
      </p>

      <div className="mt-4">
        <Carousel
          items={cards.map((card, index) => (
            <Card key={card.title} card={card} index={index} layout />
          ))}
        />
      </div>

      <ShareControls
        shortlistId={outcome.shortlistId}
        tiers={outcome.tiers.map((t) => ({
          tier: t.tier,
          itemId: t.itemId,
          brand: candidateItems.find((c) => c.id === t.itemId)?.brand ?? "",
        }))}
        enabled={friendVoteEnabled}
      />
    </div>
  );
}
