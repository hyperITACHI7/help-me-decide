import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { ProductCard } from "@/components/ProductCard";

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

  const categories = Array.from(new Set(items.map((i) => i.category)));

  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-border bg-surface px-4 pb-3 pt-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-ink">Wishlist</h1>
            <p className="text-xs text-muted">{items.length} items</p>
          </div>
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink">
            🛍
          </div>
        </div>

        <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
          {categories.map((category) => (
            <span
              key={category}
              className="whitespace-nowrap rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-ink"
            >
              {category}
            </span>
          ))}
        </div>
      </header>

      <main className="flex-1 px-3 py-4 pb-24">
        <div className="grid grid-cols-2 gap-x-3 gap-y-5">
          {items.map((item) => (
            <ProductCard
              key={item.id}
              item={{
                id: item.id,
                name: item.name,
                brand: item.brand,
                imageUrl: item.imageUrl,
                price: item.price,
                originalPrice: item.originalPrice,
                rating: item.rating,
                openCount: item.seededOpenCount + item.liveOpenCount,
              }}
            />
          ))}
        </div>
      </main>

      {/* F1: entry point visible on the wishlist without navigation, opt-in
          only (edge_case.md EC5 — never an interstitial that blocks browsing). */}
      <div className="fixed inset-x-0 bottom-0 border-t border-border bg-surface px-4 py-3 shadow-[0_-2px_12px_rgba(0,0,0,0.06)]">
        <Link
          href="/wishlist/decide"
          className="block w-full rounded-lg bg-brand py-3 text-center text-sm font-bold text-white"
        >
          Help me decide
        </Link>
      </div>
    </div>
  );
}
