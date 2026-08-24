import { reviewCountFor, formatReviewCount, discountPercent } from "@/lib/display";

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
 * Matches Myntra's real listing-page card layout (myntra.com/shirts) —
 * rating + review count as text above the brand, not a badge on the image,
 * which is the one real structural difference from ProductCard's app-style
 * card used on /wishlist.
 */
export function CatalogProductCard({ item }: { item: CatalogCardItem }) {
  const pct = discountPercent(item.price, item.originalPrice);
  const reviews = reviewCountFor(item.id);

  return (
    <div className="group">
      <div className="relative aspect-[3/4] w-full overflow-hidden rounded-sm bg-canvas">
        {/* eslint-disable-next-line @next/next/no-img-element -- local SVG data URI */}
        <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
      </div>
      <div className="pt-2">
        {item.rating > 0 && (
          <p className="flex items-center gap-1 text-xs text-muted">
            <span className="inline-flex items-center gap-0.5 rounded-sm bg-rating px-1 py-0.5 text-[11px] font-semibold text-white">
              {item.rating.toFixed(1)}
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-2.5 w-2.5">
                <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
              </svg>
            </span>
            <span>|</span>
            <span>{formatReviewCount(reviews)}</span>
          </p>
        )}
        <p className="mt-1 truncate text-sm font-bold text-ink">{item.brand}</p>
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
}
