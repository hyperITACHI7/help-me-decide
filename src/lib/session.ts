import "server-only";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { catalogFor, imageUrlFor } from "@/lib/catalog";
import { track } from "@/lib/analytics";
import type { WishlistVariant } from "@/generated/prisma/client";

export const SESSION_COOKIE = "hmd_session";

/**
 * EC2 (edge_case.md): a cookie can outlive its Session row (dev DB reseeded,
 * etc.) — always treat a dangling cookie as "no session", never throw.
 */
export async function getSession() {
  const store = await cookies();
  const id = store.get(SESSION_COOKIE)?.value;
  if (!id) return null;

  const session = await prisma.session.findUnique({ where: { id } });
  if (!session) return null;

  await prisma.session.update({
    where: { id },
    data: { lastSeenAt: new Date() },
  });
  return session;
}

/**
 * Provisions a fresh demo session for the chosen wishlist size (EC1/§2.6 —
 * the visitor picks a variant on the landing page rather than a coin-flip
 * default) and seeds its WishlistItem rows from the static catalog.
 */
export async function createSeededSession(variant: WishlistVariant) {
  const items = catalogFor(variant);

  const session = await prisma.session.create({
    data: {
      wishlistVariant: variant,
      items: {
        create: items.map((item) => ({
          name: item.name,
          brand: item.brand,
          imageUrl: imageUrlFor(item.slug, item.brand),
          price: item.price,
          originalPrice: item.originalPrice,
          rating: item.rating,
          category: item.category,
          tags: item.tags,
          seededOpenCount: item.seededOpenCount,
        })),
      },
    },
  });

  const store = await cookies();
  store.set(SESSION_COOKIE, session.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  await track("session_created", {
    sessionId: session.id,
    props: { variant, itemCount: items.length },
  });

  return session;
}
