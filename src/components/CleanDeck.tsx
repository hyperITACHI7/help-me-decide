"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { removeWishlistItem } from "@/app/wishlist/clean/actions";
import { SwipeCardStack } from "@/components/SwipeCardStack";

export type CleanItem = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: number;
  originalPrice: number | null;
  rating: number;
};

function CleanCardVisual({ item }: { item: CleanItem }) {
  const discountPct =
    item.originalPrice && item.originalPrice > item.price
      ? Math.round(((item.originalPrice - item.price) / item.originalPrice) * 100)
      : null;

  return (
    <div className="w-full max-w-xs overflow-hidden rounded-2xl bg-surface shadow-lg">
      <div className="relative aspect-[3/4] w-full bg-canvas">
        {/* eslint-disable-next-line @next/next/no-img-element -- local SVG data URI */}
        <img
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

/**
 * Same swipe mechanic as triage, different verbs: right keeps the item on the
 * wishlist, left deletes it.
 */
export function CleanDeck({ items }: { items: CleanItem[] }) {
  const router = useRouter();
  const [queue, setQueue] = useState<CleanItem[]>(items);
  const [kept, setKept] = useState(0);
  const [removed, setRemoved] = useState(0);
  const [busy, setBusy] = useState(false);
  const [banner, setBanner] = useState<string | null>(null);

  const total = items.length;
  const done = total - queue.length;
  const current = queue[0];

  function advance() {
    setQueue((prev) => prev.slice(1));
  }

  function keep() {
    setKept((n) => n + 1);
    setBanner(null);
    advance();
  }

  async function remove(item: CleanItem) {
    setBusy(true);
    const result = await removeWishlistItem(item.id);
    setBusy(false);

    if (result.ok && result.deleted) {
      setRemoved((n) => n + 1);
      setBanner(null);
    } else if (result.ok && !result.deleted) {
      setBanner(
        `${item.brand} is on a live share link, so it stayed on your wishlist. Close that link first.`,
      );
    } else {
      setBanner("Couldn't remove that one — please try again.");
    }
    advance();
    router.refresh();
  }

  if (!current) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
        <h1 className="text-lg font-bold text-ink">Wishlist cleaned</h1>
        <p className="mt-2 text-sm text-muted">
          Kept {kept}, removed {removed}.
        </p>
        {banner && <p className="mt-2 max-w-xs text-xs text-warning">{banner}</p>}
        <Link
          href="/wishlist"
          className="mt-6 rounded-lg bg-brand px-6 py-3 text-sm font-bold text-white"
        >
          Back to wishlist
        </Link>
      </main>
    );
  }

  return (
    <main className="flex flex-1 flex-col px-4 py-4">
      <div className="mx-auto w-full max-w-xs">
        <p className="text-xs font-medium text-muted">
          {done} of {total} · kept {kept} · removed {removed}
        </p>
        <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border">
          <div
            className="h-full bg-brand transition-all"
            style={{ width: `${total === 0 ? 0 : (done / total) * 100}%` }}
          />
        </div>
        {banner && <p className="mt-3 text-xs text-warning">{banner}</p>}
      </div>

      <SwipeCardStack
        queue={queue}
        disabled={busy}
        leftLabel="DELETE"
        rightLabel="KEEP"
        onSwipeLeft={(item) => void remove(item)}
        onSwipeRight={keep}
        renderCard={(item) => <CleanCardVisual item={item} />}
        describeItem={(item) => `${item.brand} ${item.name}, ₹${item.price}`}
      />

      <div className="mx-auto mt-4 flex w-full max-w-xs items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => current && void remove(current)}
          disabled={busy}
          aria-label="Delete this item"
          className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-surface text-xl text-ink shadow-sm disabled:opacity-40"
        >
          🗑
        </button>
        <button
          type="button"
          onClick={keep}
          disabled={busy}
          aria-label="Keep this item"
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-xl text-white shadow-sm disabled:opacity-40"
        >
          ♥
        </button>
      </div>

      <Link
        href="/wishlist"
        className="mx-auto mt-6 text-xs font-semibold text-muted underline"
      >
        Done cleaning
      </Link>
    </main>
  );
}
