import "server-only";
import { prisma } from "@/lib/prisma";

export type ShowcaseSummary = {
  token: string;
  revoked: boolean;
  itemCount: number;
  /** Every like/dislike swipe cast, across every item on the link. */
  totalReactions: number;
  /**
   * Distinct voterFingerprints — how many friends actually reacted.
   *
   * Deliberately NOT "viewers": nothing records opening the vote link without
   * voting (see app/vote/[token]/page.tsx — it renders, it doesn't track), so
   * a viewer count would be invented. This is the closest thing that is
   * really measured, and it's labelled as what it is.
   */
  friendCount: number;
  /** Share of all reactions that were likes, or null before any come in. */
  likedShare: number | null;
  top: {
    id: string;
    name: string;
    brand: string;
    imageUrl: string;
    price: number;
    likes: number;
    votes: number;
  } | null;
};

/**
 * The shopper's most recent showcase, for the wishlist's status widget.
 * Returns null when they've never made one — the widget renders nothing
 * rather than an empty placeholder.
 */
export async function loadLatestShowcase(
  sessionId: string
): Promise<ShowcaseSummary | null> {
  const link = await prisma.shareLink.findFirst({
    // Two conditions for one idea: "a showcase, not a shortlist share".
    // sessionId is only set on showcase links (createShareLink leaves it null
    // for shortlist-backed ones) and ShareLinkItems only exist on showcases,
    // so either would do — together they're unambiguous.
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

  // Tie-broken by name so the hero never silently depends on ShareLinkItem
  // position when two items are level on likes.
  const ranked = [...rows].sort(
    (a, b) => b.likes - a.likes || a.name.localeCompare(b.name)
  );

  const totalReactions = link.votes.length;
  const likes = link.votes.filter((v) => v.liked).length;

  return {
    token: link.token,
    revoked: Boolean(link.revokedAt),
    itemCount: link.items.length,
    totalReactions,
    friendCount: new Set(link.votes.map((v) => v.voterFingerprint)).size,
    likedShare: totalReactions > 0 ? likes / totalReactions : null,
    // No votes means no "most liked" — showing the first item at 0 ♥ would
    // read as a result when it's just the default ordering.
    top: totalReactions > 0 ? ranked[0]! : null,
  };
}
