"use server";

import { nanoid } from "nanoid";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { friendVoteEnabled } from "@/lib/featureFlags";

export type ShareStatus = {
  token: string;
  revoked: boolean;
  tally: { itemId: string; likes: number; votes: number }[];
};

async function assertOwnedSeparableShortlist(shortlistId: string) {
  const session = await getSession();
  if (!session) throw new Error("No active session");

  const shortlist = await prisma.shortlist.findFirst({
    where: { id: shortlistId, sessionId: session.id },
    include: { tiers: true },
  });
  if (!shortlist) throw new Error("Shortlist not found for this session");
  if (!shortlist.separable) {
    throw new Error("Cannot share a shortlist with no 3-tier result");
  }
  return { session, shortlist };
}

/**
 * F6 (share link) — only ever references a Shortlist (its 3 tiered items),
 * never the owner's full wishlist (R6/edge_case.md EC28's privacy point).
 * Re-sharing after a revoke reopens the same token rather than minting a new
 * one, since ShareLink.shortlistId is unique by design.
 */
export async function createShareLink(shortlistId: string): Promise<string> {
  if (!friendVoteEnabled()) {
    throw new Error("Friend voting is disabled");
  }
  const { session, shortlist } = await assertOwnedSeparableShortlist(shortlistId);

  const existing = await prisma.shareLink.findUnique({ where: { shortlistId } });
  if (existing) {
    if (existing.revokedAt) {
      await prisma.shareLink.update({
        where: { id: existing.id },
        data: { revokedAt: null },
      });
    }
    return existing.token;
  }

  const token = nanoid(12);
  await prisma.shareLink.create({ data: { shortlistId: shortlist.id, token } });
  await track("share_link_created", { sessionId: session.id, props: { shortlistId } });
  return token;
}

export async function revokeShareLink(shortlistId: string): Promise<void> {
  const { session } = await assertOwnedSeparableShortlist(shortlistId);
  const link = await prisma.shareLink.findUnique({ where: { shortlistId } });
  if (!link || link.revokedAt) return;

  await prisma.shareLink.update({
    where: { id: link.id },
    data: { revokedAt: new Date() },
  });
  // §6 guardrail: "share regret" = a link revoked shortly after sending.
  await track("share_link_revoked", { sessionId: session.id, props: { shortlistId } });
}

export async function getShareStatus(shortlistId: string): Promise<ShareStatus | null> {
  const { shortlist } = await assertOwnedSeparableShortlist(shortlistId);

  const link = await prisma.shareLink.findUnique({
    where: { shortlistId },
    include: { votes: true },
  });
  if (!link) return null;

  const tally = shortlist.tiers.map((tier) => {
    const itemVotes = link.votes.filter((v) => v.itemId === tier.itemId);
    return {
      itemId: tier.itemId,
      likes: itemVotes.filter((v) => v.liked).length,
      votes: itemVotes.length,
    };
  });

  return { token: link.token, revoked: Boolean(link.revokedAt), tally };
}
