import "server-only";
import { prisma } from "@/lib/prisma";

export type ShowcaseTopItem = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: number;
  likes: number;
  votes: number;
};

export type ShowcaseSummary = {
  token: string;
  revoked: boolean;
  itemCount: number;
  /**
   * People, not swipes. One friend rating six items is one reaction — the
   * per-swipe count made a single enthusiastic friend look like a crowd.
   */
  reactionCount: number;
  /** Share of all swipes that were likes, or null before any come in. */
  likedShare: number | null;
  /**
   * Every item tied for the most likes — usually one, but ties are real and
   * common with a handful of voters, so this never silently picks a winner.
   * Empty until something is actually liked.
   */
  top: ShowcaseTopItem[];
};

/**
 * The shopper's most recent showcase, for the wishlist's status widget.
 * Returns null when they've never made one — the widget then shows its
 * invitation state instead of results.
 */
export async function loadLatestShowcase(
  sessionId: string
): Promise<ShowcaseSummary | null> {
  const link = await prisma.shareLink.findFirst({
    // Two conditions for one idea: "a showcase, not a shortlist share".
    // sessionId is only set on showcase links, and ShareLinkItems only exist
    // on showcases, so either would do — together they're unambiguous.
    where: { sessionId, items: { some: {} } },
    orderBy: { createdAt: "desc" },
    include: {
      items: { include: { item: true }, orderBy: { position: "asc" } },
      votes: true,
    },
  });

  if (!link) return null;

  const rows = link.items.map(({ item }) => {
    const itemVotes = link.votes.filter((v) => v.itemId === item.id);
    return {
      id: item.id,
      name: item.name,
      brand: item.brand,
      imageUrl: item.imageUrl,
      price: item.price,
      likes: itemVotes.filter((v) => v.liked).length,
      votes: itemVotes.length,
    };
  });

  const maxLikes = rows.reduce((max, row) => Math.max(max, row.likes), 0);
  // Nothing liked means no "most liked" — the first item at zero would read
  // as a result when it's just the default ordering.
  const tiedAtTop = maxLikes > 0 ? rows.filter((r) => r.likes === maxLikes) : [];

  // Same like count, so break it on conviction: 3-of-3 is a stronger signal
  // than 3-of-5. Only what's still level after that is reported as a tie.
  const bestRate = tiedAtTop.reduce(
    (max, row) => Math.max(max, row.votes > 0 ? row.likes / row.votes : 0),
    0
  );
  const top = tiedAtTop.filter(
    (r) => (r.votes > 0 ? r.likes / r.votes : 0) === bestRate
  );

  const totalSwipes = link.votes.length;
  const likes = link.votes.filter((v) => v.liked).length;

  return {
    token: link.token,
    revoked: Boolean(link.revokedAt),
    itemCount: link.items.length,
    reactionCount: new Set(link.votes.map((v) => v.voterFingerprint)).size,
    likedShare: totalSwipes > 0 ? likes / totalSwipes : null,
    top,
  };
}
