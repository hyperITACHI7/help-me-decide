"use client";

import Link from "next/link";
import { WobbleCard } from "@/components/ui/wobble-card";

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

function Thumb({ item }: { item: HighlightItem }) {
  return (
    <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-white/20">
      {/* eslint-disable-next-line @next/next/no-img-element -- local SVG data URI */}
      <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
    </div>
  );
}

function CardShell({
  children,
  containerClassName,
}: {
  children: React.ReactNode;
  containerClassName: string;
}) {
  return (
    <WobbleCard
      containerClassName={containerClassName}
      className="min-h-[11rem] px-5 py-5 sm:px-6"
    >
      {children}
    </WobbleCard>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-bold uppercase tracking-wider text-white/70">
      {children}
    </p>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 text-sm text-white/80">{children}</p>;
}

function plural(count: number, word: string) {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

export function WishlistHighlights({ data }: { data: WishlistHighlightsData }) {
  const { mostViewed, showcase, aiPick } = data;

  return (
    <div className="mb-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
      {/* Most viewed — F2's revealed-preference signal, surfaced. */}
      <CardShell containerClassName="bg-[#282c3f]">
        <Label>Most viewed</Label>
        {mostViewed ? (
          <div className="mt-3 flex items-center gap-3">
            <Thumb item={mostViewed} />
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-white">{mostViewed.brand}</p>
              <p className="truncate text-xs text-white/70">{mostViewed.name}</p>
              <p className="mt-1 text-xs font-semibold text-white">
                ₹{mostViewed.price}
              </p>
              <p className="mt-1 text-[11px] text-white/70">
                opened {mostViewed.openCount}×
              </p>
            </div>
          </div>
        ) : (
          <Empty>Nothing opened yet — tap a card to start building signal.</Empty>
        )}
      </CardShell>

      {/* Showcase results */}
      <CardShell containerClassName="bg-brand">
        <Label>Showcase{showcase?.revoked ? " · closed" : ""}</Label>
        {showcase ? (
          <>
            {showcase.totalVotes === 0 ? (
              <Empty>
                {plural(showcase.itemCount, "item")} shared — no reactions yet.
              </Empty>
            ) : (
              <div className="mt-3 flex items-center gap-3">
                {showcase.top && <Thumb item={showcase.top} />}
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-white">
                    {showcase.top?.brand}
                  </p>
                  <p className="truncate text-xs text-white/80">
                    {showcase.top?.name}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-white">
                    {showcase.top?.likes} ♥ of {plural(showcase.top?.votes ?? 0, "vote")}
                  </p>
                  <p className="mt-1 text-[11px] text-white/80">
                    {plural(showcase.totalVotes, "reaction")} across{" "}
                    {plural(showcase.itemCount, "item")}
                  </p>
                </div>
              </div>
            )}
            <Link
              href={`/wishlist/showcase/${showcase.token}`}
              className="mt-3 inline-block text-xs font-bold text-white underline"
            >
              View showcase
            </Link>
          </>
        ) : (
          <Empty>No showcase yet — pick items from the dock to share.</Empty>
        )}
      </CardShell>

      {/* Latest AI pick */}
      <CardShell containerClassName="bg-[#4b2ea8]">
        <Label>Latest AI pick</Label>
        {aiPick ? (
          aiPick.top ? (
            <div className="mt-3 flex items-center gap-3">
              <Thumb item={aiPick.top} />
              <div className="min-w-0">
                <p className="truncate text-sm font-bold text-white">
                  {aiPick.top.brand}
                </p>
                <p className="truncate text-xs text-white/70">{aiPick.top.name}</p>
                <p className="mt-1 line-clamp-2 text-[11px] text-white/80">
                  {aiPick.top.reason}
                </p>
              </div>
            </div>
          ) : (
            <Empty>
              The AI couldn&apos;t separate your last set — the items were too
              alike to rank.
            </Empty>
          )
        ) : (
          <Empty>No AI pick yet — start one from the dock.</Empty>
        )}
      </CardShell>
    </div>
  );
}
