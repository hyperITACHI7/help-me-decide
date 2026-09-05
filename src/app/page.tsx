import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { CatalogBrowser } from "@/components/CatalogBrowser";

export default async function LandingPage() {
  const session = await getSession();

  // First visit: seed the wishlist and come straight back. There used to be a
  // chooser here between a 3-item and a 60-item demo; the 60-item wishlist is
  // the only one now, so there's nothing to ask and the visitor lands on the
  // feed directly. Seeding lives in /start because it writes the session
  // cookie, which a Server Component can't do.
  if (!session) {
    redirect("/start");
  }

  const items = await prisma.wishlistItem.findMany({
    where: { sessionId: session.id },
  });

  // The site-wide header/sidebar (src/app/layout.tsx) already supplies the
  // logo, search, and wishlist icon, so this page renders only the feed. F1's
  // actual entry point lives on the wishlist; this is the realistic
  // navigational context before it.
  return (
    <CatalogBrowser
      items={items.map((item) => ({
        id: item.id,
        name: item.name,
        brand: item.brand,
        imageUrl: item.imageUrl,
        price: item.price,
        originalPrice: item.originalPrice,
        rating: item.rating,
        category: item.category,
        openCount: item.seededOpenCount + item.liveOpenCount,
      }))}
      // Never wired up before now, so clicking a card here did nothing —
      // the wishlist grid already links to the item page, this feed didn't.
      linkToItem
    />
  );
}
