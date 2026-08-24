"use server";

import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import type { TriageDirection } from "@/generated/prisma/client";

export interface DecideResult {
  effectiveDirection: TriageDirection;
  forced: boolean;
  keptCount: number;
  decidedCount: number;
  totalItems: number;
}

/**
 * F3 swipe triage, server-authoritative (edge_case.md §2.2 — decided here,
 * not left as a gap): a discard is silently converted to a keep whenever
 * discarding would make it mathematically impossible to still reach 3 kept
 * items from whatever's left undecided. This structurally prevents the
 * candidate set from ever dropping below 3 before step 4, which is exactly
 * why Shortlist.separable never has to represent "not enough candidates" as
 * well as "too similar" (edge_case.md §2.3) — that state can't occur.
 *
 * `candidateIds` scopes every count to the set the shopper is actually
 * triaging (their manual selection from the wishlist, or previously the
 * whole wishlist) — NOT the full wishlist, so the floor math stays correct
 * regardless of how many items are actually in play.
 *
 * Upsert on (sessionId, itemId), not insert (edge_case.md EC9/EC10) — a
 * double-submit or a resumed session after the browser back button
 * overwrites the same row instead of duplicating it.
 */
export async function decideItem(
  itemId: string,
  requested: TriageDirection,
  candidateIds: string[]
): Promise<DecideResult> {
  const session = await getSession();
  if (!session) {
    throw new Error("No active session");
  }
  if (!candidateIds.includes(itemId)) {
    throw new Error("Item is not part of the current candidate set");
  }

  const totalItems = candidateIds.length;
  const decisions = await prisma.triageDecision.findMany({
    where: { sessionId: session.id, itemId: { in: candidateIds } },
  });

  const priorDecisions = decisions.filter((d) => d.itemId !== itemId);
  const keptCount = priorDecisions.filter((d) => d.direction === "keep").length;
  const decidedBefore = priorDecisions.length;
  const undecidedIncludingThis = totalItems - decidedBefore;

  let effectiveDirection: TriageDirection = requested;
  let forced = false;
  if (
    requested === "discard" &&
    keptCount + (undecidedIncludingThis - 1) < 3
  ) {
    effectiveDirection = "keep";
    forced = true;
  }

  await prisma.triageDecision.upsert({
    where: { sessionId_itemId: { sessionId: session.id, itemId } },
    create: { sessionId: session.id, itemId, direction: effectiveDirection },
    update: { direction: effectiveDirection },
  });

  const newKeptCount =
    effectiveDirection === "keep" ? keptCount + 1 : keptCount;
  const newDecidedCount = decidedBefore + 1;

  if (newDecidedCount === totalItems) {
    await track("triage_completed", {
      sessionId: session.id,
      props: { keptCount: newKeptCount, totalItems },
    });
  }

  return {
    effectiveDirection,
    forced,
    keptCount: newKeptCount,
    decidedCount: newDecidedCount,
    totalItems,
  };
}

/**
 * Entry point from the wishlist's selection mode — the shopper picks
 * specific items to consider (rather than swiping the entire wishlist),
 * and this becomes the candidate set step 3 triages. Clears any decisions
 * left over from a previous selection so a candidate set never leaks
 * "keep" rows from an unrelated earlier attempt into the new one.
 */
export async function startTriageWithSelection(formData: FormData) {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const itemIds = formData.getAll("itemIds").map(String);

  const owned = await prisma.wishlistItem.findMany({
    where: { sessionId: session.id, id: { in: itemIds } },
    select: { id: true },
  });

  if (owned.length < 3) {
    // Not a valid candidate set (too few selected, or IDs that don't
    // belong to this session) — bounce back rather than enter a deck
    // that can never reach the floor of 3.
    redirect("/wishlist");
  }

  await prisma.triageDecision.deleteMany({ where: { sessionId: session.id } });

  const query = owned.map((i) => i.id).join(",");
  redirect(`/wishlist/decide?items=${query}`);
}
