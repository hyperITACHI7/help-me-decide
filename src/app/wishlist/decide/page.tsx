import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { TriageDeck } from "@/components/TriageDeck";

export default async function DecidePage({
  searchParams,
}: {
  searchParams: Promise<{ items?: string }>;
}) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const { items: itemsParam } = await searchParams;
  const requestedIds = (itemsParam ?? "").split(",").filter(Boolean);

  // Entry is now via the wishlist's selection mode (WishlistGrid) — arriving
  // here without a valid selection (stale link, direct navigation) has
  // nothing to triage.
  if (requestedIds.length < 3) {
    redirect("/wishlist");
  }

  const [rawItems, decisions] = await Promise.all([
    prisma.wishlistItem.findMany({
      where: { sessionId: session.id, id: { in: requestedIds } },
    }),
    prisma.triageDecision.findMany({
      where: { sessionId: session.id, itemId: { in: requestedIds } },
    }),
  ]);

  if (rawItems.length < 3) {
    redirect("/wishlist");
  }

  const candidateIds = rawItems.map((i) => i.id);

  // Same order F2 already sorted the wishlist into — the highest-signal
  // items are triaged first (problem_statement.md §1 steps 2→3 flow into
  // each other).
  const sorted = [...rawItems].sort((a, b) => {
    const openDelta =
      b.seededOpenCount + b.liveOpenCount - (a.seededOpenCount + a.liveOpenCount);
    if (openDelta !== 0) return openDelta;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });

  const decidedIds = new Set(decisions.map((d) => d.itemId));
  const keptCount = decisions.filter((d) => d.direction === "keep").length;

  // EC10 (edge_case.md): resume from the first undecided card rather than
  // restarting the whole deck — a browser-back-then-forward mid-triage must
  // not re-litigate cards already swiped.
  const remaining = sorted.filter((item) => !decidedIds.has(item.id));

  await track("flow_entered", { sessionId: session.id });

  if (remaining.length === 0 && decisions.length > 0) {
    // Triage already finished in a prior visit — go straight to the summary.
    redirect("/wishlist/decide/summary");
  }

  return (
    <TriageDeck
      items={remaining.map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        imageUrl: item.imageUrl,
        price: item.price,
        originalPrice: item.originalPrice,
        rating: item.rating,
        category: item.category,
      }))}
      candidateIds={candidateIds}
      initialDecidedCount={decisions.length}
      initialKeptCount={keptCount}
      totalItems={sorted.length}
    />
  );
}
