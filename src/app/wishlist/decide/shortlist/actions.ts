"use server";

import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import {
  synthesizeTiers,
  MAX_CANDIDATES_FOR_AI,
  type CandidateItem,
  type ShortlistOutcome,
} from "@/lib/shortlist";

async function loadCandidates(sessionId: string): Promise<CandidateItem[]> {
  const kept = await prisma.wishlistItem.findMany({
    where: {
      sessionId,
      triageDecisions: { some: { sessionId, direction: "keep" } },
    },
  });

  return [...kept]
    .sort(
      (a, b) =>
        b.seededOpenCount + b.liveOpenCount - (a.seededOpenCount + a.liveOpenCount)
    )
    .slice(0, MAX_CANDIDATES_FOR_AI)
    .map((i) => ({
      id: i.id,
      name: i.name,
      brand: i.brand,
      category: i.category,
      price: i.price,
      tags: i.tags,
    }));
}

/**
 * Phase 3 step 2 of 2 (edge_case.md §2.4/§2.5/EC12–EC20): synthesizes the
 * 3-tier shortlist from the candidate set + the shopper's narrowing answers,
 * retries once on a validation/guard failure, and only then reports the
 * distinct "infra error" state — never conflated with a genuine
 * "too similar to separate" model judgment (edge_case.md §2.3).
 */
export async function submitAnswers(
  answers: { question: string; answer: string }[]
): Promise<ShortlistOutcome> {
  const session = await getSession();
  if (!session) {
    return { status: "error", message: "No active session" };
  }

  const candidates = await loadCandidates(session.id);
  if (candidates.length < 3) {
    // Structurally shouldn't happen (the triage floor guarantees >= 3 kept),
    // but never silently proceed on a violated invariant.
    return { status: "error", message: "Fewer than 3 candidates were kept" };
  }

  let outcome = await synthesizeTiers(candidates, answers);
  if (outcome.status === "error") {
    outcome = await synthesizeTiers(candidates, answers);
  }

  if (outcome.status === "ok") {
    const shortlist = await prisma.shortlist.create({
      data: {
        sessionId: session.id,
        narrowingAnswers: answers,
        separable: true,
        tiers: {
          create: outcome.tiers.map((t) => ({
            tier: t.tier,
            itemId: t.itemId,
            reason: t.reason,
          })),
        },
      },
    });
    await track("shortlist_completed", {
      sessionId: session.id,
      props: { separable: true },
    });
    return { status: "ok", shortlistId: shortlist.id, tiers: outcome.tiers };
  }

  if (outcome.status === "not_separable") {
    await prisma.shortlist.create({
      data: {
        sessionId: session.id,
        narrowingAnswers: answers,
        separable: false,
        honestyReason: outcome.reason,
      },
    });
    await track("shortlist_completed", {
      sessionId: session.id,
      props: { separable: false },
    });
  }

  return outcome;
}
