"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  IconAdjustmentsHorizontal,
  IconRefresh,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { AnimatePresence, motion } from "motion/react";
import { fetchCategoryPicks } from "@/app/wishlist/categoryActions";
import { Card, Carousel, type CardData } from "@/components/ui/apple-cards-carousel";
import { LoaderOne } from "@/components/ui/loader";
import { TIER_LABELS } from "@/lib/tierDisplay";
import type { CategoryPicksView } from "@/lib/categoryPicks";
import type { NarrowingQuestion } from "@/lib/shortlist";
import { cn } from "@/lib/utils";

type PanelItem = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: number;
};

export function CategoryPicksPanel({
  category,
  items,
}: {
  category: string;
  items: PanelItem[];
}) {
  const [view, setView] = useState<CategoryPicksView | null>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();
  // Set while this instance is still mounted; the caller keys this component on
  // the category, so switching categories remounts it with fresh state rather
  // than needing a reset here — and a slow reply from the old category lands on
  // an unmounted instance, which this flag drops.
  const live = useRef(true);

  useEffect(() => {
    live.current = true;
    void fetchCategoryPicks(category).then((result) => {
      if (live.current) setView(result);
    });
    return () => {
      live.current = false;
    };
  }, [category]);

  const questions: NarrowingQuestion[] =
    view && (view.status === "ok" || view.status === "too_few") ? view.questions : [];

  // One question at a time: the next one only appears once the current one
  // is answered, so this reads as a short guided step rather than a form to
  // fill out up front. Answered questions collapse into a row of tags above
  // it; un-answering one (tapping its tag) drops it and everything after it
  // back out of the row, for the same reason.
  const firstUnansweredIndex = questions.findIndex((q) => !answers[q.id]);
  const answeredQuestions =
    firstUnansweredIndex === -1 ? questions : questions.slice(0, firstUnansweredIndex);
  const activeQuestion = firstUnansweredIndex === -1 ? null : questions[firstUnansweredIndex];

  function refetch(next: Record<string, string>) {
    const payload = questions
      .filter((q) => next[q.id])
      .map((q) => ({ question: q.text, answer: next[q.id]! }));

    startTransition(async () => {
      const result = await fetchCategoryPicks(category, payload);
      if (live.current) setView(result);
    });
  }

  function answer(question: NarrowingQuestion, option: string) {
    const next = { ...answers };
    // Tapping the chosen option again clears it — answering is optional, so
    // un-answering has to be possible too.
    if (next[question.id] === option) delete next[question.id];
    else next[question.id] = option;
    setAnswers(next);
    refetch(next);
  }

  function clearAnswers() {
    setAnswers({});
    refetch({});
  }

  const answeredCount = Object.keys(answers).length;

  const byId = new Map(items.map((item) => [item.id, item]));

  const cards: CardData[] =
    view?.status === "ok"
      ? view.tiers.flatMap((tier) => {
          const item = byId.get(tier.itemId);
          if (!item) return [];
          return [
            {
              src: item.imageUrl,
              // Doubles as the layoutId key for the expand animation, so it has
              // to be unique per card. Picks are validated distinct upstream.
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
        })
      : [];

  return (
    <section className="mb-8 overflow-hidden rounded-2xl border border-border bg-surface">
      <header className="border-b border-border px-6 py-5">
        <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-brand">
          <IconSparkles className="h-3.5 w-3.5" />
          AI picks
        </span>
        <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h2 className="text-xl font-bold tracking-tight text-ink">{category}</h2>
          {/* N4: the AI's pick is one input, never presented as authoritative —
              and §2.4, the three tiers are three different decision criteria,
              not a ranking, which the subtitle has to say out loud. */}
          <p className="text-sm text-muted">
            Three ways to decide — a suggestion, not a verdict.
          </p>
        </div>
      </header>

      {/* Cards lead on the left; the questions are a control rail to their
          right, matched to their height (no items-start override — default
          stretch) rather than sized to its own content. One question at a
          time leaves a tall rail mostly empty at content-height, so the
          content fills it instead: bigger type, full-width options, the
          block vertically centred in the space the cards give it. Below
          that breakpoint the rail moves above the cards (order-first) full
          width, where the same content just doesn't stretch. */}
      <div className="flex flex-col gap-6 p-6 xl:flex-row">
        {/* w-fit rather than flex-1: the carousel is a fixed 3 cards, so a
            growing column just pads dead space onto its own right edge.
            min-w-0 lets it shrink and scroll if the rail's floor leaves it
            less than three cards' worth of room. */}
        <div className="min-w-0 xl:w-fit" aria-live="polite">
          {/* The first evaluation of a category is a live model call — a few
              seconds, against a card row that is about to appear. The loader
              holds roughly that space so the panel doesn't jump. */}
          {view === null && (
            <div className="flex h-[26rem] flex-col items-center justify-center gap-4">
              <LoaderOne />
              <p className="text-sm text-muted">Working out the picks…</p>
            </div>
          )}

          {view?.status === "not_configured" && (
            <PanelNote>
              AI picks aren&apos;t configured on the server — this is a setup gap,
              not a judgment about these items.
            </PanelNote>
          )}

          {view?.status === "error" && (
            <PanelNote>
              Couldn&apos;t reach the AI just now. Try again in a moment.
            </PanelNote>
          )}

          {view?.status === "too_few" && (
            <PanelNote>
              Only {view.count} distinct{" "}
              {view.count === 1 ? "product" : "products"} in {category} — not
              enough to compare. Everything here is shown below.
            </PanelNote>
          )}

          {view?.status === "ok" && (
            <div className="relative">
              {/* Answering a question re-runs the model against the stale cards,
                  so they dim behind the same loader rather than sitting there
                  looking current. */}
              {pending && (
                <div className="absolute inset-0 z-50 flex items-center justify-center">
                  <LoaderOne />
                </div>
              )}
              <div className={cn("transition-opacity", pending && "opacity-40")}>
                <Carousel
                  // Remount on a new set of picks so the entry stagger replays
                  // and the cards don't cross-fade into each other's layoutIds.
                  key={cards.map((card) => card.title).join("|")}
                  items={cards.map((card, index) => (
                    <Card key={card.title} card={card} index={index} layout />
                  ))}
                />
              </div>
            </div>
          )}
        </div>

        {questions.length > 0 && (
          <aside
            className={cn(
              "flex flex-col",
              // Above the cards below xl, where there's no side-by-side row to
              // join; back to their right from xl, where the cards lead.
              "order-first xl:order-none",
              // flex-1 with a floor: claims whatever the shrink-wrapped
              // carousel leaves rather than sitting at a fixed width with a
              // gap beside it, but never drops under 17rem — past that the
              // carousel gives up a card instead.
              "xl:min-w-[17rem] xl:flex-1",
            )}
          >
            <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink">
              <IconAdjustmentsHorizontal className="h-3.5 w-3.5 text-muted" />
              Narrow it down
            </h3>
            <p className="mt-1.5 text-xs leading-relaxed text-muted">
              Optional — answer one and the next appears.
            </p>

            {/* flex-1 + justify-center: at xl this box is stretched to the
                cards' height by the row above (no items-start override), and
                one question at a time is a lot less content than three
                product photos, so it's centred in that height instead of
                pinned to the top with empty space under it. */}
            <div className="mt-5 flex flex-1 flex-col justify-center xl:mt-8">
              {/* Reserved at a fixed height whether or not there's anything in
                  it yet, rather than only appearing once the first tag exists
                  — that appearance was what pushed the question below it down
                  the moment you answered. An empty reserved row can't do that. */}
              <motion.div layout className="flex min-h-9 flex-wrap items-center gap-2">
                <AnimatePresence initial={false}>
                  {answeredQuestions.map((question) => (
                    <motion.button
                      key={question.id}
                      layout
                      type="button"
                      // Slides in from the left rather than just fading, since
                      // that's the direction a newly-collapsed question moves
                      // in relative to the tags already ahead of it.
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -12 }}
                      transition={{ type: "spring", stiffness: 500, damping: 34 }}
                      onClick={() => answer(question, answers[question.id]!)}
                      aria-label={`${question.text}: ${answers[question.id]}. Tap to change.`}
                      className="inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-xs font-semibold text-brand-dark transition-colors hover:bg-brand/15"
                    >
                      {answers[question.id]}
                      <IconX className="h-3 w-3" />
                    </motion.button>
                  ))}
                </AnimatePresence>
              </motion.div>

              {/* The one open question. mode="wait" so the outgoing question
                  finishes its fade before the next one starts fading in,
                  rather than the two cross-dissolving. */}
              <AnimatePresence mode="wait">
                {activeQuestion && (
                  <motion.div
                    key={activeQuestion.id}
                    layout
                    role="group"
                    aria-label={activeQuestion.text}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="mt-4"
                  >
                    {/* Bumped up well past the tags' text-xs and the old
                        pills' 10px — one question at a time, in a rail as
                        tall as the cards beside it, has the room to read as
                        the main thing on screen rather than a caption. */}
                    <p className="text-xl font-bold leading-snug text-ink">
                      {activeQuestion.text}
                    </p>
                    {/* Full-width rows, not wrapped pills: with only one
                        question visible there's no shortage of width to
                        share between options, so each gets its own line and
                        a proper tap target instead of a cramped chip. */}
                    <div className="mt-6 flex flex-col gap-3">
                      {activeQuestion.options.map((option) => (
                        <OptionRow
                          key={option}
                          onClick={() => answer(activeQuestion, option)}
                        >
                          {option}
                        </OptionRow>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Always rendered, just disabled until there's something to
                  clear — an appearing/disappearing button here would be the
                  same kind of reflow the tag row used to cause. */}
              <div className="mt-8 flex justify-center">
                <button
                  type="button"
                  onClick={clearAnswers}
                  disabled={answeredCount === 0}
                  aria-label="Clear answers and start over"
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full border transition-colors",
                    answeredCount > 0
                      ? "border-border text-muted hover:border-ink hover:text-ink"
                      : "cursor-not-allowed border-border/50 text-muted/40",
                  )}
                >
                  <IconRefresh className="h-4 w-4" />
                </button>
              </div>
            </div>
          </aside>
        )}
      </div>
    </section>
  );
}

/**
 * One option, one full-width row. There's no "selected" state to show —
 * clicking answers the question immediately and the whole block it's in
 * unmounts, replaced by a tag — so this only needs a rest state and a hover
 * state, unlike the old inline pill it replaces.
 *
 * The ring is still an inset box-shadow rather than a border, for the same
 * reason as before: a border changes the box on hover, an inset shadow
 * paints inside a box that never moves.
 */
function OptionRow({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-xl bg-transparent px-4 py-3 text-left text-sm font-bold text-ink shadow-[inset_0_0_0_2px_var(--color-border)] transition duration-200 hover:bg-ink hover:text-white hover:shadow-[inset_0_0_0_2px_var(--color-ink)]"
    >
      {children}
    </button>
  );
}

function PanelNote({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[8rem] items-center justify-center px-6 py-8">
      <p className="max-w-sm text-center text-sm leading-relaxed text-muted">
        {children}
      </p>
    </div>
  );
}
