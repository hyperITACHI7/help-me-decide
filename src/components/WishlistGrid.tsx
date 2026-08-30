"use client";

import { useState } from "react";
import { startTriageWithSelection } from "@/app/wishlist/decide/actions";
import { createShowcase } from "@/app/wishlist/showcaseActions";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { CategoryRail } from "@/components/CategoryRail";
import { CategoryPicksPanel } from "@/components/CategoryPicksPanel";
import { ShowcaseWidget } from "@/components/ShowcaseWidget";
import { WishlistDock } from "@/components/WishlistDock";
import type { CatalogCardItem } from "@/components/CatalogProductCard";
import { MIN_AI_ITEMS, MIN_SHOWCASE_ITEMS } from "@/lib/selectionLimits";
import type { ShowcaseSummary } from "@/lib/showcaseSummary";

type Mode = "ai" | "showcase";

export type WishlistItem = CatalogCardItem & {
  category: string;
  openCount: number;
};

const COPY = {
  ai: {
    title: "Pick the items you're torn between",
    action: startTriageWithSelection,
    min: MIN_AI_ITEMS,
    cta: (n: number) => `Swipe through ${n}`,
    short: (min: number, n: number) => `Select at least ${min} (${n} picked)`,
  },
  showcase: {
    title: "Pick the items to showcase to friends",
    action: createShowcase,
    min: MIN_SHOWCASE_ITEMS,
    cta: (n: number) => `Showcase ${n} items`,
    short: (min: number, n: number) => `Select at least ${min} (${n} picked)`,
  },
} as const;

export function WishlistGrid({
  items,
  showcase,
}: {
  items: WishlistItem[];
  /** null when the shopper has never made one — the widget then renders nothing. */
  showcase: ShowcaseSummary | null;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  // null = "View all": the default view runs no AI at all, so a Ready Buyer
  // (0% decision difficulty, problem_statement.md §4) never meets the feature.
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

  const categories = [...new Set(items.map((i) => i.category))].sort();
  const counts = items.reduce<Record<string, number>>((acc, item) => {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
    return acc;
  }, {});

  const visibleItems = activeCategory
    ? items.filter((i) => i.category === activeCategory)
    : items;

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function start(next: Mode) {
    setMode(next);
    setSelectedIds(new Set());
  }

  function cancel() {
    setMode(null);
    setSelectedIds(new Set());
  }

  const copy = mode ? COPY[mode] : null;
  const enough = copy ? selectedIds.size >= copy.min : false;

  return (
    <CatalogBrowser
      items={visibleItems}
      title={activeCategory ?? "Wishlist"}
      breadcrumb="Wishlist"
      showOpenCount
      // "Add to Wishlist" is meaningless on the wishlist itself; opening an
      // item is what feeds F2 here.
      showAddToWishlist={false}
      submitOpenItem={mode === null}
      selection={mode ? { selectedIds, onToggle: toggle } : undefined}
      // The rail is the category control here, so the sidebar's own Category
      // facet would be a second, conflicting one.
      hideCategoryFilter
      beforeGrid={
        <>
          <CategoryRail
            categories={categories}
            active={activeCategory}
            counts={counts}
            onSelect={setActiveCategory}
          />
          {activeCategory && (
            <CategoryPicksPanel
              key={activeCategory}
              category={activeCategory}
              items={visibleItems}
            />
          )}
          {/* Last, so it sits directly above the grid's title/sort row. It's a
              wishlist-wide status card, not a category one, so it stays put
              when a category is open rather than displacing that category's
              AI picks. */}
          {showcase && <ShowcaseWidget summary={showcase} />}
        </>
      }
      footer={
        /* F1: entry point visible on the wishlist without navigation, opt-in
           only (edge_case.md EC5 — never an interstitial that blocks
           browsing). Both AI Pick and Showcase build their set the same way;
           only where the set is sent differs. */
        copy ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
            <p className="mx-auto mb-2 max-w-md text-xs font-medium text-muted">
              {copy.title}
            </p>
            <form action={copy.action} className="mx-auto flex max-w-md items-center gap-2">
              {Array.from(selectedIds).map((id) => (
                <input key={id} type="hidden" name="itemIds" value={id} />
              ))}
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg border border-border px-4 py-3 text-sm font-semibold text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!enough}
                className="flex-1 rounded-lg bg-brand py-3 text-center text-sm font-bold text-white disabled:opacity-40"
              >
                {enough
                  ? copy.cta(selectedIds.size)
                  : copy.short(copy.min, selectedIds.size)}
              </button>
            </form>
          </div>
        ) : (
          <WishlistDock
            onAiPick={() => start("ai")}
            onShowcase={() => start("showcase")}
            canClean={items.length > 0}
          />
        )
      }
    />
  );
}
