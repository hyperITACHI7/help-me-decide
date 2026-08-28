"use client";

import {
  IconHanger,
  IconJacket,
  IconLayoutGrid,
  IconShirt,
  IconShirtSport,
  IconShoe,
} from "@tabler/icons-react";
import {
  AnimatedTooltip,
  type AnimatedTooltipItem,
} from "@/components/ui/animated-tooltip";

function iconFor(category: string) {
  const key = category.toLowerCase();
  if (key.includes("shoe") || key.includes("sneaker")) return IconShoe;
  if (key.includes("tshirt") || key.includes("t-shirt")) return IconShirtSport;
  if (key.includes("shirt")) return IconShirt;
  if (key.includes("jacket") || key.includes("coat")) return IconJacket;
  return IconHanger;
}

/** Only categories actually present in the wishlist are ever rendered. */
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

  const items: AnimatedTooltipItem[] = [
    {
      id: 0,
      name: "View all",
      designation: `${total} items`,
      icon: <IconLayoutGrid className="h-6 w-6" />,
      selected: active === null,
      onClick: () => onSelect(null),
    },
    ...categories.map((category, i) => {
      const Icon = iconFor(category);
      const count = counts[category] ?? 0;
      return {
        id: i + 1,
        name: category,
        designation: `${count} ${count === 1 ? "item" : "items"}`,
        icon: <Icon className="h-6 w-6" />,
        selected: active === category,
        onClick: () => onSelect(category),
      };
    }),
  ];

  return (
    // overflow-x-auto forces overflow-y to auto, so the tooltip is clipped by
    // this box rather than escaping it. pt-24 reserves the room it needs: the
    // tooltip sits at -top-16, and the cursor-tracked tilt swings its corners
    // ~15px higher still (measured at 16px headroom under pt-20, which was
    // cutting it fine).
    <nav
      aria-label="Wishlist categories"
      className="no-scrollbar mb-2 flex items-center gap-8 overflow-x-auto px-1 pt-24 pb-2"
    >
      <AnimatedTooltip items={items} />
    </nav>
  );
}
