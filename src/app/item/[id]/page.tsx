import { redirect } from "next/navigation";
import Link from "next/link";
import {
  IconCheck,
  IconRosetteDiscountCheck,
  IconTruck,
  IconWallet,
  IconArrowBackUp,
  IconFlame,
} from "@tabler/icons-react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { AddToBagButton } from "@/components/AddToBagButton";
import { BackLink } from "@/components/BackLink";
import { ProductImage } from "@/components/ProductImage";
import { SizePicker } from "@/components/SizePicker";
import { StarRating } from "@/components/StarRating";
import { reviewCountFor, discountPercent } from "@/lib/display";
import {
  assignBadges,
  BADGE_LABELS,
  deliveryDays,
  perksFor,
  sizesFor,
  soldThisWeek,
} from "@/lib/productDetail";

export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // EC1/EC2: no session, or a dangling one — fail soft to the chooser.
  const session = await getSession();
  if (!session) redirect("/");

  const item = await prisma.wishlistItem.findFirst({
    where: { id, sessionId: session.id },
  });

  if (!item) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-base font-bold text-ink">Item not found</p>
        <p className="mt-2 text-sm text-muted">
          This item isn&apos;t in your current session&apos;s wishlist.
        </p>
        <Link href="/wishlist" className="mt-6 text-sm font-semibold text-brand underline">
          Back to wishlist
        </Link>
      </main>
    );
  }

  // Opening the item IS the page view now, so F2's revealed-preference signal
  // (edge_case.md EC4) is recorded here rather than on the card's click. It
  // measures the same intent more directly — the shopper actually landed on
  // the product, not just brushed a tile.
  await prisma.wishlistItem.updateMany({
    where: { id: item.id, sessionId: session.id },
    data: { liveOpenCount: { increment: 1 } },
  });
  await track("item_opened", { sessionId: session.id, props: { itemId: item.id } });

  // Badges are scored per category, so the whole category has to be loaded to
  // know whether THIS item won anything.
  const categoryItems = await prisma.wishlistItem.findMany({
    where: { sessionId: session.id, category: item.category },
    select: {
      id: true,
      name: true,
      category: true,
      rating: true,
      price: true,
      originalPrice: true,
      createdAt: true,
    },
  });

  const badge = assignBadges(categoryItems).get(item.id) ?? null;
  const reviews = reviewCountFor(item.id);
  const sold = soldThisWeek(item.name);
  const days = deliveryDays(item.id);
  const perks = perksFor(item.tags);
  const sizes = sizesFor(item.category);
  const pct = discountPercent(item.price, item.originalPrice);

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <BackLink href="/wishlist" label="Back to wishlist" />

      <div className="mt-4 grid gap-8 lg:grid-cols-2 lg:gap-12">
        {/* ── Photo ───────────────────────────────────────────────────── */}
        <div className="overflow-hidden rounded-2xl border border-border bg-canvas">
          <div className="aspect-[3/4] w-full">
            <ProductImage
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>
        </div>

        {/* ── Everything else ─────────────────────────────────────────── */}
        <div className="min-w-0">
          {badge && (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-[#fdf3e3] px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-[#8a6116]">
              <IconRosetteDiscountCheck className="h-3.5 w-3.5" />
              {BADGE_LABELS[badge]}
            </span>
          )}

          <p className={badge ? "mt-3 text-sm font-bold text-muted" : "text-sm font-bold text-muted"}>
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
                ({reviews.toLocaleString("en-IN")} Reviews)
              </span>
            </span>
            <span className="text-border" aria-hidden>
              |
            </span>
            <span className="flex items-center gap-1.5 font-semibold text-ink">
              <IconFlame className="h-4 w-4 text-brand" />
              {sold.toLocaleString("en-IN")}+ sold this week
            </span>
          </div>

          <div className="mt-4 flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="text-2xl font-bold text-ink">₹{item.price}</span>
            {item.originalPrice && item.originalPrice > item.price && (
              <span className="text-base text-muted line-through">
                ₹{item.originalPrice}
              </span>
            )}
            {pct !== null && (
              <span className="text-base font-bold text-discount">{pct}% OFF</span>
            )}
          </div>
          <p className="mt-1 text-xs text-muted">Inclusive of all taxes</p>

          <div className="mt-6">
            <SizePicker sizes={sizes} name="size" />
          </div>

          {/* ── Add to bag, with the three assurances ─────────────────── */}
          <div className="mt-6 rounded-2xl border border-border bg-surface p-5">
            <AddToBagButton
              itemId={item.id}
              inBag={item.bagAddedAt !== null}
              source="item"
              full
              className="py-3 text-sm"
            />
            <ul className="mt-4 space-y-2.5">
              <Assurance icon={IconTruck}>
                Delivery in <span className="font-bold text-ink">{days} days</span>
              </Assurance>
              <Assurance icon={IconWallet}>Pay on delivery available</Assurance>
              <Assurance icon={IconArrowBackUp}>Easy 14 day return</Assurance>
            </ul>
          </div>
        </div>
      </div>

      {/* ── Perks, below the card ──────────────────────────────────────── */}
      <section className="mt-10 grid gap-4 border-t border-border pt-8 sm:grid-cols-3">
        {perks.map((perk) => (
          <div key={perk.title} className="flex items-start gap-3">
            <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
              <IconCheck className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-bold text-ink">{perk.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted">
                {perk.detail}
              </p>
            </div>
          </div>
        ))}
      </section>
    </main>
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
