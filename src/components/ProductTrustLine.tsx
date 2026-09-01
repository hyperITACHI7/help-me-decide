import { IconFlame } from "@tabler/icons-react";
import { StarRating } from "@/components/StarRating";
import { reviewCountFor } from "@/lib/display";
import { soldThisWeek } from "@/lib/productDetail";

/**
 * The rating + review count + sold-this-week line — the item page's own
 * trust signals, factored out so the AI Picks and Showcase expanded cards can
 * carry the same numbers rather than showing a bare price with nothing behind
 * it. Same two functions the item page reads (lib/display, lib/productDetail)
 * so a product can't show a different review count on its card than on its
 * own page.
 */
export function ProductTrustLine({
  itemId,
  name,
  rating,
  className,
}: {
  itemId: string;
  name: string;
  rating: number;
  className?: string;
}) {
  const reviews = reviewCountFor(itemId);
  const sold = soldThisWeek(name);

  return (
    <div className={className}>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs">
        <span className="flex items-center gap-1.5">
          <StarRating rating={rating} />
          <span className="font-bold text-ink">{rating.toFixed(1)}</span>
          <span className="text-muted">
            ({reviews.toLocaleString("en-IN")} Reviews)
          </span>
        </span>
        <span className="text-border" aria-hidden>
          |
        </span>
        <span className="flex items-center gap-1 font-semibold text-ink">
          <IconFlame className="h-3.5 w-3.5 text-brand" />
          {sold.toLocaleString("en-IN")}+ sold this week
        </span>
      </div>
    </div>
  );
}
