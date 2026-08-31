import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ShowcasePanel } from "@/components/ShowcasePanel";
import { requestNow } from "@/lib/relativeTime";

export default async function ShowcaseOwnerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  // Scoped to the owner's session: a token alone must not expose the tally.
  const link = await prisma.shareLink.findFirst({
    where: { token, sessionId: session.id },
    include: {
      items: { include: { item: true }, orderBy: { position: "asc" } },
      votes: true,
    },
  });

  if (!link) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-base font-bold text-ink">Showcase not found</p>
        <p className="mt-2 text-sm text-muted">
          This showcase doesn&apos;t belong to your current session.
        </p>
        <Link href="/wishlist" className="mt-6 text-sm font-semibold text-brand underline">
          Back to wishlist
        </Link>
      </main>
    );
  }

  const itemCount = link.items.length;

  const tallied = link.items.map(({ item }) => {
    const itemVotes = link.votes.filter((v) => v.itemId === item.id);
    const likes = itemVotes.filter((v) => v.liked).length;
    return {
      id: item.id,
      name: item.name,
      brand: item.brand,
      imageUrl: item.imageUrl,
      price: item.price,
      originalPrice: item.originalPrice,
      category: item.category,
      inBag: item.bagAddedAt !== null,
      likes,
      passes: itemVotes.length - likes,
      votes: itemVotes.length,
    };
  });

  // Ranked, because "which one won?" is the question this page exists to
  // answer and position order can't answer it. Primary sort is likes, then
  // votes — 3-of-3 outranks 3-of-5 at the same like count, since it's
  // stronger evidence. Anything still level after that keeps the order it
  // was added to the showcase: `tallied` comes from `link.items`, already
  // `position asc`, and `Array.sort` is stable, so ties fall back to that
  // order rather than to something invented (like alphabetical) that would
  // read as a claim about which item is "better".
  const sorted = [...tallied].sort(
    (a, b) => b.likes - a.likes || b.votes - a.votes
  );

  // The list is numbered densely (1, 2, 3, 4…) rather than with standard
  // competition ranking (1, 1, 1, 7) — six items sharing "1" and then
  // jumping to "7" reads as broken, not as a tie. `tieRank`/`tieSize` keep
  // the competition-style numbers alongside it, so anything that states a
  // position in words (the expanded card's "Nth place") can say "tied for
  // 1st" instead of a false "2nd place" for an item that didn't actually
  // lose to #1.
  const items = sorted.map((item, index) => ({
    ...item,
    rank: index + 1,
    tieRank: sorted.findIndex((other) => other.likes === item.likes) + 1,
    tieSize: sorted.filter((other) => other.likes === item.likes).length,
  }));

  // A reaction is a person, not a swipe: one friend rating 4 items is one
  // reaction, not four. The per-swipe total made a single enthusiastic
  // friend read as a crowd.
  const votesByFriend = new Map<string, number>();
  for (const vote of link.votes) {
    votesByFriend.set(
      vote.voterFingerprint,
      (votesByFriend.get(vote.voterFingerprint) ?? 0) + 1
    );
  }
  const reactionCount = votesByFriend.size;
  // Still tracked, just not shown as its own stat — it's what lets the page
  // say "2 of 3 rated everything", which is a caveat rather than a metric.
  const completedCount = [...votesByFriend.values()].filter(
    (n) => n >= itemCount
  ).length;

  const totalSwipes = link.votes.length;
  const totalLikes = link.votes.filter((v) => v.liked).length;
  const lastVoteAt = link.votes.reduce<Date | null>(
    (latest, v) => (latest === null || v.createdAt > latest ? v.createdAt : latest),
    null
  );

  return (
    <ShowcasePanel
      token={token}
      revoked={Boolean(link.revokedAt)}
      createdAt={link.createdAt.toISOString()}
      lastVoteAt={lastVoteAt ? lastVoteAt.toISOString() : null}
      // Rendered relative to a single instant shared by the server render and
      // the client's first render — see lib/relativeTime.
      nowMs={requestNow()}
      itemCount={itemCount}
      reactionCount={reactionCount}
      completedCount={completedCount}
      likedShare={totalSwipes > 0 ? totalLikes / totalSwipes : null}
      items={items}
    />
  );
}
