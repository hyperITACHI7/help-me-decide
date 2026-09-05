"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

// The landing-page chooser action (edge_case.md §2.6 / EC1) used to live here,
// letting a cold visitor pick the 3-item or 60-item demo. The 60-item wishlist
// is the only size now, so there is nothing to choose: src/app/start seeds it
// on first visit instead, and this action is gone rather than left as an
// exported Server Action nobody calls — those stay reachable by direct POST.

/**
 * Myntra's listing cards expose an "Add to Wishlist" control on hover, so the
 * catalog card does too. In this prototype the home feed is seeded *from* the
 * session's wishlist, so every visible card is already wishlisted and this is
 * an idempotent ensure rather than an insert — it records the intent and
 * leaves the row untouched. Scoped by sessionId because Server Actions are
 * reachable by direct POST, not just through this UI.
 */
export async function addToWishlist(itemId: string) {
  if (typeof itemId !== "string" || itemId.length === 0) return;

  const session = await getSession();
  if (!session) return;

  const exists = await prisma.wishlistItem.count({
    where: { id: itemId, sessionId: session.id },
  });

  if (exists > 0) {
    await track("wishlist_add_clicked", { sessionId: session.id, props: { itemId } });
  }
}

// F2's revealed-preference signal (problem_statement.md §1 step 2, EC4) used
// to live here as an `openItem` action the card POSTed to. It moved into
// src/app/item/[id]/page.tsx when cards started opening a real product page:
// arriving on the page IS the open, so recording it there measures the same
// intent more directly and leaves no unreferenced Server Action behind — an
// exported action nobody calls is still a reachable POST endpoint.
