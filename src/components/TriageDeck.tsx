"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { decideItem } from "@/app/wishlist/decide/actions";
import { SwipeCardStack } from "@/components/SwipeCardStack";
import { ProductImage } from "@/components/ProductImage";

export type TriageItem = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  category: string;
};

function TriageCardVisual({ item }: { item: TriageItem }) {
  const discountPct =
    item.originalPrice && item.originalPrice > item.price
      ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
      : null;

  return (
    <div className="w-full max-w-xs overflow-hidden rounded-2xl bg-surface shadow-lg">
      <div className="relative aspect-[3/4] w-full bg-canvas">
        <ProductImage
          src={item.imageUrl}
          alt={item.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
        <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-surface/95 px-1.5 py-0.5 text-xs font-semibold text-ink shadow-sm">
          {item.rating.toFixed(1)}
          <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-rating">
            <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
          </svg>
        </span>
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-bold text-ink">{item.brand}</p>
        <p className="truncate text-xs text-muted">{item.name}</p>
        <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
          <span className="text-sm font-bold text-ink">₹{item.price}</span>
          {item.originalPrice && (
            <span className="text-xs text-muted line-through">₹{item.originalPrice}</span>
          )}
          {discountPct !== null && (
            <span className="text-xs font-semibold text-discount">{discountPct}% OFF</span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TriageDeck({
  items,
  candidateIds,
  initialDecidedCount,
  initialKeptCount,
  totalItems,
}: {
  items: TriageItem[];
  candidateIds: string[];
  initialDecidedCount: number;
  initialKeptCount: number;
  totalItems: number;
}) {
  const router = useRouter();
  const [queue, setQueue] = useState(items);
  const [decidedCount, setDecidedCount] = useState(initialDecidedCount);
  const [keptCount, setKeptCount] = useState(initialKeptCount);
  const [pending, setPending] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const current = queue[0];

  async function commit(direction: "keep" | "discard") {
    if (!current || pending) return;
    setPending(true);
    setBanner(null);
    try {
      const result = await decideItem(current.id, direction, candidateIds);
      setKeptCount(result.keptCount);
      setDecidedCount(result.decidedCount);
      if (result.forced) {
        setBanner("Keeping this one — need at least 3 to compare.");
      }
      setQueue((q) => q.slice(1));
      if (result.decidedCount >= totalItems) {
        router.push("/wishlist/decide/summary");
      }
    } finally {
      setPending(false);
    }
  }

  if (!current) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">Finishing up…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-4">
      <div className="mb-3">
        <p className="text-xs font-medium text-muted">
          {decidedCount} of {totalItems} · keeping {keptCount}
        </p>
        <div className="mt-1 h-1 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full rounded-full bg-brand transition-all"
            style={{ width: `${(decidedCount / totalItems) * 100}%` }}
          />
        </div>
      </div>

      {banner && (
        <div className="mb-3 rounded-lg bg-brand-soft px-3 py-2 text-xs font-medium text-brand-dark">
          {banner}
        </div>
      )}

      <div className="flex flex-1 items-center justify-center">
        <SwipeCardStack
          queue={queue}
          disabled={pending}
          leftLabel="SKIP"
          rightLabel="KEEP"
          onSwipeLeft={() => void commit("discard")}
          onSwipeRight={() => void commit("keep")}
          renderCard={(item) => <TriageCardVisual item={item} />}
          describeItem={(item) => `${item.brand} ${item.name}, ₹${item.price}`}
        />
      </div>

      {/* EC11 (edge_case.md): equally prominent, non-hidden fallback for
          non-touch input (mentor's laptop trackpad, no drag support). */}
      <div className="mt-4 flex justify-center gap-4 pb-2">
        <button
          type="button"
          disabled={pending}
          onClick={() => void commit("discard")}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border bg-surface text-2xl text-muted shadow-sm disabled:opacity-50"
          aria-label="Skip this item"
        >
          ✕
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() => void commit("keep")}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl text-white shadow-sm disabled:opacity-50"
          aria-label="Keep this item"
        >
          ♥
        </button>
      </div>
    </div>
  );
}
