import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { WishlistGrid } from "@/components/WishlistGrid";

export default async function WishlistPage() {
  // EC1/EC2 (edge_case.md): no session cookie, or a dangling one — fail soft
  // back to the chooser rather than a 500.
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const rawItems = await prisma.wishlistItem.findMany({
    where: { sessionId: session.id },
  });

  // F2: re-sort by revealed preference (seeded + live open-count), NOT save
  // order. Tie-broken by save recency (phased_architecture.md Phase 1
  // table). Sorted in application code, not the DB query, because the sort
  // key is a sum of two columns — Prisma has no computed-column orderBy.
  const items = [...rawItems].sort((a, b) => {
    const openDelta =
      b.seededOpenCount + b.liveOpenCount - (a.seededOpenCount + a.liveOpenCount);
    if (openDelta !== 0) return openDelta;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  // §6 leading indicator denominator: Flow entry rate = flow_entered /
  // wishlist_viewed (phased_architecture.md §5 Phase 5).
  await track("wishlist_viewed", { sessionId: session.id });

  const [latestShowcase, latestShortlist] = await Promise.all([
    prisma.shareLink.findFirst({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" },
      include: {
        items: { include: { item: true }, orderBy: { position: "asc" } },
        votes: true,
      },
    }),
    prisma.shortlist.findFirst({
      where: { sessionId: session.id },
      orderBy: { createdAt: "desc" },
      include: { tiers: { include: { item: true } } },
    }),
  ]);

  const toHighlight = (item: {
    id: string;
    name: string;
    brand: string;
    imageUrl: string;
    price: number;
  }) => ({
    id: item.id,
    name: item.name,
    brand: item.brand,
    imageUrl: item.imageUrl,
    price: item.price,
  });

  // items[0] is already the most-opened, since the list is sorted by the
  // revealed-preference key above.
  const mostViewedRow = items[0];

  const showcaseTop = latestShowcase
    ? [...latestShowcase.items]
        .map(({ item }) => {
          const votes = latestShowcase.votes.filter((v) => v.itemId === item.id);
          return {
            ...toHighlight(item),
            likes: votes.filter((v) => v.liked).length,
            votes: votes.length,
          };
        })
        .sort((a, b) => b.likes - a.likes)[0] ?? null
    : null;

  const bestTier =
    latestShortlist?.tiers.find((t) => t.tier === "best_pick") ??
    latestShortlist?.tiers[0] ??
    null;

  const highlights = {
    mostViewed: mostViewedRow
      ? {
          ...toHighlight(mostViewedRow),
          openCount: mostViewedRow.seededOpenCount + mostViewedRow.liveOpenCount,
        }
      : null,
    showcase: latestShowcase
      ? {
          token: latestShowcase.token,
          revoked: Boolean(latestShowcase.revokedAt),
          itemCount: latestShowcase.items.length,
          totalVotes: latestShowcase.votes.length,
          top: showcaseTop,
        }
      : null,
    aiPick: latestShortlist
      ? {
          createdAt: latestShortlist.createdAt.toISOString(),
          separable: latestShortlist.separable,
          top: bestTier
            ? { ...toHighlight(bestTier.item), reason: bestTier.reason }
            : null,
        }
      : null,
  };

  return (
    <WishlistGrid
      highlights={highlights}
      items={items.map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        imageUrl: item.imageUrl,
        price: item.price,
        originalPrice: item.originalPrice,
        rating: item.rating,
        category: item.category,
        openCount: item.seededOpenCount + item.liveOpenCount,
      }))}
    />
  );
}
