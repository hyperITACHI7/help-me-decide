"use client";

import { IconHeart } from "@tabler/icons-react";
import { openItem } from "@/app/actions";
import { DirectionAwareHover } from "@/components/ui/direction-aware-hover";
import { reviewCountFor, formatReviewCount, discountPercent } from "@/lib/display";
import { cn } from "@/lib/utils";

export type CatalogCardItem = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: number;
  originalPrice: number | null;
  rating: number;
};

/**
 * Mirrors Myntra's real listing-page card: portrait image with the rating +
 * review count overlaid bottom-left, then brand / name / price-strike-discount
 * stacked underneath.
 */
export type CardSelection = {
  selected: boolean;
  onToggle: () => void;
};

export function CatalogProductCard({
  item,
  onAddToWishlist,
  selection,
  openCount,
  submitOpenItem = false,
}: {
  item: CatalogCardItem;
  onAddToWishlist?: (itemId: string) => void;
  /** When set the card becomes a tap-to-select tile (wishlist triage entry). */
  selection?: CardSelection;
  /** F2's revealed-preference signal, shown on the wishlist. */
  openCount?: number;
  /** Makes the whole card the "open this item" tap target that feeds F2. */
  submitOpenItem?: boolean;
}) {
  const pct = discountPercent(item.price, item.originalPrice);
  const reviews = reviewCountFor(item.id);

  const body = (
    <div className="group/product relative z-20 h-full">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-t-sm">
        <DirectionAwareHover
          imageUrl={item.imageUrl}
          imageAlt={item.name}
          className="h-full w-full rounded-none"
          imageClassName="object-cover"
        />

        {/* Overlaid on the image, bottom-left. Hidden on hover because the
            wishlist bar takes over that strip — same swap Myntra does. */}
        {item.rating > 0 && (
          <span className="pointer-events-none absolute bottom-2 left-2 z-40 flex items-center gap-1 rounded-sm bg-surface px-1.5 py-0.5 text-[11px] font-semibold text-ink shadow-sm transition-opacity duration-200 group-hover/product:opacity-0">
            {item.rating.toFixed(1)}
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-2.5 w-2.5 text-rating">
              <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
            </svg>
            <span className="font-normal text-muted">| {formatReviewCount(reviews)}</span>
          </span>
        )}

        {selection && (
          <span
            className={cn(
              "absolute right-2 top-2 z-40 flex h-6 w-6 items-center justify-center rounded-full border-2 text-xs font-bold shadow-sm",
              selection.selected
                ? "border-brand bg-brand text-white"
                : "border-border bg-surface/90 text-transparent",
            )}
          >
            ✓
          </span>
        )}

        {openCount !== undefined && !selection && (
          <span className="pointer-events-none absolute bottom-2 right-2 z-40 inline-flex items-center rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium text-white transition-opacity duration-200 group-hover/product:opacity-0">
            opened {openCount}×
          </span>
        )}

        {/* Pops up over the image, not below it. CSS-driven so it stays
            reliable regardless of the image's motion variants. Suppressed in
            selection mode, where the whole card is the tap target. */}
        {onAddToWishlist && !selection && (
          <div className="absolute inset-x-0 bottom-0 z-30 translate-y-full p-2 opacity-0 transition-all duration-200 group-hover/product:translate-y-0 group-hover/product:opacity-100">
            <button
              type="button"
              onClick={() => onAddToWishlist(item.id)}
              className="flex w-full items-center justify-center gap-1.5 rounded-sm border border-border bg-surface py-2 text-xs font-bold uppercase tracking-wide text-ink shadow-sm transition hover:border-brand hover:text-brand"
            >
              <IconHeart className="h-4 w-4" />
              Add to Wishlist
            </button>
          </div>
        )}
      </div>

      <div className="px-2 pb-3 pt-2">
        <p className="truncate text-sm font-bold text-ink">{item.brand}</p>
        <p className="truncate text-xs text-muted">{item.name}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
          <span className="text-sm font-bold text-ink">Rs. {item.price}</span>
          {item.originalPrice && (
            <span className="text-xs text-muted line-through">Rs. {item.originalPrice}</span>
          )}
          {pct !== null && (
            <span className="text-xs font-semibold text-discount">({pct}% OFF)</span>
          )}
        </div>
      </div>
    </div>
  );

  if (selection) {
    return (
      <button
        type="button"
        onClick={selection.onToggle}
        aria-pressed={selection.selected}
        className={cn(
          "block w-full rounded-sm text-left ring-2",
          selection.selected ? "ring-brand" : "ring-transparent",
        )}
      >
        {body}
      </button>
    );
  }

  if (submitOpenItem) {
    return (
      <form action={openItem}>
        <input type="hidden" name="itemId" value={item.id} />
        {/* The whole card is the "open this item" tap target (F2's revealed-
            preference signal, edge_case.md EC4). */}
        <button type="submit" className="block w-full text-left">
          {body}
        </button>
      </form>
    );
  }

  return body;
}
