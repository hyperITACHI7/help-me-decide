import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CleanDeck } from "@/components/CleanDeck";

export default async function CleanWishlistPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const items = await prisma.wishlistItem.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
  });

  if (items.length === 0) {
    redirect("/wishlist");
  }

  return (
    <CleanDeck
      items={items.map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        imageUrl: item.imageUrl,
        price: item.price,
        originalPrice: item.originalPrice,
        rating: item.rating,
      }))}
    />
  );
}
