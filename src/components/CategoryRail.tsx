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
import { accentAt } from "@/lib/accents";

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
      // Deliberately un-accented: "View all" is the neutral default, and
      // colouring it would imply it is one category among the rest.
    },
    ...categories.map((category, i) => {
      const Icon = iconFor(category);
      const count = counts[category] ?? 0;
      const accent = accentAt(i);
      return {
        id: i + 1,
        name: category,
        designation: `${count} ${count === 1 ? "item" : "items"}`,
        icon: <Icon className="h-6 w-6" />,
        selected: active === category,
        onClick: () => onSelect(category),
        hoverClass: accent.circleHover,
        selectedClass: accent.circleSelected,
      };
    }),
  ];

  return (
    // No overflow on this box: the tooltip sits at -top-16 and is allowed to
    // overlap whatever is above the rail rather than having blank space
    // reserved for it. That rules out a horizontal scroller (overflow-x-auto
    // forces overflow-y to auto, which would clip it), so the rail wraps
    // instead — fine at any realistic category count.
    //
    // md:pl-14 clears the collapsed filter rail on the left, which the first
    // circle was otherwise sitting right up against.
    <nav
      aria-label="Wishlist categories"
      className="mb-2 flex flex-wrap items-center gap-x-8 gap-y-4 px-1 pt-2 pb-2 md:pl-14"
    >
      <AnimatedTooltip items={items} />
    </nav>
  );
}
