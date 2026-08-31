"use client";

import { useMemo, useState } from "react";
import { createShowcase } from "@/app/wishlist/showcaseActions";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { CategoryRail } from "@/components/CategoryRail";
import { CategoryPicksPanel } from "@/components/CategoryPicksPanel";
import { ShowcaseWidget } from "@/components/ShowcaseWidget";
import type { CatalogCardItem } from "@/components/CatalogProductCard";
import { useCategoryPicks } from "@/hooks/useCategoryPicks";
import { MIN_SHOWCASE_ITEMS } from "@/lib/selectionLimits";
import type { ShowcaseSummary } from "@/lib/showcaseSummary";
import type { TierName } from "@/lib/shortlist";

export type WishlistItem = CatalogCardItem & {
  category: string;
  openCount: number;
};

export function WishlistGrid({
  items,
  showcase,
}: {
  items: WishlistItem[];
  /** null when the shopper has never made one — the widget then invites them to. */
  showcase: ShowcaseSummary | null;
}) {
  // Selection mode exists only for building a showcase. The AI's picks are
  // reachable from it without being selectable in the carousel: they carry a
  // tier badge in the grid below and lead it under "Recommended", so picking
  // "the one the AI liked" is a tap on an ordinary grid tile.
  const [selecting, setSelecting] = useState(false);
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

  // Fetched once here rather than inside the picks panel, because the grid
  // needs the same three items: they carry a tier badge and lead the grid
  // under "Recommended". Without that the picks were only ever visible in the
  // carousel — which is exactly why they couldn't be picked for a showcase.
  const picks = useCategoryPicks(activeCategory);

  const pickTiers = useMemo(() => {
    const tiers = new Map<string, TierName>();
    if (picks.view?.status === "ok") {
      for (const tier of picks.view.tiers) tiers.set(tier.itemId, tier.tier);
    }
    return tiers;
  }, [picks.view]);

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function startShowcase() {
    // A showcase spans the whole wishlist, so picking its items from inside
    // one category's filter would quietly hide most of the candidates.
    setActiveCategory(null);
    setSelectedIds(new Set());
    setSelecting(true);
  }

  function cancel() {
    setSelecting(false);
    setSelectedIds(new Set());
  }

  const enough = selectedIds.size >= MIN_SHOWCASE_ITEMS;

  return (
    <CatalogBrowser
      items={visibleItems}
      title={activeCategory ?? "Wishlist"}
      breadcrumb="Wishlist"
      showOpenCount
      // "Add to Wishlist" is meaningless on the wishlist itself; opening an
      // item is what feeds F2 here.
      showAddToWishlist={false}
      submitOpenItem={!selecting}
      selection={selecting ? { selectedIds, onToggle: toggle } : undefined}
      // The rail is the category control here, so the sidebar's own Category
      // facet would be a second, conflicting one.
      hideCategoryFilter
      pickTiers={pickTiers}
      beforeGrid={
        <>
          {/* Above the rail because it spans every category — the AI picks
              below it are scoped to whichever category is open. */}
          <ShowcaseWidget
            summary={showcase}
            onStart={startShowcase}
            canStart={items.length >= MIN_SHOWCASE_ITEMS}
          />
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
              picks={picks}
            />
          )}
        </>
      }
      footer={
        /* F1: entry point visible on the wishlist without navigation, opt-in
           only (edge_case.md EC5 — never an interstitial that blocks
           browsing). Only appears while actively building a showcase. */
        selecting ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
            <p className="mx-auto mb-2 max-w-md text-xs font-medium text-muted">
              Pick the items to showcase to friends
            </p>
            <form action={createShowcase} className="mx-auto flex max-w-md items-center gap-2">
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
                  ? `Showcase ${selectedIds.size} items`
                  : `Select at least ${MIN_SHOWCASE_ITEMS} (${selectedIds.size} picked)`}
              </button>
            </form>
          </div>
        ) : null
      }
    />
  );
}
