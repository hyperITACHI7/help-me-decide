"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import {
  getCategoryPicks,
  type CategoryAnswer,
  type CategoryPicksView,
} from "@/lib/categoryPicks";

/**
 * Picks for one category of the shopper's own wishlist. The category's items
 * are read server-side from the session rather than accepted from the client,
 * for the same reason openItem is scoped by sessionId: Server Actions are
 * reachable by direct POST, so a forged item list must not be able to steer
 * what the AI sees or whose wishlist is read.
 */
export async function fetchCategoryPicks(
  category: string,
  answers: CategoryAnswer[] = []
): Promise<CategoryPicksView> {
  const session = await getSession();
  if (!session) return { status: "error", message: "No active session" };

  const rows = await prisma.wishlistItem.findMany({
    where: { sessionId: session.id, category },
  });

  if (rows.length === 0) {
    return { status: "too_few", count: 0, questions: [] };
  }

  const result = await getCategoryPicks(
    session.id,
    category,
    rows.map((item) => ({
      id: item.id,
      name: item.name,
      brand: item.brand,
      category: item.category,
      price: item.price,
      tags: item.tags,
      openCount: item.seededOpenCount + item.liveOpenCount,
    })),
    answers
  );

  // §6 leading indicators: this replaces "flow entry" as the top-of-funnel
  // signal, since picks now surface without a Help-me-decide tap.
  await track("category_picks_viewed", {
    sessionId: session.id,
    props: { category, status: result.status, refined: answers.length > 0 },
  });

  return result;
}
