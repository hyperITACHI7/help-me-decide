"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { decideItem } from "@/app/wishlist/decide/actions";

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

export function TriageDeck({
  items,
  initialDecidedCount,
  initialKeptCount,
  totalItems,
}: {
  items: TriageItem[];
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
  const [dragX, setDragX] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);

  const current = queue[0];

  async function commit(direction: "keep" | "discard") {
    if (!current || pending) return;
    setPending(true);
    setBanner(null);
    try {
      const result = await decideItem(current.id, direction);
      setKeptCount(result.keptCount);
      setDecidedCount(result.decidedCount);
      if (result.forced) {
        setBanner("Keeping this one — need at least 3 to compare.");
      }
      setQueue((q) => q.slice(1));
      setDragX(0);
      if (result.decidedCount >= totalItems) {
        router.push("/wishlist/decide/summary");
      }
    } finally {
      setPending(false);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (pending) return;
    dragging.current = true;
    startX.current = e.clientX;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setDragX(e.clientX - startX.current);
  }
  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    const threshold = 90;
    if (dragX > threshold) {
      void commit("keep");
    } else if (dragX < -threshold) {
      void commit("discard");
    } else {
      setDragX(0);
    }
  }

  if (!current) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <p className="text-sm text-muted">Finishing up…</p>
      </div>
    );
  }

  const discountPct =
    current.originalPrice && current.originalPrice > current.price
      ? Math.round(
          ((current.originalPrice - current.price) / current.originalPrice) * 100
        )
      : null;

  const tilt = Math.max(-12, Math.min(12, dragX / 12));

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
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{
            transform: `translateX(${dragX}px) rotate(${tilt}deg)`,
            touchAction: "pan-y",
          }}
          className="relative w-full max-w-xs cursor-grab select-none overflow-hidden rounded-2xl bg-surface shadow-lg active:cursor-grabbing"
        >
          <div className="relative aspect-[3/4] w-full bg-canvas">
            {/* eslint-disable-next-line @next/next/no-img-element -- local SVG data URI */}
            <img
              src={current.imageUrl}
              alt={current.name}
              className="h-full w-full object-cover"
              draggable={false}
            />
            <span className="absolute bottom-2 left-2 inline-flex items-center gap-1 rounded bg-surface/95 px-1.5 py-0.5 text-xs font-semibold text-ink shadow-sm">
              {current.rating.toFixed(1)}
              <svg viewBox="0 0 20 20" fill="currentColor" className="h-3 w-3 text-rating">
                <path d="M10 1.5l2.6 5.6 6.1.6-4.6 4.1 1.3 6-5.4-3.1-5.4 3.1 1.3-6-4.6-4.1 6.1-.6z" />
              </svg>
            </span>
            {dragX > 40 && (
              <span className="absolute right-3 top-3 rounded border-2 border-discount px-2 py-1 text-sm font-extrabold text-discount">
                KEEP
              </span>
            )}
            {dragX < -40 && (
              <span className="absolute left-3 top-3 rounded border-2 border-brand px-2 py-1 text-sm font-extrabold text-brand">
                SKIP
              </span>
            )}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-bold text-ink">{current.brand}</p>
            <p className="truncate text-xs text-muted">{current.name}</p>
            <div className="mt-1 flex flex-wrap items-baseline gap-1.5">
              <span className="text-sm font-bold text-ink">₹{current.price}</span>
              {current.originalPrice && (
                <span className="text-xs text-muted line-through">
                  ₹{current.originalPrice}
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
