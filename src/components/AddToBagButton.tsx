"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconCheck, IconShoppingBagPlus } from "@tabler/icons-react";
import { toggleBag } from "@/app/bagActions";
import { cn } from "@/lib/utils";

/**
 * One control, used by every surface that shows an item: the wishlist grid,
 * the AI's picks, and a showcase's results.
 *
 * Deliberately the same button in all three places, and deliberately plain.
 * The AI picks panel says "a suggestion, not a verdict" (N4) and that posture
 * has to survive all the way to the action — a louder CTA on the AI's picks
 * than on an ordinary tile would quietly turn the suggestion into a verdict.
 * What differs between surfaces is only `source`, which is analytics, not
 * emphasis.
 *
 * It also has to stay undemanding for the Ready Buyer (0% decision difficulty,
 * problem_statement.md §4): an ordinary affordance they can use or ignore, not
 * a step in a funnel they never asked to enter.
 */
export function AddToBagButton({
  itemId,
  inBag,
  source,
  className,
  full = false,
}: {
  itemId: string;
  inBag: boolean;
  /** Which surface this was pressed from — see toggleBag. */
  source: "wishlist" | "ai_picks" | "showcase";
  className?: string;
  /** Stretch to the container's width (card footers), rather than hug. */
  full?: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  return (
    <button
      type="button"
      disabled={pending}
      aria-pressed={inBag}
      onClick={(event) => {
        // These sit inside cards that are themselves tap targets (opening an
        // item, or toggling selection) — the press must not also trigger those.
        event.preventDefault();
        event.stopPropagation();
        startTransition(async () => {
          await toggleBag(itemId, source);
          router.refresh();
        });
      }}
      className={cn(
        // Same button as "Add to Wishlist" (CatalogProductCard's onAddToWishlist
        // control) — border, surface fill, rounded-sm, uppercase label. Matters
        // for more than consistency here: this button sits overlaid on a photo,
        // and the previous "in bag" style (bg-transparent, an inset-shadow ring
        // with nothing behind it) let the rating pill bleed through once it was
        // painted on top. A solid fill in both states is load-bearing, not just
        // cosmetic.
        "flex items-center justify-center gap-1.5 rounded-sm border py-2 text-xs font-bold uppercase tracking-wide shadow-sm transition disabled:opacity-50",
        full && "w-full",
        inBag
          ? "border-brand bg-brand-soft text-brand-dark hover:border-ink hover:text-ink"
          : "border-border bg-surface text-ink hover:border-brand hover:text-brand",
        className,
      )}
    >
      {inBag ? (
        <>
          <IconCheck className="h-4 w-4" />
          In bag
        </>
      ) : (
        <>
          <IconShoppingBagPlus className="h-4 w-4" />
          Add to bag
        </>
      )}
    </button>
  );
}
