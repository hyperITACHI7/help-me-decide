"use server";

import { redirect } from "next/navigation";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { MIN_SHOWCASE_ITEMS } from "@/lib/selectionLimits";

/**
 * Showcase (F7's swipe-vote mechanic, owner-picked set): the shopper hands
 * their friends a specific bunch of items to react to, rather than the AI's
 * three. Ownership is re-checked server-side because Server Actions are
 * reachable by direct POST — a forged itemId from another session must never
 * end up in someone's showcase.
 */
export async function createShowcase(formData: FormData) {
  const session = await getSession();
  if (!session) redirect("/");

  const itemIds = formData.getAll("itemIds").map(String);

  const owned = await prisma.wishlistItem.findMany({
    where: { sessionId: session.id, id: { in: itemIds } },
    select: { id: true },
  });

  if (owned.length < MIN_SHOWCASE_ITEMS) {
    redirect("/wishlist");
  }

  const token = nanoid(12);
  await prisma.shareLink.create({
    data: {
      token,
      sessionId: session.id,
      items: {
        create: owned.map((item, index) => ({
          itemId: item.id,
          position: index,
        })),
      },
    },
  });

  await track("showcase_created", {
    sessionId: session.id,
    props: { itemCount: owned.length },
  });

  redirect(`/wishlist/showcase/${token}`);
}

export async function revokeShowcase(token: string): Promise<void> {
  const session = await getSession();
  if (!session) return;

  // Scoped to the owner's session so a token alone can't close someone
  // else's showcase.
  await prisma.shareLink.updateMany({
    where: { token, sessionId: session.id, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  await track("showcase_revoked", { sessionId: session.id });
}
