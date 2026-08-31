import { redirect } from "next/navigation";
import Link from "next/link";
import { IconShoppingBag } from "@tabler/icons-react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { AddToBagButton } from "@/components/AddToBagButton";
import { BackLink } from "@/components/BackLink";
import { PlaceOrderButton } from "@/components/PlaceOrderButton";
import { ProductImage } from "@/components/ProductImage";
import { discountPercent } from "@/lib/display";

export default async function BagPage() {
  // EC1/EC2: no session, or a dangling one — fail soft to the chooser.
  const session = await getSession();
  if (!session) redirect("/");

  const items = await prisma.wishlistItem.findMany({
    where: { sessionId: session.id, bagAddedAt: { not: null } },
    orderBy: { bagAddedAt: "desc" },
  });

  const total = items.reduce((sum, item) => sum + item.price, 0);
  const saved = items.reduce(
    (sum, item) => sum + Math.max(0, (item.originalPrice ?? item.price) - item.price),
    0
  );

  await track("bag_viewed", {
    sessionId: session.id,
    props: { itemCount: items.length },
  });

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <BackLink href="/wishlist" label="Back to wishlist" />

      <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink">
        Bag{" "}
        <span className="font-normal text-muted">
          — {items.length} {items.length === 1 ? "item" : "items"}
        </span>
      </h1>

      {items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-border bg-surface px-6 py-12 text-center">
          <IconShoppingBag className="mx-auto h-8 w-8 text-muted" />
          <p className="mt-4 text-base font-bold text-ink">Your bag is empty</p>
          <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-muted">
            Add something from your wishlist — or open a category and see which
            three the AI would pick out of it.
          </p>
          <Link
            href="/wishlist"
            className="mt-6 inline-block rounded-full bg-ink px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
          >
            Go to wishlist
          </Link>
        </div>
      ) : (
        <>
          <ul className="mt-6 space-y-2">
            {items.map((item) => {
              const pct = discountPercent(item.price, item.originalPrice);
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-surface p-3"
                >
                  <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-canvas">
                    <ProductImage
                      src={item.imageUrl}
                      alt={item.name}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-ink">{item.brand}</p>
                    <p className="truncate text-xs text-muted">{item.name}</p>
                    <div className="mt-1 flex flex-wrap items-baseline gap-x-2">
                      <span className="text-sm font-bold text-ink">₹{item.price}</span>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <span className="text-xs text-muted line-through">
                          ₹{item.originalPrice}
                        </span>
                      )}
                      {pct !== null && (
                        <span className="text-xs font-semibold text-discount">
                          {pct}% OFF
                        </span>
                      )}
                    </div>
                  </div>
                  {/* Same control as everywhere else — pressed here it removes. */}
                  <AddToBagButton itemId={item.id} inBag source="wishlist" />
                </li>
              );
            })}
          </ul>

          <section className="mt-6 rounded-3xl border border-border bg-surface p-6">
            <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-ink">
              Price details
            </h2>
            <dl className="mt-4 space-y-2 text-sm">
              <div className="flex justify-between">
                <dt className="text-muted">
                  Total MRP ({items.length} {items.length === 1 ? "item" : "items"})
                </dt>
                <dd className="tabular-nums text-ink">₹{total + saved}</dd>
              </div>
              {saved > 0 && (
                <div className="flex justify-between">
                  <dt className="text-muted">Discount</dt>
                  <dd className="tabular-nums text-discount">−₹{saved}</dd>
                </div>
              )}
              <div className="flex justify-between border-t border-border pt-3 text-base font-bold">
                <dt className="text-ink">Total</dt>
                <dd className="tabular-nums text-ink">₹{total}</dd>
              </div>
            </dl>

            <div className="mt-6">
              <PlaceOrderButton />
            </div>
          </section>
        </>
      )}
    </main>
  );
}
