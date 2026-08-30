"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import {
  IconAdjustmentsHorizontal,
  IconChevronLeft,
  IconChevronRight,
  IconRefresh,
  IconSparkles,
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
  const [activeIndex, setActiveIndex] = useState(0);
  // True only while deliberately revisiting one answer from the finished
  // summary via its back/forward-reachable question view. Answering it
  // again clears this, which is what lets the summary reappear once
  // everything's answered again.
  const [editingFromSummary, setEditingFromSummary] = useState(false);
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

  const answeredCount = Object.keys(answers).length;
  const allAnswered = questions.length > 0 && answeredCount === questions.length;
  // Once every question has an answer, show the summary instead of a
  // question — unless the summary is what got you back here (you clicked
  // one of its answers to change it), in which case stay on that question
  // until you answer it again.
  const showSummary = allAnswered && !editingFromSummary;
  const safeIndex = Math.min(activeIndex, Math.max(questions.length - 1, 0));
  const activeQuestion = questions[safeIndex] ?? null;

  function refetch(next: Record<string, string>) {
    const payload = questions
      .filter((q) => next[q.id])
      .map((q) => ({ question: q.text, answer: next[q.id]! }));

    startTransition(async () => {
      const result = await fetchCategoryPicks(category, payload);
      if (live.current) setView(result);
    });
  }

  function goBack() {
    setActiveIndex((i) => Math.max(0, i - 1));
  }

  function goForward() {
    setActiveIndex((i) => Math.min(questions.length - 1, i + 1));
  }

  /** Re-opens one answered question from the summary so its pick can change. */
  function editAnswer(index: number) {
    setActiveIndex(index);
    setEditingFromSummary(true);
  }

  function answer(question: NarrowingQuestion, option: string) {
    const isUnanswering = answers[question.id] === option;
    const next = { ...answers };
    // Tapping the chosen option again clears it — answering is optional, so
    // un-answering has to be possible too.
    if (isUnanswering) delete next[question.id];
    else next[question.id] = option;
    setAnswers(next);
    refetch(next);

    if (isUnanswering) return;
    // Confirming an answer — as opposed to retracting one — is what advances
    // things: move to the next unanswered question, or, if that was the
    // last one, drop out of edit mode so the summary takes over.
    setEditingFromSummary(false);
    setActiveIndex((i) => Math.min(questions.length - 1, i + 1));
  }

  function clearAnswers() {
    setAnswers({});
    setActiveIndex(0);
    setEditingFromSummary(false);
    refetch({});
  }

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
            {/* Was text-[11px]/text-xs — noticeably smaller than everything
                else in this rail (the question is text-xl, the pills are
                text-xs/text-sm and bold), so this read as barely-there next
                to them. One step up each, kept light-weight/muted so it
                still reads as a label, not a competing heading. */}
            <h3 className="flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-ink">
              <IconAdjustmentsHorizontal className="h-4 w-4 text-muted" />
              Narrow it down
            </h3>
            <p className="mt-1.5 text-center text-sm leading-relaxed text-muted">
              {showSummary
                ? "Tap any answer to change it."
                : "Optional — answer one and the next appears."}
            </p>

            {/* flex-1 + justify-center: at xl this box is stretched to the
                cards' height by the row above (no items-start override), and
                one question at a time is a lot less content than three
                product photos, so it's centred in that height instead of
                pinned to the top with empty space under it. Centred on the
                cross axis too (items-center) — the pill buttons size to
                their own label now rather than filling the rail's width, so
                nothing else here should hug an edge either. */}
            <div className="mt-5 flex flex-1 flex-col items-center justify-center xl:mt-8">
              {/* mode="wait": the outgoing question (or the summary) finishes
                  its fade before the next thing starts fading in, rather than
                  the two cross-dissolving. */}
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
                      {/* Forward/back move freely between questions — including
                          ones already answered, to change them — rather than
                          only ever advancing on its own. */}
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
                          disabled={safeIndex === questions.length - 1}
                          label="Next question"
                        />
                      </div>

                      {/* Bumped up well past the pills' 10px — one question at
                          a time, in a rail as tall as the cards beside it, has
                          the room to read as the main thing on screen rather
                          than a caption. */}
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

              {/* Always rendered, just disabled until there's something to
                  clear — an appearing/disappearing button here would be its
                  own reflow bug, the same kind the old tag row caused. */}
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
 * One option (or, in the summary, one confirmed answer). Sized to its label
 * rather than stretched to fill the rail — the ring is an inset box-shadow
 * rather than a border for the usual reason: a border changes the box on
 * hover/selection, an inset shadow paints inside a box that never moves.
 *
 * `selected` fills it solid — used both for the option a question already
 * has an answer for (revisited via back/forward) and, always, for the
 * summary's answers, since those aren't a multi-choice to pick between
 * anymore, just a record of what was picked. `large` bumps the summary's
 * buttons up a size from the in-progress ones, since those are meant to
 * read as a finished answer at a glance, not one of several options.
 */
function PillButton({
  selected,
  large,
  onClick,
  children,
  ...rest
}: {
  selected?: boolean;
  large?: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full font-bold tracking-widest uppercase transition duration-200",
        large ? "px-7 py-3.5 text-sm" : "px-6 py-3 text-xs",
        selected
          ? "bg-ink text-white shadow-[inset_0_0_0_2px_var(--color-ink)]"
          : "bg-transparent text-ink shadow-[inset_0_0_0_2px_var(--color-border)] hover:bg-ink hover:text-white hover:shadow-[inset_0_0_0_2px_var(--color-ink)]",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

function CircleIconButton({
  icon: Icon,
  onClick,
  disabled,
  label,
}: {
  icon: typeof IconChevronLeft;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
        disabled
          ? "cursor-not-allowed border-border/50 text-muted/40"
          : "border-border text-muted hover:border-ink hover:text-ink",
      )}
    >
      <Icon className="h-4 w-4" />
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
