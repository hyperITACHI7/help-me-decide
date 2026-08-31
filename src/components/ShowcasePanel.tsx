"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  IconArrowRight,
  IconCheck,
  IconCopy,
  IconHeartFilled,
  IconLink,
  IconSparkles,
  IconX,
} from "@tabler/icons-react";
import { revokeShowcase } from "@/app/wishlist/showcaseActions";
import { ProductImage } from "@/components/ProductImage";
import { useOutsideClick } from "@/hooks/use-outside-click";
import { relativeTime } from "@/lib/relativeTime";
import { cn } from "@/lib/utils";
import { discountPercent } from "@/lib/display";

export type ShowcaseResultItem = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: number;
  originalPrice: number | null;
  category: string;
  likes: number;
  passes: number;
  votes: number;
  rank: number;
};

type Props = {
  token: string;
  revoked: boolean;
  createdAt: string;
  lastVoteAt: string | null;
  nowMs: number;
  itemCount: number;
  friendCount: number;
  completedFriendCount: number;
  totalReactions: number;
  likedShare: number | null;
  /** Already ranked by likes, highest first. */
  items: ShowcaseResultItem[];
};

/**
 * The owner's results page. Built around the question they actually came
 * here with — "which one won, and can I trust that answer yet?" — rather
 * than around the shape of the data.
 *
 * So, in order: a verdict in plain language, the caveats that verdict needs
 * to be honest (how many friends, whether they finished, how stale it is),
 * the sharing controls, then every item ranked and expandable for the full
 * split. Anything the owner would otherwise have to work out by eye —
 * ranking, margins, whether a tie is a tie — is worked out for them.
 */
