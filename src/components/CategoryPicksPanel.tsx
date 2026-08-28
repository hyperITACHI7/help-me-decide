"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { IconSparkles } from "@tabler/icons-react";
import { fetchCategoryPicks } from "@/app/wishlist/categoryActions";
import { Card, Carousel, type CardData } from "@/components/ui/apple-cards-carousel";
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

  function answer(question: NarrowingQuestion, option: string) {
    const next = { ...answers };
    // Tapping the chosen option again clears it — answering is optional, so
    // un-answering has to be possible too.
    if (next[question.id] === option) delete next[question.id];
    else next[question.id] = option;
    setAnswers(next);

    const payload = questions
      .filter((q) => next[q.id])
      .map((q) => ({ question: q.text, answer: next[q.id]! }));

    startTransition(async () => {
      const result = await fetchCategoryPicks(category, payload);
      if (live.current) setView(result);
    });
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
              subtitle: tier.reason,
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
    <section className="mb-6 rounded-xl border border-border bg-surface p-4">
      <div className="flex flex-wrap items-center gap-2">
        <IconSparkles className="h-4 w-4 text-brand" />
        <h2 className="text-sm font-bold text-ink">Picks for {category}</h2>
        {/* N4: the AI's pick is one input, never presented as authoritative. */}
        <span className="text-xs text-muted">— a suggestion, not a verdict</span>
      </div>

      {questions.length > 0 && (
        <div className="mt-3 space-y-2 border-t border-border pt-3">
          <p className="text-xs text-muted">
            Optional — answer any of these to sharpen the picks.
          </p>
          {questions.map((question) => (
            <div key={question.id} className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-medium text-ink">{question.text}</span>
              {question.options.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => answer(question, option)}
                  aria-pressed={answers[question.id] === option}
                  className={cn(
                    "rounded-full border px-2.5 py-1 text-[11px] font-semibold transition-colors",
                    answers[question.id] === option
                      ? "border-brand bg-brand text-white"
                      : "border-border bg-canvas text-ink hover:border-brand"
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="mt-2" aria-live="polite">
        {view === null && <PanelNote>Working out the picks…</PanelNote>}

        {view?.status === "not_configured" && (
          <PanelNote>
            AI picks aren&apos;t configured on the server — this is a setup gap, not
            a judgment about these items.
          </PanelNote>
        )}

        {view?.status === "error" && (
          <PanelNote>Couldn&apos;t reach the AI just now. Try again in a moment.</PanelNote>
        )}

        {view?.status === "too_few" && (
          <PanelNote>
            Only {view.count} distinct {view.count === 1 ? "product" : "products"} in{" "}
            {category} — not enough to compare. Everything here is shown below.
          </PanelNote>
        )}

        {view?.status === "ok" && (
          <div className={cn("transition-opacity", pending && "opacity-50")}>
            <Carousel
              // Remount on a new set of picks so the entry stagger replays and
              // the cards don't cross-fade into each other's layoutIds.
              key={cards.map((card) => card.title).join("|")}
              items={cards.map((card, index) => (
                <Card key={card.title} card={card} index={index} layout />
              ))}
            />
          </div>
        )}
      </div>
    </section>
  );
}

function PanelNote({ children }: { children: React.ReactNode }) {
  return <p className="text-xs text-muted">{children}</p>;
}
