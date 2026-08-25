"use server";

import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";

/**
 * Public, unauthenticated vote — reachable by anyone with the token (N3).
 * Keyed per (link, voter, item), not per link (edge_case.md §2.1): each of
 * the 3 shared items gets its own like/dislike swipe, matching F7's "swipe
 * votes" (plural) and mirroring step 3's own triage mechanic.
 *
 * voterFingerprint is a random id the vote page keeps in localStorage — never
 * an identity (R6/N3) — used only to stop trivial double-voting from the
 * same browser (edge_case.md EC25, an accepted limitation, not solved here).
 */
export async function castVote(
  token: string,
  itemId: string,
  voterFingerprint: string,
  liked: boolean
): Promise<{ ok: true } | { ok: false; reason: "invalid" | "revoked" }> {
  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: { shortlist: { include: { tiers: true } }, items: true },
  });

  if (!link) return { ok: false, reason: "invalid" };
  // EC24 (edge_case.md): a vote racing an in-flight revoke — re-check here,
  // not just on page load, so a revoke that lands mid-session still wins.
  if (link.revokedAt) return { ok: false, reason: "revoked" };

  // The item must belong to whichever set this link actually shares, so a
  // forged itemId can't attract votes onto something never shared.
  const belongsToLink =
    link.items.some((i) => i.itemId === itemId) ||
    (link.shortlist?.tiers.some((t) => t.itemId === itemId) ?? false);
  if (!belongsToLink) return { ok: false, reason: "invalid" };

  await prisma.vote.upsert({
    where: {
      shareLinkId_voterFingerprint_itemId: {
        shareLinkId: link.id,
        voterFingerprint,
        itemId,
      },
    },
    create: { shareLinkId: link.id, itemId, voterFingerprint, liked },
    update: { liked },
  });

  await track("vote_cast", { props: { shareLinkId: link.id, itemId, liked } });
  return { ok: true };
}
