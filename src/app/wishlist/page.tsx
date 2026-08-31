import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { loadLatestShowcase } from "@/lib/showcaseSummary";
import { WishlistGrid } from "@/components/WishlistGrid";

export default async function WishlistPage() {
  // EC1/EC2 (edge_case.md): no session cookie, or a dangling one — fail soft
  // back to the chooser rather than a 500.
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const [rawItems, showcase] = await Promise.all([
    prisma.wishlistItem.findMany({ where: { sessionId: session.id } }),
    loadLatestShowcase(session.id),
  ]);

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

  return (
    <WishlistGrid
      showcase={showcase}
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
        inBag: item.bagAddedAt !== null,
      }))}
    />
  );
}
