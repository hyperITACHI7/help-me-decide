"use server";

import { redirect } from "next/navigation";
import { createSeededSession, getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import type { WishlistVariant } from "@/generated/prisma/client";

/**
 * Landing-page chooser action (edge_case.md §2.6 / EC1) — a cold visitor
 * explicitly picks the 3-item or 60-item demo instead of a coin-flip
 * default, so F8's two sizes are both reliably reachable during cold-test.
 */
export async function startDemo(formData: FormData) {
  const variant = formData.get("variant");
  if (variant !== "small" && variant !== "large") {
    throw new Error(`Invalid wishlist variant: ${String(variant)}`);
  }
  await createSeededSession(variant as WishlistVariant);
  redirect("/wishlist");
}

/**
 * F2's revealed-preference signal (problem_statement.md §1 step 2) — a real
 * in-app action, not a dead counter (edge_case.md EC4). Scoped with
 * `updateMany` + a sessionId filter so a stray/forged itemId from a
 * different session can never be incremented (Server Actions are reachable
 * by direct POST, not just through this UI — see Next.js data-security guide).
 */
export async function openItem(formData: FormData) {
  const itemId = formData.get("itemId");
  if (typeof itemId !== "string") return;

  const session = await getSession();
  if (!session) return;

  const result = await prisma.wishlistItem.updateMany({
    where: { id: itemId, sessionId: session.id },
    data: { liveOpenCount: { increment: 1 } },
  });

  if (result.count > 0) {
    await track("item_opened", { sessionId: session.id, props: { itemId } });
  }
}
