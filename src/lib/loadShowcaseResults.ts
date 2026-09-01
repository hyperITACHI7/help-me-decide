import "server-only";
import { prisma } from "@/lib/prisma";
import { requestNow } from "@/lib/relativeTime";
import type { ShowcaseResultItem } from "@/components/ShowcasePanel";

export type ShowcaseResults = {
  token: string;
  revoked: boolean;
  createdAt: string;
  lastVoteAt: string | null;
  nowMs: number;
  itemCount: number;
  reactionCount: number;
  completedCount: number;
  likedShare: number | null;
  items: ShowcaseResultItem[];
};

/**
 * Shared by the showcase results page and the modal that intercepts it, so
 * the overlay and a refresh of the same URL can't disagree about the tally.
 * Returns null when the token isn't this session's — the callers render their
 * own not-found, since one is a page and one is an overlay.
 */
export async function loadShowcaseResults(
  sessionId: string,
  token: string
): Promise<ShowcaseResults | null> {
  // Scoped to the owner's session: a token alone must not expose the tally.
  const link = await prisma.shareLink.findFirst({
    where: { token, sessionId },
    include: {
      items: { include: { item: true }, orderBy: { position: "asc" } },
      votes: true,
    },
  });

  if (!link) return null;

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

  return {
    token,
    revoked: Boolean(link.revokedAt),
    createdAt: link.createdAt.toISOString(),
    lastVoteAt: lastVoteAt ? lastVoteAt.toISOString() : null,
    // Rendered relative to a single instant shared by the server render and
    // the client's first render — see lib/relativeTime.
    nowMs: requestNow(),
    itemCount,
    reactionCount,
    completedCount,
    likedShare: totalSwipes > 0 ? totalLikes / totalSwipes : null,
    items,
  };
}
