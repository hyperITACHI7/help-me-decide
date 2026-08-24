"use client";

import { useState } from "react";
import { startTriageWithSelection } from "@/app/wishlist/decide/actions";
import { ProductCard, type ProductCardItem } from "@/components/ProductCard";

const MIN_SELECTION = 3;

export function WishlistGrid({ items }: { items: ProductCardItem[] }) {
  const [selecting, setSelecting] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function cancelSelecting() {
    setSelecting(false);
    setSelectedIds(new Set());
  }

  return (
    <div className="flex flex-1 flex-col">
      <main className="flex-1 px-3 py-4 pb-24">
        {selecting ? (
          <p className="mb-3 text-xs font-medium text-muted">
            Tap the items you&apos;re deciding between.
          </p>
        ) : null}
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
          {items.map((item) => (
            <ProductCard
              key={item.id}
              item={item}
              selection={
                selecting
                  ? {
                      selected: selectedIds.has(item.id),
                      onToggle: () => toggle(item.id),
                    }
                  : undefined
              }
            />
          ))}
        </div>
      </main>

      {/* F1: entry point visible on the wishlist without navigation, opt-in
          only (edge_case.md EC5 — never an interstitial that blocks browsing).
          Selection replaces "swipe the whole wishlist" as the way a shopper
          builds the candidate set — they pick exactly which items they're
          torn between first. */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        {!selecting ? (
          <button
            type="button"
            onClick={() => setSelecting(true)}
            className="block w-full rounded-lg bg-brand py-3 text-center text-sm font-bold text-white"
          >
            Help me decide
          </button>
        ) : (
          <form action={startTriageWithSelection} className="flex items-center gap-2">
            {Array.from(selectedIds).map((id) => (
              <input key={id} type="hidden" name="itemIds" value={id} />
            ))}
            <button
              type="button"
              onClick={cancelSelecting}
              className="rounded-lg border border-border px-4 py-3 text-sm font-semibold text-ink"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={selectedIds.size < MIN_SELECTION}
              className="flex-1 rounded-lg bg-brand py-3 text-center text-sm font-bold text-white disabled:opacity-40"
            >
              {selectedIds.size < MIN_SELECTION
                ? `Select at least ${MIN_SELECTION} (${selectedIds.size} picked)`
                : `Help me decide (${selectedIds.size} selected)`}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
