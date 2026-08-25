"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { CatalogProductCard, type CatalogCardItem } from "@/components/CatalogProductCard";
import { CatalogFilterSidebar } from "@/components/CatalogFilterSidebar";
import { SortDropdown } from "@/components/SortDropdown";
import { addToWishlist } from "@/app/actions";
import { discountPercent } from "@/lib/display";

type Item = CatalogCardItem & { category: string; openCount: number };

const DISCOUNT_TIERS = [10, 20, 30, 40, 50];
const PRICE_STEP = 100;

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

export function CatalogBrowser({ items }: { items: Item[] }) {
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
  }, [items, categories, brands, priceRange, priceBounds, discountTier, sort]);

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
      <p className="text-xs text-muted">
        Home <span className="mx-1">/</span> All items
      </p>
      <h1 className="mt-1 text-lg font-bold text-ink">
        All items <span className="font-normal text-muted">— {filtered.length} items</span>
      </h1>

      <div className="mt-4 flex flex-col gap-6 md:flex-row">
        <div className="shrink-0">
          <CatalogFilterSidebar
            categoryCounts={[...categoryCounts.entries()]}
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

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-end border-b border-border pb-3">
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
                <div
                  key={item.id}
                  className="relative block p-2"
                  onMouseEnter={() => setHoveredIndex(idx)}
                >
                  {/* The elevated white surface sits *behind* the card, so on
                      hover the description area reads as part of the card
                      instead of blending into the page. */}
                  <AnimatePresence>
                    {hoveredIndex === idx && (
                      <motion.span
                        layoutId="productHoverBackground"
                        className="absolute inset-0 z-10 block h-full w-full rounded-sm bg-surface shadow-[0_4px_16px_rgba(0,0,0,0.16)]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1, transition: { duration: 0.15 } }}
                        exit={{ opacity: 0, transition: { duration: 0.15, delay: 0.2 } }}
                      />
                    )}
                  </AnimatePresence>
                  <CatalogProductCard item={item} onAddToWishlist={addToWishlist} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
