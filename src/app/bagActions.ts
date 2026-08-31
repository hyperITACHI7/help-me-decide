"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { nanoid } from "nanoid";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

/**
 * Put a wishlist item in the bag, or take it back out.
 *
 * Scoped with `updateMany` + a sessionId filter for the same reason `openItem`
 * is: Server Actions are reachable by direct POST, so a forged itemId from
 * another session has to silently no-op rather than move someone else's item.
 *
 * `source` records which surface the shopper acted from — the wishlist grid,
 * the AI's picks, or a showcase result. That's what makes
 * `post_shortlist_action` (problem_statement.md §6, "the core efficacy
 * measure") answerable at last: until now nothing in the app fired it, because
 * there was no action after the shortlist to fire it about.
 */
export async function toggleBag(itemId: string, source: string): Promise<void> {
  if (typeof itemId !== "string" || itemId.length === 0) return;

  const session = await getSession();
  if (!session) return;

  const current = await prisma.wishlistItem.findFirst({
    where: { id: itemId, sessionId: session.id },
    select: { bagAddedAt: true },
  });
  if (!current) return;

  const adding = current.bagAddedAt === null;

  await prisma.wishlistItem.updateMany({
    where: { id: itemId, sessionId: session.id },
    data: { bagAddedAt: adding ? new Date() : null },
  });

  await track(adding ? "bag_add" : "bag_remove", {
    sessionId: session.id,
    props: { itemId, source },
  });

  // The AI put this item in front of the shopper and they acted on it. Fired
  // only for the AI-driven surfaces, so the metric measures the shortlist
  // rather than ordinary wishlist browsing.
  if (adding && (source === "ai_picks" || source === "showcase")) {
    await track("post_shortlist_action", {
      sessionId: session.id,
      props: { itemId, source },
    });
  }

  // The header's bag count is server-rendered, so without this it would sit
  // stale until the next navigation.
  revalidatePath("/", "layout");
}

/**
 * Place the order.
 *
 * This is a real record — see the Order model's comment — not a screen
 * rendered from throwaway state: the row persists, so the confirmation
 * survives a reload and stays readable at its own URL. What it isn't is a
 * transaction. No payment is taken and nothing ships, which the confirmation
 * page states plainly rather than leaving implied.
 *
 * Prices are snapshotted into the order because the order has to outlive the
 * wishlist rows it came from — clearing the bag (below) must not empty out
 * what was already ordered.
 */
export async function placeOrder(): Promise<void> {
  const session = await getSession();
  if (!session) redirect("/");

  const bagged = await prisma.wishlistItem.findMany({
    where: { sessionId: session.id, bagAddedAt: { not: null } },
    orderBy: { bagAddedAt: "asc" },
  });

  if (bagged.length === 0) redirect("/bag");

  const items = bagged.map((item) => ({
    itemId: item.id,
    name: item.name,
    brand: item.brand,
    imageUrl: item.imageUrl,
    price: item.price,
  }));
  const total = items.reduce((sum, item) => sum + item.price, 0);
  const number = `HMD${nanoid(8).toUpperCase()}`;

  await prisma.order.create({
    data: { sessionId: session.id, number, total, items },
  });

  // Emptied the way a real bag empties on checkout — the items stay on the
  // wishlist, they just leave the bag.
  await prisma.wishlistItem.updateMany({
    where: { sessionId: session.id, bagAddedAt: { not: null } },
    data: { bagAddedAt: null },
  });

  await track("order_placed", {
    sessionId: session.id,
    props: { itemCount: items.length, total },
  });

  revalidatePath("/", "layout");
  redirect(`/order/${number}`);
}
