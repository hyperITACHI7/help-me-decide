"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { IconAdjustmentsHorizontal, IconSparkles } from "@tabler/icons-react";
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
          right, not a strip in front of them. Stacked below xl, where a rail
          would squeeze the carousel to a single visible card — and there the
          rail moves above the cards (order-first), since a control below
          three 416px cards on a phone screen is one you never find. */}
      <div className="flex flex-col gap-6 p-6 xl:flex-row xl:items-start">
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
              "rounded-xl bg-canvas p-5",
              // Above the cards on mobile; back to their right from md, where
              // the cards fit on screen and should lead.
              "order-first md:order-none",
              // flex-1 with a floor: claims whatever the shrink-wrapped
              // carousel leaves rather than sitting at a fixed width with a
              // gap beside it, but never drops under 17rem — past that the
              // carousel gives up a card instead.
              "xl:min-w-[17rem] xl:flex-1",
            )}
          >
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
              Optional — answering any of these sharpens the picks above.
            </p>

            {/* flex-wrap, not grid: a grid's column tracks are fixed for the
                whole layout, so a trailing question left alone in the last row
                sat in one narrow track with an empty one visibly beside it.
                Flex just stops after the last real item instead. No grow,
                though — that was tried and made it worse: a lone last
                question stretched to the row's full width, so 2-3 short
                pills sat against a wide empty margin, which reads worse than
                the narrow gap it replaced. w-52 (13rem) without flex-1 just
                wraps at a fixed width, the same as the other questions. */}
            <div className="mt-5 flex flex-wrap gap-x-6 gap-y-5">
              {questions.map((question) => (
                <div
                  key={question.id}
                  role="group"
                  aria-label={question.text}
                  className="w-52"
                >
                  {/* Bumped up from the pills' 10px and the helper text's 12px —
                      the question is the thing being answered, and it read as
                      just another line of fine print next to them. */}
                  <p className="text-sm font-bold leading-snug text-ink">
                    {question.text}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {question.options.map((option) => (
                      <OptionPill
                        key={option}
                        selected={answers[question.id] === option}
                        onClick={() => answer(question, option)}
                      >
                        {option}
                      </OptionPill>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </aside>
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
