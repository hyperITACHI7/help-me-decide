"use client";

import {
  IconHanger,
  IconJacket,
  IconLayoutGrid,
  IconShirt,
  IconShirtSport,
  IconShoe,
} from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/** Only categories actually present in the wishlist are ever rendered. */
function iconFor(category: string) {
  const key = category.toLowerCase();
  if (key.includes("shoe") || key.includes("sneaker")) return IconShoe;
  if (key.includes("tshirt") || key.includes("t-shirt")) return IconShirtSport;
  if (key.includes("shirt")) return IconShirt;
  if (key.includes("jacket") || key.includes("coat")) return IconJacket;
  if (key.includes("trouser") || key.includes("pant") || key.includes("jean"))
    return IconHanger;
  return IconHanger;
}

export function CategoryRail({
  categories,
  active,
  counts,
  onSelect,
}: {
  categories: string[];
  /** null = "View all", the deliberately AI-free default view. */
  active: string | null;
  counts: Record<string, number>;
  onSelect: (category: string | null) => void;
}) {
  const total = Object.values(counts).reduce((sum, n) => sum + n, 0);

  return (
    <nav
      aria-label="Wishlist categories"
      className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
    >
      <RailButton
        icon={<IconLayoutGrid className="h-5 w-5" />}
        label="View all"
        count={total}
        selected={active === null}
        onClick={() => onSelect(null)}
      />
      {categories.map((category) => {
        const Icon = iconFor(category);
        return (
          <RailButton
            key={category}
            icon={<Icon className="h-5 w-5" />}
            label={category}
            count={counts[category] ?? 0}
            selected={active === category}
            onClick={() => onSelect(category)}
          />
        );
      })}
    </nav>
  );
}

function RailButton({
  icon,
  label,
  count,
  selected,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  count: number;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "flex shrink-0 flex-col items-center gap-1 rounded-xl border px-4 py-2.5 transition-colors",
        selected
          ? "border-brand bg-brand-soft text-brand-dark"
          : "border-border bg-surface text-ink hover:border-brand"
      )}
    >
      {icon}
      <span className="whitespace-nowrap text-[11px] font-bold uppercase tracking-wide">
        {label}
      </span>
      <span className="text-[10px] font-medium text-muted">{count}</span>
    </button>
  );
}
