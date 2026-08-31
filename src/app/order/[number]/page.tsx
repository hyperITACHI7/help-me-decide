import { redirect } from "next/navigation";
import Link from "next/link";
import { IconCircleCheckFilled, IconInfoCircle } from "@tabler/icons-react";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { BackLink } from "@/components/BackLink";
import { ProductImage } from "@/components/ProductImage";

type OrderLine = {
  itemId: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: number;
};

export default async function OrderPage({
  params,
}: {
  params: Promise<{ number: string }>;
}) {
  const { number } = await params;

  const session = await getSession();
  if (!session) redirect("/");

  // Scoped to the owner's session for the same reason the showcase page is:
  // an order number alone must not expose what someone bought.
  const order = await prisma.order.findFirst({
    where: { number, sessionId: session.id },
  });

  if (!order) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-base font-bold text-ink">Order not found</p>
        <p className="mt-2 text-sm text-muted">
          This order doesn&apos;t belong to your current session.
        </p>
        <Link href="/wishlist" className="mt-6 text-sm font-semibold text-brand underline">
          Back to wishlist
        </Link>
      </main>
    );
  }

  const lines = order.items as unknown as OrderLine[];

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <BackLink href="/wishlist" label="Back to wishlist" />

      <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface">
        <div className="border-b border-border px-6 py-8 text-center">
          <IconCircleCheckFilled className="mx-auto h-10 w-10 text-brand" />
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-ink">
            Order placed
          </h1>
          <p className="mt-2 text-sm text-muted">
            Order{" "}
            <span className="font-bold tabular-nums text-ink">{order.number}</span>
          </p>
        </div>

        {/* Said plainly and up front rather than buried: this is the step
            being demonstrated, not a transaction that happened. */}
        <div className="flex items-start gap-3 border-b border-border bg-canvas px-6 py-4">
          <IconInfoCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
          <p className="text-xs leading-relaxed text-muted">
            This is a prototype for a PM fellowship project — no payment was
            taken, nothing ships, and these are fictional products. The order
            itself is real in the sense that it was saved, so this page still
            works if you reload or come back to it.
          </p>
        </div>

        <ul className="divide-y divide-border">
          {lines.map((line) => (
            <li key={line.itemId} className="flex items-center gap-4 px-6 py-4">
              <div className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-canvas">
                <ProductImage
                  src={line.imageUrl}
                  alt={line.name}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold text-ink">{line.brand}</p>
                <p className="truncate text-xs text-muted">{line.name}</p>
              </div>
              <span className="shrink-0 text-sm font-bold tabular-nums text-ink">
                ₹{line.price}
              </span>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between border-t border-border px-6 py-4">
          <span className="text-xs font-bold uppercase tracking-[0.2em] text-muted">
            Total paid
          </span>
          <span className="text-xl font-bold tabular-nums text-ink">
            ₹{order.total}
          </span>
        </div>
      </section>

      <div className="mt-8">
        <Link
          href="/wishlist"
          className="rounded-full bg-transparent px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink shadow-[inset_0_0_0_2px_var(--color-border)] transition duration-200 hover:bg-ink hover:text-white hover:shadow-[inset_0_0_0_2px_var(--color-ink)]"
        >
          Back to wishlist
        </Link>
      </div>
    </main>
  );
}
