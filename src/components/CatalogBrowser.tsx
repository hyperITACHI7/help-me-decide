"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { CatalogProductCard, type CatalogCardItem } from "@/components/CatalogProductCard";
import { CatalogFilterSidebar } from "@/components/CatalogFilterSidebar";
import { SortDropdown } from "@/components/SortDropdown";
import { addToWishlist } from "@/app/actions";
import { discountPercent } from "@/lib/display";
import { TIER_ORDER } from "@/lib/tierDisplay";
import type { TierName } from "@/lib/shortlist";
import { cn } from "@/lib/utils";

type Item = CatalogCardItem & { category: string; openCount: number };

const DISCOUNT_TIERS = [10, 20, 30, 40, 50];
const PRICE_STEP = 100;

/** Hover-surface travel time — quick, but long enough to read as a move. */
const TRAVEL_MS = 180;
const TRAVEL_S = TRAVEL_MS / 1000;

const SORTS = [
  { key: "recommended", label: "Recommended" },
  { key: "popularity", label: "Popularity" },
  { key: "discount-desc", label: "Better Discount" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "rating-desc", label: "Customer Rating" },
] as const;
type SortKey = (typeof SORTS)[number]["key"];

function countBy<T extends string>(items: Item[], pick: (i: Item) => T) {
  const counts = new Map<T, number>();
  for (const item of items) {
    const key = pick(item);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return counts;
}

export function CatalogBrowser({
  items,
  title = "All items",
  breadcrumb = "All items",
  selection,
  showOpenCount = false,
  showAddToWishlist = true,
  submitOpenItem = false,
  hideCategoryFilter = false,
  pickTiers,
  beforeGrid,
  footer,
}: {
  items: Item[];
  title?: string;
  breadcrumb?: string;
  /** Present while the wishlist is picking triage candidates. */
  selection?: {
    selectedIds: Set<string>;
    onToggle: (id: string) => void;
  };
  showOpenCount?: boolean;
  showAddToWishlist?: boolean;
  submitOpenItem?: boolean;
  /** Set when the caller supplies its own category control (the wishlist rail). */
  hideCategoryFilter?: boolean;
  /** The AI's picks for the open category, keyed by item id. */
  pickTiers?: Map<string, TierName>;
  /** Slot rendered above the title/sort row, before the product grid. */
  beforeGrid?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  // Rounded out to the step so the slider ends on clean rupee values.
  const priceBounds = useMemo<[number, number]>(() => {
    if (items.length === 0) return [0, 10000];
    const prices = items.map((i) => i.price);
    const hi = Math.ceil(Math.max(...prices) / PRICE_STEP) * PRICE_STEP;
    return [0, Math.max(hi, PRICE_STEP)];
  }, [items]);

  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [brands, setBrands] = useState<Set<string>>(new Set());
  const [priceRange, setPriceRange] = useState<[number, number]>(priceBounds);
  const [discountTier, setDiscountTier] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("recommended");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  // False while the hover surface is travelling between cards. Driven from the
  // hover change rather than motion's layout callbacks so it stays correct even
  // if the layout animation is skipped (reduced motion, throttled rAF).
  const [settled, setSettled] = useState(true);
  const travelTimer = useRef<number | null>(null);

  useEffect(() => () => {
    if (travelTimer.current !== null) window.clearTimeout(travelTimer.current);
  }, []);

  function handleCardEnter(idx: number) {
    if (hoveredIndex !== null && hoveredIndex !== idx) {
      setSettled(false);
      if (travelTimer.current !== null) window.clearTimeout(travelTimer.current);
      travelTimer.current = window.setTimeout(() => setSettled(true), TRAVEL_MS);
    }
    setHoveredIndex(idx);
  }

  const categoryCounts = useMemo(() => countBy(items, (i) => i.category), [items]);
  const brandCounts = useMemo(() => countBy(items, (i) => i.brand), [items]);

  const priceNarrowed =
    priceRange[0] > priceBounds[0] || priceRange[1] < priceBounds[1];

  const filtered = useMemo(() => {
    let result = items.filter((item) => {
      if (categories.size > 0 && !categories.has(item.category)) return false;
      if (brands.size > 0 && !brands.has(item.brand)) return false;
      if (item.price < priceRange[0]) return false;
      // The top of the range reads as "and above", so it never excludes.
      if (priceRange[1] < priceBounds[1] && item.price > priceRange[1]) return false;
      if (discountTier !== null) {
        const pct = discountPercent(item.price, item.originalPrice) ?? 0;
        if (pct < discountTier) return false;
      }
      return true;
    });

    result = [...result];
    // "Recommended" is the only sort the picks lead, and only when a category
    // is open so there are picks at all. Everywhere else the shopper asked for
    // an explicit order (price, rating, discount) and the AI shouldn't be
    // quietly overriding it. Array.sort is stable, so everything unpicked
    // keeps the order it arrived in rather than being reshuffled.
    if (sort === "recommended" && pickTiers && pickTiers.size > 0) {
      const rank = (id: string) => {
        const tier = pickTiers.get(id);
        return tier === undefined ? Number.MAX_SAFE_INTEGER : TIER_ORDER[tier];
      };
      result.sort((a, b) => rank(a.id) - rank(b.id));
    }
    if (sort === "price-asc") result.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") result.sort((a, b) => b.price - a.price);
    else if (sort === "rating-desc") result.sort((a, b) => b.rating - a.rating);
    // F2's revealed-preference signal doubles as the popularity ordering.
    else if (sort === "popularity") result.sort((a, b) => b.openCount - a.openCount);
    else if (sort === "discount-desc") {
      result.sort(
        (a, b) =>
          (discountPercent(b.price, b.originalPrice) ?? 0) -
          (discountPercent(a.price, a.originalPrice) ?? 0)
      );
    }
    return result;
  }, [items, categories, brands, priceRange, priceBounds, discountTier, sort, pickTiers]);

  const anyFilterActive =
    categories.size > 0 || brands.size > 0 || priceNarrowed || discountTier !== null;

  function toggleSet(
    set: Set<string>,
    setter: (s: Set<string>) => void,
    value: string
  ) {
    const next = new Set(set);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    setter(next);
  }

  function clearAll() {
    setCategories(new Set());
    setBrands(new Set());
    setPriceRange(priceBounds);
    setDiscountTier(null);
  }

  return (
    <div className="px-4 py-4">
      {/* "Home" was flat text, so the wishlist had no way back to the
          catalogue except the header logo. */}
      <p className="text-xs text-muted">
        <Link href="/" className="transition-colors hover:text-ink">
          Home
        </Link>
        <span className="mx-1">/</span> {breadcrumb}
      </p>

      <div className="mt-3 flex flex-col gap-6 md:flex-row">
        {/* Reserves only the collapsed rail's width in the flow; the panel
            itself is fixed to the viewport, not positioned relative to this
            column, so it can stay on screen while the page scrolls. */}
        <div className="shrink-0 md:w-[60px]">
          <CatalogFilterSidebar
            categoryCounts={hideCategoryFilter ? [] : [...categoryCounts.entries()]}
            brandCounts={[...brandCounts.entries()]}
            priceBounds={priceBounds}
            priceRange={priceRange}
            discountTiers={DISCOUNT_TIERS}
            categories={categories}
            brands={brands}
            discountTier={discountTier}
            anyFilterActive={anyFilterActive}
            onToggleCategory={(value) => toggleSet(categories, setCategories, value)}
            onToggleBrand={(value) => toggleSet(brands, setBrands, value)}
            onSetPriceRange={setPriceRange}
            onSetDiscountTier={setDiscountTier}
            onClearAll={clearAll}
          />
        </div>

        {/* pr mirrors the rail (60px) plus the row gap (24px) so the grid sits
            symmetrically between the two page edges. */}
        <div className="min-w-0 flex-1 md:pr-[84px]">
          {beforeGrid}

          {/* Title and sort share this row — right-aligning the sort on its
              own line left ~1160px of dead space above the grid. It's the
              grid's header now, not the section's, so it sits directly above
              the grid rather than above whatever beforeGrid renders (the
              wishlist's category rail and AI picks). mt-4 only when
              beforeGrid is actually there to separate it from — without it,
              this is the column's first line, flush with the sidebar. */}
          <div
            className={cn(
              "flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3",
              beforeGrid && "mt-4",
            )}
          >
            <h1 className="text-lg font-bold text-ink">
              {title}{" "}
              <span className="font-normal text-muted">— {filtered.length} items</span>
            </h1>
            <SortDropdown options={SORTS} value={sort} onChange={setSort} />
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              No items match these filters.
            </p>
          ) : (
            <div
              className="mt-4 grid grid-cols-2 gap-x-4 gap-y-8 pb-10 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5"
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {filtered.map((item, idx) => (
                // 5% inset each side renders the card at 90% of its grid
                // track, widening the visual gutter. The hover surface lives
                // inside so it shrinks with the card rather than spanning the
                // full track.
                <div key={item.id} className="px-[5%]">
                <div
                  className="relative block p-2"
                  onMouseEnter={() => handleCardEnter(idx)}
                >
                  {/* The elevated white surface sits *behind* the card, so on
                      hover the description area reads as part of the card
                      instead of blending into the page. The shadow is dropped
                      while it travels between cards and eased back in on
                      arrival — it also keeps the shadow from being smeared by
                      the layout animation's transform. */}
                  <AnimatePresence>
                    {hoveredIndex === idx && (
                      <motion.span
                        layoutId="productHoverBackground"
                        transition={{ duration: TRAVEL_S, ease: [0.22, 1, 0.36, 1] }}
                        className={cn(
                          "absolute inset-0 z-10 block h-full w-full rounded-sm bg-surface",
                          settled
                            ? "shadow-[0_4px_16px_rgba(0,0,0,0.16)] transition-shadow duration-300 ease-out"
                            : "shadow-none transition-none",
                        )}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.12 } }}
                        exit={{ opacity: 0, transition: { duration: 0.12 } }}
                      />
                    )}
                  </AnimatePresence>
                  <CatalogProductCard
                    item={item}
                    onAddToWishlist={showAddToWishlist ? addToWishlist : undefined}
                    openCount={showOpenCount ? item.openCount : undefined}
                    submitOpenItem={submitOpenItem}
                    pickTier={pickTiers?.get(item.id)}
                    selection={
                      selection
                        ? {
                            selected: selection.selectedIds.has(item.id),
                            onToggle: () => selection.onToggle(item.id),
                          }
                        : undefined
                    }
                  />
                </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {footer}
    </div>
  );
}
