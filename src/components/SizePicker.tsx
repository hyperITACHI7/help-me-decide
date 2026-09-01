"use client";

import { useState } from "react";
import type { SizeOption } from "@/lib/productDetail";
import { cn } from "@/lib/utils";

/**
 * Sizes as visible options rather than a dropdown, so the whole range is
 * scannable without opening anything.
 *
 * The fit note is the interesting part. It's a hover affordance by request,
 * but hover doesn't exist on touch and doesn't exist for keyboard users, so
 * hover alone would hide it from most phone traffic entirely. It shows on
 * hover, on keyboard focus, and on selection — the same note, three ways in —
 * with hover only *previewing* over the current selection so a pointer moving
 * across the row can compare without losing what's chosen.
 *
 * The note's line is always rendered, even when empty, so revealing it never
 * shifts the Add-to-bag button underneath it (CLS).
 */
export function SizePicker({
  sizes,
  name,
}: {
  sizes: SizeOption[];
  /** Posted with the form so the chosen size reaches the server action. */
  name: string;
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);

  const shown = preview ?? selected;
  const note = sizes.find((size) => size.label === shown)?.fit ?? "";

  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-ink">
          Choose your size
        </h2>
        {selected && (
          <span className="text-xs text-muted">
            Selected: <span className="font-bold text-ink">{selected}</span>
          </span>
        )}
      </div>

      <div
        className="mt-3 flex flex-wrap gap-2"
        onMouseLeave={() => setPreview(null)}
      >
        {sizes.map((size) => {
          const isSelected = selected === size.label;
          return (
            <button
              key={size.label}
              type="button"
              aria-pressed={isSelected}
              // Same note the sighted hover gets, so it isn't lost to a
              // screen reader that never fires a mouse event.
              aria-label={`Size ${size.label}. ${size.fit}`}
              onMouseEnter={() => setPreview(size.label)}
              // Cleared per chip rather than relying only on the row's
              // mouseleave: caught live on production, a pointer leaving the
              // row in one motion could skip that handler and strand the last
              // hovered size's note above Add-to-bag while a different size
              // was selected. Leaving a chip always fires its own leave.
              onMouseLeave={() => setPreview(null)}
              onFocus={() => setPreview(size.label)}
              onBlur={() => setPreview(null)}
              onClick={() => setSelected(isSelected ? null : size.label)}
              className={cn(
                // min-h/min-w keep every chip a comfortable tap target rather
                // than sizing down to a two-character label.
                "flex min-h-11 min-w-11 items-center justify-center rounded-sm border px-4 text-sm font-bold transition",
                isSelected
                  ? "border-ink bg-ink text-white"
                  : "border-border bg-surface text-ink hover:border-ink",
              )}
            >
              {size.label}
            </button>
          );
        })}
      </div>

      {/* min-h reserves the line whether or not there's a note in it. */}
      <p className="mt-2.5 min-h-5 text-xs leading-5 text-muted" aria-live="polite">
        {note}
      </p>

      {selected && <input type="hidden" name={name} value={selected} />}
    </div>
  );
}
