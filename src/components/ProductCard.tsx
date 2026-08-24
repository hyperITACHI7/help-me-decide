import { openItem } from "@/app/actions";

export type ProductCardItem = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  openCount: number;
};

export function ProductCard({ item }: { item: ProductCardItem }) {
  const discountPct =
    item.originalPrice && item.originalPrice > item.price
      ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
      : null;

  return (
    <form action={openItem}>
      <input type="hidden" name="itemId" value={item.id} />
      {/* The whole card is the "open this item" tap target (F2's revealed-
          preference signal, edge_case.md EC4) — a real in-app action, not a
          dead counter. */}
      <button type="submit" className="block w-full text-left">
        <div className="overflow-hidden rounded-lg bg-surface">
          <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-canvas">
            {/* eslint-disable-next-line @next/next/no-img-element -- local SVG
                data URIs, not a remote asset next/image needs to optimize */}
            <img
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-surface/95 px-1.5 py-0.5 text-xs font-semibold text-ink shadow-sm">
              {item.rating.toFixed(1)}
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-rating">
                <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
              </svg>
            </span>
            <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 rounded bg-ink/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
              opened {item.openCount}×
            </span>
          </div>

          <div className="pt-2">
            <p className="truncate text-sm font-bold text-ink">{item.brand}</p>
            <p className="truncate text-xs text-muted">{item.name}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
              <span className="text-sm font-bold text-ink">₹{item.price}</span>
              {item.originalPrice && (
                <span className="text-xs text-muted line-through">
                  ₹{item.originalPrice}
                </span>
              )}
              {discountPct !== null && (
                <span className="text-xs font-semibold text-discount">
                  {discountPct}% OFF
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    </form>
  );
}
