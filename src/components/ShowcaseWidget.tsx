"use client";

import Link from "next/link";
import { IconHeartFilled, IconShare2 } from "@tabler/icons-react";
import { ProductImage } from "@/components/ProductImage";
import type { ShowcaseSummary, ShowcaseTopItem } from "@/lib/showcaseSummary";

/**
 * Wishlist-wide showcase status, above the category rail.
 *
 * Position and copy are both doing separation work: this sits above the rail
 * because it spans the entire wishlist, while the AI picks panel sits below
 * it and is scoped to whichever category is open. Both say which they are on
 * the tin ("across every category" here, "{category} only" there), because
 * two AI-ish cards on one page are easy to conflate otherwise.
 *
 * Always rendered — with no showcase yet it's the invitation to start one,
 * which is now the only entry point since the floating dock is gone.
 */
export function ShowcaseWidget({
  summary,
  onStart,
  canStart,
}: {
  summary: ShowcaseSummary | null;
  onStart: () => void;
  canStart: boolean;
}) {
  return (
    <section className="mb-6 overflow-hidden rounded-2xl border border-border bg-surface">
      <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-6 py-4">
        <div>
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-ink">
            <IconShare2 className="h-4 w-4 text-muted" />
            Showcase
            <span className="font-semibold tracking-normal text-muted normal-case">
              · across every category
            </span>
          </span>
          <p className="mt-1.5 text-sm text-muted">{describe(summary)}</p>
        </div>
        <div className="flex items-center gap-3">
          {summary?.revoked && (
            <span className="rounded-full bg-canvas px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-muted">
              Closed
            </span>
          )}
          {/* Starting a new one has to stay available after the first, not
              just before it — this card is the only entry point now that the
              dock is gone, so offering only "View reactions" here would
              strand anyone who'd already made one. */}
          {summary && (
            <Link
              href={`/wishlist/showcase/${summary.token}`}
              className="rounded-full bg-transparent px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink shadow-[inset_0_0_0_2px_var(--color-border)] transition duration-200 hover:bg-ink hover:text-white hover:shadow-[inset_0_0_0_2px_var(--color-ink)]"
            >
              View reactions
            </Link>
          )}
          <button
            type="button"
            onClick={onStart}
            disabled={!canStart}
            className="rounded-full bg-ink px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {summary ? "New showcase" : "Start a showcase"}
          </button>
        </div>
      </header>

      {summary ? (
        <div className="flex flex-col gap-8 p-6 lg:flex-row lg:items-center">
          {summary.top.length > 0 && (
            <TopItems top={summary.top} />
          )}
          {/* Fixed, modest gaps rather than grid columns stretched across
              whatever space happens to be left on a wide card — that's what
              was throwing Items/Reactions/Liked far apart from each other. */}
          <dl className="flex flex-wrap items-center gap-x-8 gap-y-5 lg:ml-auto lg:gap-x-12">
            <Stat label="Items" value={summary.itemCount} />
            {/* One friend rating six items counts once, not six times. */}
            <Stat label="Reactions" value={summary.reactionCount} />
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
      ) : (
        <div className="px-6 py-5">
          <p className="max-w-lg text-sm leading-relaxed text-muted">
            Pick anything from your wishlist — any category, mixed together —
            and send one link. Friends swipe through it without needing an
            account, and their reactions land back here.
          </p>
          {!canStart && (
            <p className="mt-2 text-xs text-muted">
              Add a couple of items to your wishlist first.
            </p>
          )}
        </div>
      )}
    </section>
  );
}

/**
 * One winner reads as a winner; a genuine tie reads as a tie rather than
 * being resolved by whichever happened to sort first. Ties are common here —
 * with three or four friends, two items landing on the same like count is
 * the normal case, not an edge case.
 */
function TopItems({ top }: { top: ShowcaseTopItem[] }) {
  const tied = top.length > 1;

  return (
    <div className="flex min-w-0 items-center gap-5 lg:w-96 lg:shrink-0">
      <div className="flex shrink-0 -space-x-4">
        {top.slice(0, 3).map((item) => (
          <div
            key={item.id}
            className="h-28 w-[5.25rem] shrink-0 overflow-hidden rounded-xl bg-canvas ring-2 ring-surface"
          >
            <ProductImage
              src={item.imageUrl}
              alt={item.name}
              className="h-full w-full object-cover"
            />
          </div>
        ))}
      </div>
      <div className="min-w-0">
        <span className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
          {tied ? `Tied · ${top.length}` : "Most liked"}
        </span>
        {tied ? (
          <p className="mt-1 truncate text-sm font-bold text-ink">
            {top.map((t) => t.brand).join(" · ")}
          </p>
        ) : (
          <>
            <p className="mt-1 truncate text-sm font-bold text-ink">
              {top[0]!.brand}
            </p>
            <p className="truncate text-xs text-muted">{top[0]!.name}</p>
            <p className="mt-1 text-sm font-bold text-ink">₹{top[0]!.price}</p>
          </>
        )}
        <p className="mt-1.5 flex items-center gap-1 text-xs font-bold text-brand">
          <IconHeartFilled className="h-3.5 w-3.5" />
          {top[0]!.likes} of {top[0]!.votes}
          {tied && " each"}
        </p>
      </div>
    </div>
  );
}

function describe(summary: ShowcaseSummary | null): string {
  if (!summary) return "See what your friends actually think.";
  if (summary.revoked) return "Closed — friends can't react to this one any more.";
  if (summary.reactionCount === 0) {
    return "Shared and open — no reactions have come in yet.";
  }
  return `${summary.reactionCount} ${
    summary.reactionCount === 1 ? "friend has" : "friends have"
  } reacted so far.`;
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
