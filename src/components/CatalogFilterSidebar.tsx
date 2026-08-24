"use client";

import { Sidebar, SidebarBody } from "@/components/ui/sidebar";

export type PriceBand = "under1000" | "1000-2000" | "2000-3000" | "3000plus";

export function CatalogFilterSidebar({
  categoryCounts,
  brandCounts,
  priceBands,
  discountTiers,
  categories,
  brands,
  priceBand,
  discountTier,
  anyFilterActive,
  onToggleCategory,
  onToggleBrand,
  onSetPriceBand,
  onSetDiscountTier,
  onClearAll,
}: {
  categoryCounts: [string, number][];
  brandCounts: [string, number][];
  priceBands: { key: PriceBand; label: string }[];
  discountTiers: number[];
  categories: Set<string>;
  brands: Set<string>;
  priceBand: PriceBand | null;
  discountTier: number | null;
  anyFilterActive: boolean;
  onToggleCategory: (value: string) => void;
  onToggleBrand: (value: string) => void;
  onSetPriceBand: (value: PriceBand | null) => void;
  onSetDiscountTier: (value: number | null) => void;
  onClearAll: () => void;
}) {
  return (
    // Filters need to stay legible at all times, so the sidebar is pinned
    // open (no hover-collapse-to-icon) on desktop — only the mobile variant's
    // tap-to-reveal slide-in is animated here.
    <Sidebar animate={false}>
      <SidebarBody className="h-fit gap-4 rounded-2xl border border-border bg-surface md:sticky md:top-20 md:max-h-[calc(100vh-6rem)] md:overflow-y-auto">
        <div className="flex w-full flex-col">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold uppercase tracking-wide text-ink">Filters</p>
            {anyFilterActive && (
              <button type="button" onClick={onClearAll} className="text-xs font-semibold text-brand">
                Clear all
              </button>
            )}
          </div>

          <FilterSection title="Category">
            {categoryCounts.map(([category, count]) => (
              <FilterCheckbox
                key={category}
                label={category}
                count={count}
                checked={categories.has(category)}
                onChange={() => onToggleCategory(category)}
              />
            ))}
          </FilterSection>

          <FilterSection title="Brand">
            {brandCounts.map(([brand, count]) => (
              <FilterCheckbox
                key={brand}
                label={brand}
                count={count}
                checked={brands.has(brand)}
                onChange={() => onToggleBrand(brand)}
              />
            ))}
          </FilterSection>

          <FilterSection title="Price">
            {priceBands.map((band) => (
              <FilterCheckbox
                key={band.key}
                label={band.label}
                checked={priceBand === band.key}
                onChange={() => onSetPriceBand(priceBand === band.key ? null : band.key)}
              />
            ))}
          </FilterSection>

          <FilterSection title="Discount range">
            {discountTiers.map((tier) => (
              <FilterCheckbox
                key={tier}
                label={`${tier}% and above`}
                checked={discountTier === tier}
                onChange={() => onSetDiscountTier(discountTier === tier ? null : tier)}
              />
            ))}
          </FilterSection>
        </div>
      </SidebarBody>
    </Sidebar>
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