export function ShowcasePanel({
  token,
  revoked,
  createdAt,
  lastVoteAt,
  nowMs,
  itemCount,
  friendCount,
  completedFriendCount,
  totalReactions,
  likedShare,
  items,
}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");
  const [active, setActive] = useState<ShowcaseResultItem | null>(null);
  // Starts at the server's instant so the first client render matches it,
  // then ticks on its own so "4 min ago" doesn't sit frozen on an open tab.
  const [now, setNow] = useState(nowMs);
  const overlayRef = useRef<HTMLDivElement>(null);
  const layoutScope = useId();

  // Built client-side so the link always matches the host the shopper is
  // actually on (localhost in dev, the deployed origin in production).
  // window.location isn't available during SSR, and a lazy initializer would
  // desync hydration, so post-mount state really is the right shape here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShareUrl(`${window.location.origin}/vote/${token}`);
  }, [token]);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!active) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setActive(null);
    }
    // Saved and restored rather than reset to "auto": this component doesn't
    // own the page's scroll state and shouldn't assume what it was.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [active]);

  useOutsideClick(overlayRef, () => setActive(null));

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const topLikes = items.length > 0 ? items[0]!.likes : 0;
  const winners = items.filter((i) => i.likes === topLikes && topLikes > 0);
  const runnerUp = items.find((i) => i.likes < topLikes);
  const margin = runnerUp ? topLikes - runnerUp.likes : null;
  const hero = winners.length === 1 ? winners[0]! : null;

  return (
    <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
      <p className="text-xs text-muted">
        <Link href="/wishlist" className="transition-colors hover:text-ink">
          Wishlist
        </Link>
        <span className="mx-1.5">/</span> Showcase
      </p>

      {/* ── The answer, first ───────────────────────────────────────────── */}
      <section className="mt-4 overflow-hidden rounded-3xl border border-border bg-surface">
        <header className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 border-b border-border px-6 py-4">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-brand">
            <IconSparkles className="h-4 w-4" />
            Showcase results
          </span>
          <div className="flex items-center gap-3 text-xs text-muted">
            <span>Shared {relativeTime(createdAt, now)}</span>
            <StatusPill revoked={revoked} />
          </div>
        </header>

        <div className="flex flex-col gap-6 p-6 sm:flex-row sm:items-center">
          {hero && (
            <div className="h-40 w-32 shrink-0 overflow-hidden rounded-2xl bg-canvas shadow-sm">
              <ProductImage
                src={hero.imageUrl}
                alt={hero.name}
                className="h-full w-full object-cover"
              />
            </div>
          )}
          <div className="min-w-0">
            <Verdict
              totalReactions={totalReactions}
              topLikes={topLikes}
              winners={winners}
              margin={margin}
            />
            <Caveats
              totalReactions={totalReactions}
              friendCount={friendCount}
              completedFriendCount={completedFriendCount}
              itemCount={itemCount}
              lastVoteAt={lastVoteAt}
              now={now}
              revoked={revoked}
            />
          </div>
        </div>

        <dl className="grid grid-cols-2 border-t border-border sm:grid-cols-4">
          <Stat label="Items" value={itemCount} />
          <Stat label="Friends" value={friendCount} />
          <Stat label="Reactions" value={totalReactions} />
          <Stat
            label="Liked"
            value={likedShare === null ? "—" : `${Math.round(likedShare * 100)}%`}
          />
        </dl>
      </section>

      {/* ── Sharing ─────────────────────────────────────────────────────── */}
      <section className="mt-6 rounded-3xl border border-border bg-surface p-6">
        {revoked ? (
          <div className="flex items-start gap-3">
            <IconLink className="mt-0.5 h-4 w-4 shrink-0 text-muted" />
            <p className="text-sm leading-relaxed text-muted">
              This showcase is closed. Anyone opening the link is told it&apos;s
              no longer accepting reactions — the results above are final.
            </p>
          </div>
        ) : (
          <>
            <h2 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.2em] text-ink">
              <IconLink className="h-4 w-4 text-muted" />
              Share link
            </h2>
            <p className="mt-1.5 text-sm text-muted">
              Friends react by swiping — no account needed.
            </p>
            <div className="mt-4 flex items-center gap-2">
              <input
                readOnly
                value={shareUrl}
                aria-label="Showcase link"
                className="min-w-0 flex-1 truncate rounded-xl border border-border bg-canvas px-3 py-2.5 text-xs text-muted"
              />
              <button
                type="button"
                onClick={copy}
                className="flex shrink-0 items-center gap-1.5 rounded-full bg-ink px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90"
              >
                {copied ? (
                  <IconCheck className="h-3.5 w-3.5" />
                ) : (
                  <IconCopy className="h-3.5 w-3.5" />
                )}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await revokeShowcase(token);
                  router.refresh();
                })
              }
              className="mt-4 text-xs font-semibold text-muted underline underline-offset-2 transition-colors hover:text-ink disabled:opacity-50"
            >
              Close this showcase
            </button>
          </>
        )}
      </section>

      {/* ── Every item, ranked ──────────────────────────────────────────── */}
      <section className="mt-6">
        <div className="flex items-baseline justify-between gap-3 px-1">
          <h2 className="text-xs font-bold uppercase tracking-[0.2em] text-ink">
            Every item, ranked
          </h2>
          <span className="text-xs text-muted">Tap one for the full split</span>
        </div>

        <ul className="mt-3 space-y-2">
          {items.map((item) => (
            <motion.li
              key={item.id}
              layoutId={`card-${item.id}-${layoutScope}`}
              onClick={() => setActive(item)}
              className="flex cursor-pointer items-center gap-4 rounded-2xl border border-border bg-surface p-3 transition-colors hover:border-ink/20"
            >
              <RankBadge rank={item.rank} isWinner={item.likes === topLikes && topLikes > 0} />
              <motion.div
                layoutId={`image-${item.id}-${layoutScope}`}
                className="h-16 w-12 shrink-0 overflow-hidden rounded-lg bg-canvas"
              >
                <ProductImage
                  src={item.imageUrl}
                  alt={item.name}
                  className="h-full w-full object-cover"
                />
              </motion.div>

              <div className="min-w-0 flex-1">
                <motion.p
                  layoutId={`brand-${item.id}-${layoutScope}`}
                  className="truncate text-sm font-bold text-ink"
                >
                  {item.brand}
                </motion.p>
                <motion.p
                  layoutId={`name-${item.id}-${layoutScope}`}
                  className="truncate text-xs text-muted"
                >
                  {item.name}
                </motion.p>
                <LikeBar likes={item.likes} votes={item.votes} className="mt-2" />
              </div>

              <div className="shrink-0 pr-1 text-right">
                <p className="flex items-center justify-end gap-1 text-sm font-bold text-brand">
                  <IconHeartFilled className="h-3.5 w-3.5" />
                  <span className="tabular-nums">{item.likes}</span>
                </p>
                <p className="text-[11px] tabular-nums text-muted">
                  of {item.votes}
                </p>
              </div>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* ── The obvious next move ───────────────────────────────────────── */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <Link
          href="/wishlist"
          className="rounded-full bg-transparent px-5 py-2.5 text-xs font-bold uppercase tracking-widest text-ink shadow-[inset_0_0_0_2px_var(--color-border)] transition duration-200 hover:bg-ink hover:text-white hover:shadow-[inset_0_0_0_2px_var(--color-ink)]"
        >
          Back to wishlist
        </Link>
        {totalReactions > 0 && (
          <Link
            href="/wishlist/clean"
            className="group flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink"
          >
            Clear out the ones that didn&apos;t land
            <IconArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </Link>
        )}
      </div>

      {/* ── Expanded card ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {active && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 h-full w-full bg-black/40 backdrop-blur-sm"
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {active && (
          <div className="fixed inset-0 z-50 grid place-items-center p-4">
            <motion.div
              layoutId={`card-${active.id}-${layoutScope}`}
              ref={overlayRef}
              className="flex w-full max-w-md flex-col overflow-hidden rounded-3xl bg-surface shadow-2xl"
            >
              <div className="relative">
                <motion.div
                  layoutId={`image-${active.id}-${layoutScope}`}
                  className="h-72 w-full overflow-hidden bg-canvas"
                >
                  <ProductImage
                    src={active.imageUrl}
                    alt={active.name}
                    className="h-full w-full object-cover"
                  />
                </motion.div>
                <button
                  type="button"
                  onClick={() => setActive(null)}
                  aria-label="Close"
                  className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-surface/90 text-ink shadow-sm backdrop-blur transition-colors hover:bg-surface"
                >
                  <IconX className="h-4 w-4" />
                </button>
                <span className="absolute left-3 top-3 rounded-full bg-ink/85 px-3 py-1 text-[11px] font-bold uppercase tracking-widest text-white backdrop-blur">
                  {ordinal(active.rank)} place
                </span>
              </div>

              <div className="p-6">
                <motion.p
                  layoutId={`brand-${active.id}-${layoutScope}`}
                  className="text-lg font-bold text-ink"
                >
                  {active.brand}
                </motion.p>
                <motion.p
                  layoutId={`name-${active.id}-${layoutScope}`}
                  className="mt-0.5 text-sm text-muted"
                >
                  {active.name}
                </motion.p>

                <div className="mt-3 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className="text-lg font-bold text-ink">₹{active.price}</span>
                  {active.originalPrice && active.originalPrice > active.price && (
                    <>
                      <span className="text-sm text-muted line-through">
                        ₹{active.originalPrice}
                      </span>
                      <span className="text-xs font-bold text-discount">
                        {discountPercent(active.price, active.originalPrice)}% OFF
                      </span>
                    </>
                  )}
                  <span className="ml-auto text-[11px] uppercase tracking-widest text-muted">
                    {active.category}
                  </span>
                </div>

                <div className="mt-5 border-t border-border pt-5">
                  <LikeBar likes={active.likes} votes={active.votes} />
                  <div className="mt-3 flex items-center justify-between text-sm">
                    <span className="flex items-center gap-1.5 font-bold text-brand">
                      <IconHeartFilled className="h-4 w-4" />
                      <span className="tabular-nums">{active.likes} liked</span>
                    </span>
                    <span className="tabular-nums text-muted">
                      {active.passes} passed
                    </span>
                  </div>
                  <p className="mt-3 text-xs leading-relaxed text-muted">
                    {itemVerdict(active, friendCount)}
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </main>
  );
}

function Verdict({
  totalReactions,
  topLikes,
  winners,
  margin,
}: {
  totalReactions: number;
  topLikes: number;
  winners: ShowcaseResultItem[];
  margin: number | null;
}) {
  if (totalReactions === 0) {
    return (
      <>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Waiting on your friends
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Nobody has reacted yet. Send the link below — results appear here as
          they come in.
        </p>
      </>
    );
  }

  // Reactions came in but nothing cleared zero likes. Naming a "winner" here
  // would be inventing one.
  if (topLikes === 0) {
    return (
      <>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          Nothing landed
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Every item got passed on. That&apos;s a real answer too — none of
          these are it.
        </p>
      </>
    );
  }

  if (winners.length > 1) {
    return (
      <>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          It&apos;s a tie
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {winners.length} items tied on {topLikes}{" "}
          {topLikes === 1 ? "like" : "likes"} —{" "}
          {winners.map((w) => w.brand).join(", ")}. Your call between them.
        </p>
      </>
    );
  }

  const winner = winners[0]!;
  return (
    <>
      <h1 className="text-2xl font-bold tracking-tight text-ink">
        {winner.brand} came out on top
      </h1>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        {winner.name} — liked by {winner.likes} of {winner.votes}
        {margin !== null && margin > 0
          ? `, ${margin} ahead of anything else.`
          : "."}
      </p>
    </>
  );
}

/**
 * The fine print a verdict needs to be trustworthy: how many people it rests
 * on, whether they finished, and whether more is still coming.
 */
function Caveats({
  totalReactions,
  friendCount,
  completedFriendCount,
  itemCount,
  lastVoteAt,
  now,
  revoked,
}: {
  totalReactions: number;
  friendCount: number;
  completedFriendCount: number;
  itemCount: number;
  lastVoteAt: string | null;
  now: number;
  revoked: boolean;
}) {
  if (totalReactions === 0) return null;

  const notes: string[] = [];

  if (friendCount === 1) {
    notes.push("Based on one friend so far");
  } else if (completedFriendCount < friendCount) {
    notes.push(
      `${completedFriendCount} of ${friendCount} friends rated all ${itemCount}`
    );
  }

  if (lastVoteAt) {
    notes.push(`last reaction ${relativeTime(lastVoteAt, now)}`);
  }

  if (!revoked) {
    notes.push("still open");
  }

  if (notes.length === 0) return null;

  return (
    <p className="mt-3 text-xs text-muted">
      {notes.join(" · ")}
    </p>
  );
}

/** Per-item context in the expanded card — the same honesty, scoped down. */
function itemVerdict(item: ShowcaseResultItem, friendCount: number): string {
  if (item.votes === 0) {
    return "Nobody reached this one yet.";
  }
  if (item.votes < friendCount) {
    return `Only ${item.votes} of ${friendCount} friends got to this one — the rest dropped off before reaching it.`;
  }
  if (item.likes === item.votes) {
    return "Unanimous — everyone who saw it liked it.";
  }
  if (item.likes === 0) {
    return "Everyone who saw it passed.";
  }
  return `Split ${item.likes}–${item.passes}.`;
}

function StatusPill({ revoked }: { revoked: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-widest",
        revoked ? "bg-canvas text-muted" : "bg-brand-soft text-brand-dark"
      )}
    >
      {revoked ? "Closed" : "Live"}
    </span>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="border-r border-border px-6 py-4 last:border-r-0 [&:nth-child(2)]:border-r-0 sm:[&:nth-child(2)]:border-r">
      <dt className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted">
        {label}
      </dt>
      <dd className="mt-1 text-2xl font-bold tabular-nums text-ink">{value}</dd>
    </div>
  );
}

/**
 * Proportion of likes, drawn rather than described — the difference between
 * 2-of-2 and 2-of-8 is the whole point and a number pair alone makes you do
 * the division yourself.
 */
function LikeBar({
  likes,
  votes,
  className,
}: {
  likes: number;
  votes: number;
  className?: string;
}) {
  const share = votes > 0 ? (likes / votes) * 100 : 0;
  return (
    <div
      className={cn("h-1.5 w-full overflow-hidden rounded-full bg-canvas", className)}
      role="img"
      aria-label={`${likes} of ${votes} liked`}
    >
      <div
        className="h-full rounded-full bg-brand transition-[width] duration-500"
        style={{ width: `${share}%` }}
      />
    </div>
  );
}

function RankBadge({ rank, isWinner }: { rank: number; isWinner: boolean }) {
  return (
    <span
      className={cn(
        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold tabular-nums",
        isWinner ? "bg-ink text-white" : "bg-canvas text-muted"
      )}
    >
      {rank}
    </span>
  );
}

function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}
