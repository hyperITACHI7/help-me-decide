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
        "inline-flex items-center justify-center gap-1.5 rounded-full px-4 py-2 text-xs font-bold uppercase tracking-wide transition disabled:opacity-50",
        full && "w-full",
        inBag
          ? "bg-transparent text-ink shadow-[inset_0_0_0_2px_var(--color-border)] hover:shadow-[inset_0_0_0_2px_var(--color-ink)]"
          : "bg-ink text-white hover:opacity-90",
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
