import Link from "next/link";
import { IconHeartFilled, IconShare2 } from "@tabler/icons-react";
import { ProductImage } from "@/components/ProductImage";
import type { ShowcaseSummary } from "@/lib/showcaseSummary";

/**
 * Status card for the shopper's most recent showcase, above the wishlist grid.
 * Only rendered when a showcase exists — there's no empty placeholder, since
 * the version of this section that carried "No showcase yet" boxes was removed
 * for reading as filler.
 */
export function ShowcaseWidget({ summary }: { summary: ShowcaseSummary }) {
  const description = summary.revoked
    ? "Closed — friends can't react to this one any more."
    : summary.totalReactions === 0
      ? "Shared and open — no reactions have come in yet."
      : `${summary.friendCount} ${summary.friendCount === 1 ? "friend has" : "friends have"} reacted so far.`;

  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-6 py-4">
        <div>
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand">
            <IconShare2 className="h-4 w-4" />
            Showcase
          </span>
          <p className="mt-1.5 text-sm text-muted">{description}</p>
        </div>
        <div className="flex items-center gap-3">
          {summary.revoked && (
            <span className="rounded-full bg-canvas px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted">
              Closed
            </span>
          )}
          <Link
            href={`/wishlist/showcase/${summary.token}`}
            className="rounded-full bg-transparent px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink shadow-[inset_0_0_0_2px_var(--color-border)] transition duration-200 hover:bg-ink hover:text-white hover:shadow-[inset_0_0_0_2px_var(--color-ink)]"
          >
            View reactions
          </Link>
        </div>
      </header>

      <div className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center">
        {summary.top && (
          <div className="flex min-w-0 items-center gap-4 lg:w-72 lg:shrink-0">
            <div className="h-28 w-[5.25rem] shrink-0 overflow-hidden rounded-xl bg-canvas">
              <ProductImage
                src={summary.top.imageUrl}
                alt={summary.top.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
                Most liked
              </span>
              <p className="mt-1 truncate text-sm font-bold text-ink">
                {summary.top.brand}
              </p>
              <p className="truncate text-xs text-muted">{summary.top.name}</p>
              <p className="mt-1 text-sm font-bold text-ink">
                ₹{summary.top.price}
              </p>
              <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-brand">
                <IconHeartFilled className="h-3.5 w-3.5" />
                {summary.top.likes} of {summary.top.votes}
              </p>
            </div>
          </div>
        )}

        <dl className="grid flex-1 grid-cols-2 gap-x-4 gap-y-5 sm:grid-cols-4">
          <Stat label="Items" value={summary.itemCount} />
          <Stat label="Reactions" value={summary.totalReactions} />
          {/* "Friends", not "Viewers" — this counts people who actually
              reacted, which is all that's measured. See lib/showcaseSummary. */}
          <Stat label="Friends" value={summary.friendCount} />
          <Stat
            label="Liked"
            value={
              summary.likedShare === null
                ? "—"
                : `${Math.round(summary.likedShare * 100)}%`
            }
          />
        </dl>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div>
      <dt className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">{value}</dd>
    </div>
  );
}
