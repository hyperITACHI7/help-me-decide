"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { IconAdjustmentsHorizontal, IconSparkles, IconX } from "@tabler/icons-react";
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

      {/* Questions above the cards, not beside them — one column, so there's
          only ever one width and one left edge to track. No fill behind them
          either: a grey panel here read as a form to complete before you
          could get to the cards, when it's meant to be a quick optional
          aside on the way past. A border under it is enough to separate it
          from the cards below. */}
      {questions.length > 0 && (
        <aside className="border-b border-border px-6 py-5">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-ink">
              <IconAdjustmentsHorizontal className="h-3.5 w-3.5 text-muted" />
              Narrow it down
            </h3>
            {answeredCount > 0 && (
              <button
                type="button"
                onClick={clearAnswers}
                className="text-[11px] font-semibold text-brand transition-colors hover:text-brand-dark"
              >
                Clear
              </button>
            )}
          </div>
          <p className="mt-1.5 text-xs leading-relaxed text-muted">
            Optional — answer one and the next appears.
          </p>

          <div className="mt-5">
            {/* Answered questions collapse into this row rather than staying
                as full question+options blocks — the row is the "summary" of
                what's already been answered, laid out horizontally so it
                reads as a strip of choices, not a stack of finished forms.
                layout on the row (and each tag) lets Motion animate the
                reflow when a tag joins or leaves, instead of the row jumping
                straight to its new size. */}
            {answeredQuestions.length > 0 && (
              <motion.div layout className="flex flex-wrap items-center gap-2">
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
            )}

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
                  className={answeredQuestions.length > 0 ? "mt-4" : undefined}
                >
                  <p className="text-sm font-bold leading-snug text-ink">
                    {activeQuestion.text}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {activeQuestion.options.map((option) => (
                      <OptionPill
                        key={option}
                        selected={false}
                        onClick={() => answer(activeQuestion, option)}
                      >
                        {option}
                      </OptionPill>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </aside>
      )}

      <div className="p-6" aria-live="polite">
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
    </section>
  );
}

/**
 * The ring is drawn with an inset box-shadow rather than a border so the pill
 * doesn't shift by 2px when it fills on hover or selection — a border would
 * change the box, an inset shadow paints inside it.
 */
function OptionPill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full bg-transparent px-4 py-2 text-[10px] font-bold uppercase tracking-widest transition duration-200",
        selected
          ? "bg-brand text-white shadow-[inset_0_0_0_2px_var(--color-brand)]"
          : "text-ink shadow-[inset_0_0_0_2px_var(--color-border)] hover:bg-ink hover:text-white hover:shadow-[inset_0_0_0_2px_var(--color-ink)]",
      )}
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
