"use server";

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
 * Upsert on (sessionId, itemId), not insert (edge_case.md EC9/EC10) — a
 * double-submit or a resumed session after the browser back button
 * overwrites the same row instead of duplicating it.
 */
export async function decideItem(
  itemId: string,
  requested: TriageDirection
): Promise<DecideResult> {
  const session = await getSession();
  if (!session) {
    throw new Error("No active session");
  }

  const [totalItems, decisions] = await Promise.all([
    prisma.wishlistItem.count({ where: { sessionId: session.id } }),
    prisma.triageDecision.findMany({ where: { sessionId: session.id } }),
  ]);

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
