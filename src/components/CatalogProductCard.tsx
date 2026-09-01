"use client";

import { IconHeart } from "@tabler/icons-react";
import { openItem } from "@/app/actions";
import { AddToBagButton } from "@/components/AddToBagButton";
import { DirectionAwareHover } from "@/components/ui/direction-aware-hover";
import { reviewCountFor, formatReviewCount, discountPercent } from "@/lib/display";
import { TIER_BADGE_LABELS } from "@/lib/tierDisplay";
import type { TierName } from "@/lib/shortlist";
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
  pickTier,
  inBag,
}: {
  item: CatalogCardItem;
  onAddToWishlist?: (itemId: string) => void;
  /** When set the card becomes a tap-to-select tile (wishlist triage entry). */
  selection?: CardSelection;
  /** F2's revealed-preference signal, shown on the wishlist. */
  openCount?: number;
  /** Makes the whole card the "open this item" tap target that feeds F2. */
  submitOpenItem?: boolean;
  /** Set when the AI picked this item for the open category. */
  pickTier?: TierName;
  /** Omit entirely on surfaces with no bag (the public catalogue). */
  inBag?: boolean;
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

        {/* Which of the three the AI picked, on the item itself — the panel
            above says it in prose, but the picks were unfindable down here
            among sixty other cards. Sits top-right, except in selection mode
            where the checkmark owns that corner and this shifts left rather
            than stacking on top of it. */}
        {pickTier && (
          <span
            className={cn(
              "pointer-events-none absolute top-2 z-40 max-w-[calc(100%-1rem)] truncate rounded-sm bg-brand px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-sm",
              selection ? "left-2" : "right-2",
            )}
          >
            {TIER_BADGE_LABELS[pickTier]}
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
    // No bag button here on purpose: the whole card is the select target, and
    // a button inside a button is invalid HTML with unreliable keyboard
    // behaviour — the same reason the wishlist button above is gated on
    // `!selection`.
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

  // Reveals on hover over the bottom of the image, the same move the
  // catalogue's "Add to Wishlist" makes — and the same one Myntra makes.
  //
  // Two things force it to be an overlay positioned from the card root rather
  // than a child of the image like that button is. It has to sit above the
  // grid's hover surface, which is absolute z-10 and otherwise paints straight
  // over anything that isn't stacked (that's what made this button vanish on
  // hover). And below, `body` is wrapped in a submit button, so nesting a
  // second button inside it would be invalid HTML — as a sibling it also can't
  // accidentally submit the open-item form.
  //
  // The box mirrors the image's own aspect-[3/4], so "bottom" here means the
  // bottom of the photo rather than the bottom of the card. translate-y-full
  // parks it outside that box, where overflow-hidden clips it away entirely —
  // invisible and unclickable until hovered, without needing a
  // pointer-events dance.
  const bagOverlay =
    inBag === undefined ? null : (
      <div className="pointer-events-none absolute inset-x-0 top-0 z-30 aspect-[3/4] overflow-hidden rounded-t-sm">
        <div className="absolute inset-x-0 bottom-0 translate-y-full p-2 opacity-0 transition-all duration-200 group-hover/card:translate-y-0 group-hover/card:opacity-100">
          <AddToBagButton
            itemId={item.id}
            inBag={inBag}
            source="wishlist"
            full
            className="pointer-events-auto"
          />
        </div>
      </div>
    );

  if (submitOpenItem) {
    return (
      <div className="group/card relative">
        <form action={openItem}>
          <input type="hidden" name="itemId" value={item.id} />
          {/* The whole card is the "open this item" tap target (F2's revealed-
              preference signal, edge_case.md EC4). */}
          <button type="submit" className="block w-full text-left">
            {body}
          </button>
        </form>
        {bagOverlay}
      </div>
    );
  }

  return (
    <div className="group/card relative">
      {body}
      {bagOverlay}
    </div>
  );
}
