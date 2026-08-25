"use client";

import { useState } from "react";
import { startTriageWithSelection } from "@/app/wishlist/decide/actions";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import type { CatalogCardItem } from "@/components/CatalogProductCard";

const MIN_SELECTION = 3;

export type WishlistItem = CatalogCardItem & {
  category: string;
  openCount: number;
};

export function WishlistGrid({ items }: { items: WishlistItem[] }) {
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
    <CatalogBrowser
      items={items}
      title="Wishlist"
      breadcrumb="Wishlist"
      showOpenCount
      // "Add to Wishlist" is meaningless on the wishlist itself; opening an
      // item is what feeds F2 here.
      showAddToWishlist={false}
      submitOpenItem={!selecting}
      selection={
        selecting ? { selectedIds, onToggle: toggle } : undefined
      }
      footer={
        /* F1: entry point visible on the wishlist without navigation, opt-in
           only (edge_case.md EC5 — never an interstitial that blocks
           browsing). Selection is how a shopper builds the candidate set. */
        <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
          {!selecting ? (
            <button
              type="button"
              onClick={() => setSelecting(true)}
              className="mx-auto block w-full max-w-md rounded-lg bg-brand py-3 text-center text-sm font-bold text-white"
            >
              Help me decide
            </button>
          ) : (
            <form
              action={startTriageWithSelection}
              className="mx-auto flex max-w-md items-center gap-2"
            >
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
      }
    />
  );
}
