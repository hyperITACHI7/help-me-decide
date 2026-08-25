"use client";

import Link from "next/link";
import { IconEye, IconShare2, IconSparkles } from "@tabler/icons-react";
import { BentoGrid, BentoGridItem } from "@/components/ui/bento-grid";
import { ProductImage } from "@/components/ProductImage";

export type HighlightItem = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: number;
};

export type WishlistHighlightsData = {
  mostViewed: (HighlightItem & { openCount: number }) | null;
  showcase: {
    token: string;
    revoked: boolean;
    itemCount: number;
    totalVotes: number;
    top: (HighlightItem & { likes: number; votes: number }) | null;
  } | null;
  aiPick: {
    createdAt: string;
    separable: boolean;
    top: (HighlightItem & { reason: string }) | null;
  } | null;
};

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

function Label({ icon, children }: { icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-muted">
      {icon}
      {children}
    </span>
  );
}

/** Placeholder header so short cards keep the grid's rhythm. */
function EmptyHeader({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-[4rem] flex-1 items-center rounded-lg bg-canvas px-3 text-xs text-muted">
      {children}
    </div>
  );
}

function Thumb({ item, className }: { item: HighlightItem; className?: string }) {
  return (
    <div className={className ?? "h-full w-14 shrink-0 overflow-hidden rounded-lg bg-canvas"}>
      <ProductImage src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
    </div>
  );
}

export function WishlistHighlights({ data }: { data: WishlistHighlightsData }) {
  const { mostViewed, showcase, aiPick } = data;

  // Four columns, so one column is narrow enough that a 3:4 image fills its
  // width — the most-viewed card is then the grid's product card at ~1.4x,
  // not a wider box with a letterboxed photo. Row height is set so two rows
  // equal that card's natural content height.
  return (
    <BentoGrid className="mx-0 mb-6 max-w-none gap-4 md:auto-rows-[15.5rem] md:grid-cols-4">
      <BentoGridItem
        className="border-border bg-surface md:row-span-2"
        header={
          mostViewed ? (
            <div className="relative aspect-[3/4] w-full shrink-0 overflow-hidden rounded-lg bg-canvas">
              {/* shrink-0 above matters: the card has a fixed two-row height,
                  and flex would otherwise squash the box and break the 3:4. */}
              <ProductImage
                src={mostViewed.imageUrl}
                alt={mostViewed.name}
                className="h-full w-full object-cover"
              />
              <span className="absolute left-3 top-3 rounded-full bg-surface/95 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-ink shadow-sm">
                Most viewed
              </span>
              <span className="absolute right-3 top-3 rounded-full bg-ink/80 px-2.5 py-1 text-[11px] font-semibold text-white">
                opened {mostViewed.openCount}×
              </span>
            </div>
          ) : (
            <EmptyHeader>
              Nothing opened yet — tap a card to start building signal.
            </EmptyHeader>
          )
        }
        title={
          mostViewed ? (
            <span className="text-base text-ink">{mostViewed.brand}</span>
          ) : (
            <Label icon={<IconEye className="h-3.5 w-3.5" />}>Most viewed</Label>
          )
        }
        description={
          mostViewed ? (
            <span className="flex flex-wrap items-baseline gap-x-2 text-muted">
              <span className="truncate">{mostViewed.name}</span>
              <span className="text-sm font-bold text-ink">₹{mostViewed.price}</span>
            </span>
          ) : null
        }
      />

      {/* Showcase results */}
      <BentoGridItem
        className="border-border bg-surface md:col-span-3"
        header={
          showcase ? (
            showcase.totalVotes > 0 && showcase.top ? (
              <div className="flex min-h-0 flex-1 items-center gap-3">
                <Thumb item={showcase.top} className="h-full max-h-40 w-28 shrink-0 overflow-hidden rounded-lg bg-canvas" />
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-ink">
                    {showcase.top.brand}
                  </p>
                  <p className="truncate text-xs text-muted">{showcase.top.name}</p>
                  <p className="mt-0.5 text-xs font-bold text-brand">
                    {showcase.top.likes} ♥ of {plural(showcase.top.votes, "vote")}
                  </p>
                </div>
              </div>
            ) : (
              <EmptyHeader>
                {plural(showcase.itemCount, "item")} shared — no reactions yet.
              </EmptyHeader>
            )
          ) : (
            <EmptyHeader>No showcase yet — start one from the dock.</EmptyHeader>
          )
        }
        title={
          <Label icon={<IconShare2 className="h-3.5 w-3.5" />}>
            Showcase{showcase?.revoked ? " · closed" : ""}
          </Label>
        }
        description={
          showcase ? (
            <span className="flex items-center gap-2 text-muted">
              <span>
                {plural(showcase.totalVotes, "reaction")} ·{" "}
                {plural(showcase.itemCount, "item")}
              </span>
              <Link
                href={`/wishlist/showcase/${showcase.token}`}
                className="font-bold text-brand underline"
              >
                View
              </Link>
            </span>
          ) : null
        }
      />

      {/* Latest AI pick */}
      <BentoGridItem
        className="border-border bg-surface md:col-span-3"
        header={
          aiPick?.top ? (
            <div className="flex min-h-0 flex-1 items-center gap-3">
              <Thumb item={aiPick.top} className="h-full max-h-40 w-28 shrink-0 overflow-hidden rounded-lg bg-canvas" />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-ink">{aiPick.top.brand}</p>
                <p className="truncate text-xs text-muted">{aiPick.top.name}</p>
                <p className="mt-0.5 text-xs font-bold text-brand">₹{aiPick.top.price}</p>
              </div>
            </div>
          ) : aiPick ? (
            <EmptyHeader>
              The AI couldn&apos;t separate your last set — the items were too alike
              to rank.
            </EmptyHeader>
          ) : (
            <EmptyHeader>No AI pick yet — start one from the dock.</EmptyHeader>
          )
        }
        title={
          <Label icon={<IconSparkles className="h-3.5 w-3.5" />}>Latest AI pick</Label>
        }
        description={
          aiPick?.top ? (
            <span className="line-clamp-2 text-muted">{aiPick.top.reason}</span>
          ) : null
        }
      />
    </BentoGrid>
  );
}
