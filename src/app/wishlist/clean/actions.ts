"use server";

import { revalidatePath } from "next/cache";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

export type CleanDecision =
  | { ok: true; deleted: true }
  | { ok: true; deleted: false; reason: "shared" }
  | { ok: false };

/**
 * Clean-wishlist swipe: right keeps, left deletes. Scoped by sessionId
 * because Server Actions are reachable by direct POST.
 *
 * Deleting a WishlistItem cascades to ShortlistTier, ShareLinkItem and Vote,
 * so an item currently on a *live* (non-revoked) share link is refused —
 * otherwise it would vanish out from under a friend who is mid-vote (F6/R6).
 * Revoked links aren't protected: nobody is looking at them.
 */
export async function removeWishlistItem(itemId: string): Promise<CleanDecision> {
  const session = await getSession();
  if (!session) return { ok: false };

  const item = await prisma.wishlistItem.findFirst({
    where: { id: itemId, sessionId: session.id },
    select: {
      id: true,
      shareLinkItems: { where: { shareLink: { revokedAt: null } }, select: { id: true } },
      shortlistTiers: {
        where: { shortlist: { shareLink: { revokedAt: null } } },
        select: { id: true },
      },
    },
  });

  if (!item) return { ok: false };

  if (item.shareLinkItems.length > 0 || item.shortlistTiers.length > 0) {
    return { ok: true, deleted: false, reason: "shared" };
  }

  await prisma.wishlistItem.delete({ where: { id: item.id } });
  await track("wishlist_item_removed", {
    sessionId: session.id,
    props: { itemId },
  });

  revalidatePath("/wishlist");
  revalidatePath("/");
  return { ok: true, deleted: true };
}
