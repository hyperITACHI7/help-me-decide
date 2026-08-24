"use client";

import { useMemo, useState } from "react";
import { CatalogProductCard, type CatalogCardItem } from "@/components/CatalogProductCard";
import { discountPercent } from "@/lib/display";

type Item = CatalogCardItem & { category: string };

type PriceBand = "under1000" | "1000-2000" | "2000-3000" | "3000plus";
const PRICE_BANDS: { key: PriceBand; label: string; test: (p: number) => boolean }[] = [
  { key: "under1000", label: "Under Rs. 1,000", test: (p) => p < 1000 },
  { key: "1000-2000", label: "Rs. 1,000 - Rs. 2,000", test: (p) => p >= 1000 && p < 2000 },
  { key: "2000-3000", label: "Rs. 2,000 - Rs. 3,000", test: (p) => p >= 2000 && p < 3000 },
  { key: "3000plus", label: "Rs. 3,000 and above", test: (p) => p >= 3000 },
];

const DISCOUNT_TIERS = [10, 20, 30, 40, 50];

const SORTS = [
  { key: "recommended", label: "Recommended" },
  { key: "price-asc", label: "Price: Low to High" },
  { key: "price-desc", label: "Price: High to Low" },
  { key: "discount-desc", label: "Discount" },
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
  const [categories, setCategories] = useState<Set<string>>(new Set());
  const [brands, setBrands] = useState<Set<string>>(new Set());
  const [priceBand, setPriceBand] = useState<PriceBand | null>(null);
  const [discountTier, setDiscountTier] = useState<number | null>(null);
  const [sort, setSort] = useState<SortKey>("recommended");

  const categoryCounts = useMemo(() => countBy(items, (i) => i.category), [items]);
  const brandCounts = useMemo(() => countBy(items, (i) => i.brand), [items]);

  const filtered = useMemo(() => {
    let result = items.filter((item) => {
      if (categories.size > 0 && !categories.has(item.category)) return false;
      if (brands.size > 0 && !brands.has(item.brand)) return false;
      if (priceBand) {
        const band = PRICE_BANDS.find((b) => b.key === priceBand);
        if (band && !band.test(item.price)) return false;
      }
      if (discountTier !== null) {
        const pct = discountPercent(item.price, item.originalPrice) ?? 0;
        if (pct < discountTier) return false;
      }
      return true;
    });

    result = [...result];
    if (sort === "price-asc") result.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") result.sort((a, b) => b.price - a.price);
    else if (sort === "discount-desc") {
      result.sort(
        (a, b) =>
          (discountPercent(b.price, b.originalPrice) ?? 0) -
          (discountPercent(a.price, a.originalPrice) ?? 0)
      );
    }
    return result;
  }, [items, categories, brands, priceBand, discountTier, sort]);

  const anyFilterActive =
    categories.size > 0 || brands.size > 0 || priceBand !== null || discountTier !== null;

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
    setPriceBand(null);
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
        <aside className="w-full shrink-0 md:w-56">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wide text-ink">Filters</p>
            {anyFilterActive && (
              <button type="button" onClick={clearAll} className="text-xs font-semibold text-brand">
                Clear all
              </button>
            )}
          </div>

          <FilterSection title="Category">
            {[...categoryCounts.entries()].map(([category, count]) => (
              <FilterCheckbox
                key={category}
                label={category}
                count={count}
                checked={categories.has(category)}
                onChange={() => toggleSet(categories, setCategories, category)}
              />
            ))}
          </FilterSection>

          <FilterSection title="Brand">
            {[...brandCounts.entries()].map(([brand, count]) => (
              <FilterCheckbox
                key={brand}
                label={brand}
                count={count}
                checked={brands.has(brand)}
                onChange={() => toggleSet(brands, setBrands, brand)}
              />
            ))}
          </FilterSection>

          <FilterSection title="Price">
            {PRICE_BANDS.map((band) => (
              <FilterCheckbox
                key={band.key}
                label={band.label}
                checked={priceBand === band.key}
                onChange={() => setPriceBand(priceBand === band.key ? null : band.key)}
              />
            ))}
          </FilterSection>

          <FilterSection title="Discount range">
            {DISCOUNT_TIERS.map((tier) => (
              <FilterCheckbox
                key={tier}
                label={`${tier}% and above`}
                checked={discountTier === tier}
                onChange={() => setDiscountTier(discountTier === tier ? null : tier)}
              />
            ))}
          </FilterSection>
        </aside>

        <div className="flex-1">
          <div className="flex items-center gap-2 border-b border-border pb-3">
            <span className="text-xs font-semibold text-muted">Sort by:</span>
            <div className="flex flex-wrap gap-3">
              {SORTS.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => setSort(s.key)}
                  className={`text-xs font-semibold ${
                    sort === s.key ? "text-brand" : "text-ink"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              No items match these filters.
            </p>
          ) : (
            <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-6 sm:grid-cols-3 lg:grid-cols-4">
              {filtered.map((item) => (
                <CatalogProductCard key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 border-t border-border pt-3">
      <p className="text-xs font-bold uppercase tracking-wide text-ink">{title}</p>
      <div className="mt-2 space-y-2">{children}</div>
    </div>
  );
}

function FilterCheckbox({
  label,
  count,
  checked,
  onChange,
}: {
  label: string;
  count?: number;
  checked: boolean;
  onChange: () => void;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2 text-xs text-ink">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-3.5 w-3.5 accent-brand"
      />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && <span className="text-muted">({count})</span>}
    </label>
  );
}
