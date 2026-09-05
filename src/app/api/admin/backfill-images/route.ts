import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SMALL_WISHLIST, LARGE_WISHLIST, imageUrlFor } from "@/lib/catalog";

/**
 * One-off data backfill, not a feature — remove this route once run.
 *
 * imageUrlFor's real-photo hotlinking (commit 8f85368, 2026-08-26) only
 * affects sessions created *after* that change: WishlistItem.imageUrl is a
 * plain column set once at createSeededSession time, so any row seeded
 * before then is still holding the inline colored-letter SVG the old
 * generator produced, forever — no amount of fixing imageUrlFor touches
 * already-seeded rows. This recomputes it for every row still on the old
 * scheme, by matching each row's `name` back to its catalog slug (there's no
 * slug column on WishlistItem to look up directly) and re-running the
 * current imageUrlFor against it.
 */
export async function POST() {
  const nameToSlug = new Map<string, string>();
  for (const item of [...SMALL_WISHLIST, ...LARGE_WISHLIST]) {
    nameToSlug.set(item.name, item.slug);
  }

  const stale = await prisma.wishlistItem.findMany({
    where: { imageUrl: { startsWith: "data:image/svg+xml" } },
    select: { id: true, name: true },
  });

  let updated = 0;
  const unmatched: string[] = [];

  for (const item of stale) {
    const slug = nameToSlug.get(item.name);
    if (!slug) {
      unmatched.push(item.name);
      continue;
    }
    await prisma.wishlistItem.update({
      where: { id: item.id },
      data: { imageUrl: imageUrlFor(slug) },
    });
    updated++;
  }

  return NextResponse.json({
    totalStale: stale.length,
    updated,
    unmatched: [...new Set(unmatched)],
  });
}
