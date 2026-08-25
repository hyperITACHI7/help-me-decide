"use client";

import { useState } from "react";
import { startTriageWithSelection } from "@/app/wishlist/decide/actions";
import { createShowcase } from "@/app/wishlist/showcaseActions";
import { CatalogBrowser } from "@/components/CatalogBrowser";
import { WishlistDock } from "@/components/WishlistDock";
import {
  WishlistHighlights,
  type WishlistHighlightsData,
} from "@/components/WishlistHighlights";
import type { CatalogCardItem } from "@/components/CatalogProductCard";
import { MIN_AI_ITEMS, MIN_SHOWCASE_ITEMS } from "@/lib/selectionLimits";

type Mode = "ai" | "showcase";

export type WishlistItem = CatalogCardItem & {
  category: string;
  openCount: number;
};

const COPY = {
  ai: {
    title: "Pick the items you're torn between",
    action: startTriageWithSelection,
    min: MIN_AI_ITEMS,
    cta: (n: number) => `Let AI pick from ${n}`,
    short: (min: number, n: number) => `Select at least ${min} (${n} picked)`,
  },
  showcase: {
    title: "Pick the items to showcase to friends",
    action: createShowcase,
    min: MIN_SHOWCASE_ITEMS,
    cta: (n: number) => `Showcase ${n} items`,
    short: (min: number, n: number) => `Select at least ${min} (${n} picked)`,
  },
} as const;

export function WishlistGrid({
  items,
  highlights,
}: {
  items: WishlistItem[];
  highlights: WishlistHighlightsData;
}) {
  const [mode, setMode] = useState<Mode | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  function toggle(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function start(next: Mode) {
    setMode(next);
    setSelectedIds(new Set());
  }

  function cancel() {
    setMode(null);
    setSelectedIds(new Set());
  }

  const copy = mode ? COPY[mode] : null;
  const enough = copy ? selectedIds.size >= copy.min : false;

  return (
    <CatalogBrowser
      items={items}
      title="Wishlist"
      breadcrumb="Wishlist"
      showOpenCount
      // "Add to Wishlist" is meaningless on the wishlist itself; opening an
      // item is what feeds F2 here.
      showAddToWishlist={false}
      submitOpenItem={mode === null}
      selection={mode ? { selectedIds, onToggle: toggle } : undefined}
      beforeGrid={<WishlistHighlights data={highlights} />}
      footer={
        /* F1: entry point visible on the wishlist without navigation, opt-in
           only (edge_case.md EC5 — never an interstitial that blocks
           browsing). Both AI Pick and Showcase build their set the same way;
           only where the set is sent differs. */
        copy ? (
          <div className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-surface px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
            <p className="mx-auto mb-2 max-w-md text-xs font-medium text-muted">
              {copy.title}
            </p>
            <form action={copy.action} className="mx-auto flex max-w-md items-center gap-2">
              {Array.from(selectedIds).map((id) => (
                <input key={id} type="hidden" name="itemIds" value={id} />
              ))}
              <button
                type="button"
                onClick={cancel}
                className="rounded-lg border border-border px-4 py-3 text-sm font-semibold text-ink"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!enough}
                className="flex-1 rounded-lg bg-brand py-3 text-center text-sm font-bold text-white disabled:opacity-40"
              >
                {enough
                  ? copy.cta(selectedIds.size)
                  : copy.short(copy.min, selectedIds.size)}
              </button>
            </form>
          </div>
        ) : (
          <WishlistDock
            onAiPick={() => start("ai")}
            onShowcase={() => start("showcase")}
            canClean={items.length > 0}
          />
        )
      }
    />
  );
}
