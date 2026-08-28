"use client";

import { useState } from "react";
import {
  IconBuildingStore,
  IconCategory,
  IconDiscount2,
  IconFilter,
  IconTag,
} from "@tabler/icons-react";
import { Sidebar, SidebarBody, useSidebar } from "@/components/ui/sidebar";
import { PriceRangeSlider } from "@/components/PriceRangeSlider";
import { cn } from "@/lib/utils";

type FilterPanelProps = {
  categoryCounts: [string, number][];
  brandCounts: [string, number][];
  priceBounds: [number, number];
  priceRange: [number, number];
  discountTiers: number[];
  categories: Set<string>;
  brands: Set<string>;
  discountTier: number | null;
  anyFilterActive: boolean;
  onToggleCategory: (value: string) => void;
  onToggleBrand: (value: string) => void;
  onSetPriceRange: (value: [number, number]) => void;
  onSetDiscountTier: (value: number | null) => void;
  onClearAll: () => void;
};

export function CatalogFilterSidebar(props: FilterPanelProps) {
  const [open, setOpen] = useState(false);

  return (
    <Sidebar open={open} setOpen={setOpen}>
      <SidebarBody
        // The vendored sidebar only opens on hover; opening on focus too keeps
        // the filters reachable by keyboard.
        onFocusCapture={() => setOpen(true)}
        // Absolutely positioned on desktop so expanding floats the panel over
        // the catalogue instead of reflowing it — the row only ever reserves
        // the collapsed rail's width.
        className="h-fit gap-4 rounded-2xl border border-border bg-surface md:absolute md:left-0 md:top-0 md:z-30 md:max-h-[calc(100vh-8rem)] md:overflow-y-auto md:overflow-x-hidden md:shadow-lg"
      >
        <FilterPanel {...props} />
      </SidebarBody>
    </Sidebar>
  );
}

function FilterPanel({
  categoryCounts,
  brandCounts,
  priceBounds,
  priceRange,
  discountTiers,
  categories,
  brands,
  discountTier,
  anyFilterActive,
  onToggleCategory,
  onToggleBrand,
  onSetPriceRange,
  onSetDiscountTier,
  onClearAll,
}: FilterPanelProps) {
  const { open } = useSidebar();

  const priceNarrowed =
    priceRange[0] > priceBounds[0] || priceRange[1] < priceBounds[1];
  const activeCount =
    categories.size +
    brands.size +
    (priceNarrowed ? 1 : 0) +
    (discountTier !== null ? 1 : 0);

  return (
    <div className="flex w-full min-w-0 flex-col">
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <span className="relative shrink-0">
            <IconFilter className="h-5 w-5 text-ink" />
            {!open && activeCount > 0 && (
              <span className="absolute -right-1.5 -top-1.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {activeCount}
              </span>
            )}
          </span>
          <Reveal className="text-sm font-bold uppercase tracking-wide text-ink">
            Filters
          </Reveal>
        </div>
        {open && anyFilterActive && (
          <button
            type="button"
            onClick={onClearAll}
            className="shrink-0 whitespace-nowrap text-xs font-semibold text-brand"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Empty when the caller owns the category control (the wishlist rail) —
          render nothing rather than a headed section with no options. */}
      {categoryCounts.length > 0 && (
        <FilterSection
          title="Category"
          icon={<IconCategory className="h-5 w-5 shrink-0 text-muted" />}
        >
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
      )}

      <FilterSection
        title="Brand"
        icon={<IconBuildingStore className="h-5 w-5 shrink-0 text-muted" />}
      >
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

      <FilterSection
        title="Price"
        icon={<IconTag className="h-5 w-5 shrink-0 text-muted" />}
      >
        <PriceRangeSlider
          min={priceBounds[0]}
          max={priceBounds[1]}
          value={priceRange}
          onChange={onSetPriceRange}
        />
      </FilterSection>

      <FilterSection
        title="Discount range"
        icon={<IconDiscount2 className="h-5 w-5 shrink-0 text-muted" />}
      >
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
  );
}

/** Text that fades/collapses away with the rail, mirroring SidebarLink. */
function Reveal({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  const { open, animate } = useSidebar();
  return (
    <span
      className={cn(
        "truncate whitespace-pre transition-opacity duration-200",
        !animate || open ? "inline-block opacity-100" : "hidden opacity-0",
        className,
      )}
    >
      {children}
    </span>
  );
}

function FilterSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  const { open, animate } = useSidebar();
  return (
    <div className="mt-4 border-t border-border pt-3">
      <div className="flex items-center gap-2">
        {icon}
        <Reveal className="text-xs font-bold uppercase tracking-wide text-ink">
          {title}
        </Reveal>
      </div>
      <div
        className={cn(
          "mt-2 space-y-2 transition-opacity duration-200",
          !animate || open ? "block opacity-100" : "hidden opacity-0",
        )}
      >
        {children}
      </div>
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
        className="h-3.5 w-3.5 shrink-0 accent-brand"
      />
      <span className="flex-1 truncate">{label}</span>
      {count !== undefined && <span className="text-muted">({count})</span>}
    </label>
  );
}
