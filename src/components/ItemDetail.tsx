import {
  IconArrowBackUp,
  IconFlame,
  IconRosetteDiscountCheck,
  IconTruck,
  IconWallet,
} from "@tabler/icons-react";
import { AddToBagButton } from "@/components/AddToBagButton";
import { ProductImage } from "@/components/ProductImage";
import { ProductPerks } from "@/components/ProductPerks";
import { SizePicker } from "@/components/SizePicker";
import { StarRating } from "@/components/StarRating";
import { BADGE_LABELS } from "@/lib/productDetail";
import type { ItemDetailData } from "@/lib/loadItemDetail";

/**
 * The product itself — rendered identically by the full /item/[id] page and by
 * the modal that intercepts it, so a refresh can't show a different layout
 * than the overlay did.
 */
export function ItemDetail({ item }: { item: ItemDetailData }) {
  return (
    <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
      {/* ── Photo ─────────────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-2xl border border-border bg-canvas">
        <div className="aspect-[3/4] w-full">
          <ProductImage
            src={item.imageUrl}
            alt={item.name}
            className="h-full w-full object-cover"
          />
        </div>
      </div>

      {/* ── Everything else, in the column beside the photo ────────────── */}
      <div className="min-w-0">
        {item.badge && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf3e3] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#8a6116]">
            <IconRosetteDiscountCheck className="h-3.5 w-3.5" />
            {BADGE_LABELS[item.badge]}
          </span>
        )}

        <p className={item.badge ? "mt-3 text-sm font-bold text-muted" : "text-sm font-bold text-muted"}>
          {item.brand}
        </p>
        <h1 className="mt-1 text-3xl font-bold leading-tight tracking-tight text-ink">
          {item.name}
        </h1>

        {/* Exact rating, exact counts — see StarRating for why the stars
            aren't rounded to the nearest whole. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-sm">
          <span className="flex items-center gap-1.5">
            <StarRating rating={item.rating} />
            <span className="font-bold text-ink">{item.rating.toFixed(1)}</span>
            <span className="text-muted">
              ({item.reviews.toLocaleString("en-IN")} Reviews)
            </span>
          </span>
          <span className="text-border" aria-hidden>
            |
          </span>
          <span className="flex items-center gap-1.5 font-semibold text-ink">
            <IconFlame className="h-4 w-4 text-brand" />
            {item.sold.toLocaleString("en-IN")}+ sold this week
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <span className="text-2xl font-bold text-ink">₹{item.price}</span>
          {item.originalPrice && item.originalPrice > item.price && (
            <span className="text-base text-muted line-through">
              ₹{item.originalPrice}
            </span>
          )}
          {item.discountPct !== null && (
            <span className="text-base font-bold text-discount">
              {item.discountPct}% OFF
            </span>
          )}
        </div>
        <p className="mt-1 text-xs text-muted">Inclusive of all taxes</p>

        <div className="mt-6">
          <SizePicker sizes={item.sizes} name="size" />
        </div>

        {/* ── Add to bag, with the three assurances ───────────────────── */}
        <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
          <AddToBagButton
            itemId={item.id}
            inBag={item.inBag}
            source="item"
            full
            className="py-3 text-sm"
          />
          <ul className="mt-4 space-y-2.5">
            <Assurance icon={IconTruck}>
              Delivery in <span className="font-bold text-ink">{item.days} days</span>
            </Assurance>
            <Assurance icon={IconWallet}>Pay on delivery available</Assurance>
            <Assurance icon={IconArrowBackUp}>Easy 14 day return</Assurance>
          </ul>
        </div>

        {/* Directly under the bag card, in this same column — not stranded
            across the full page width below the photo. */}
        <ProductPerks perks={item.perks} />
      </div>
    </div>
  );
}

function Assurance({
  icon: Icon,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm text-muted">
      <Icon className="h-4 w-4 shrink-0 text-ink" />
      <span>{children}</span>
    </li>
  );
}
