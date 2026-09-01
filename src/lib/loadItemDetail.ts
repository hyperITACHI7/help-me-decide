import "server-only";
import { prisma } from "@/lib/prisma";
import { track } from "@/lib/analytics";
import { discountPercent } from "@/lib/display";
import {
  assignBadges,
  deliveryDays,
  perksFor,
  sizesFor,
  type BadgeKind,
  type Perk,
  type SizeOption,
} from "@/lib/productDetail";

export type ItemDetailData = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: number;
  originalPrice: number | null;
  rating: number;
  inBag: boolean;
  badge: BadgeKind | null;
  days: number;
  discountPct: number | null;
  sizes: SizeOption[];
  perks: Perk[];
};

/**
 * Shared by the full item page and the modal that intercepts it, so the two
 * can never drift into showing different products for the same URL.
 *
 * Returns null when the id doesn't belong to this session — the callers
 * render their own not-found, since one is a page and one is an overlay.
 */
export async function loadItemDetail(
  sessionId: string,
  id: string
): Promise<ItemDetailData | null> {
  const item = await prisma.wishlistItem.findFirst({
    where: { id, sessionId },
  });
  if (!item) return null;

  // Opening the item IS the page view, so F2's revealed-preference signal
  // (edge_case.md EC4) is recorded here rather than on the card's click.
  await prisma.wishlistItem.updateMany({
    where: { id: item.id, sessionId },
    data: { liveOpenCount: { increment: 1 } },
  });
  await track("item_opened", { sessionId, props: { itemId: item.id } });

  // Badges are scored per category, so the whole category has to be loaded to
  // know whether THIS item won anything.
  const categoryItems = await prisma.wishlistItem.findMany({
    where: { sessionId, category: item.category },
    select: {
      id: true,
      name: true,
      category: true,
      rating: true,
      price: true,
      originalPrice: true,
      createdAt: true,
    },
  });

  return {
    id: item.id,
    name: item.name,
    brand: item.brand,
    imageUrl: item.imageUrl,
    price: item.price,
    originalPrice: item.originalPrice,
    rating: item.rating,
    inBag: item.bagAddedAt !== null,
    badge: assignBadges(categoryItems).get(item.id) ?? null,
    days: deliveryDays(item.id),
    discountPct: discountPercent(item.price, item.originalPrice),
    sizes: sizesFor(item.category),
    perks: perksFor(item.tags),
  };
}
