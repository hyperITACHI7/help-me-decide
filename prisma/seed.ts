// Phase 0 smoke test, not a persistent data seed (see phased_architecture.md
// §5 Phase 0). Session/WishlistItem rows are created per real visitor by
// src/lib/session.ts — this script only proves the DB round-trip and the
// catalog itself work end to end, then cleans up after itself.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { SMALL_WISHLIST, LARGE_WISHLIST, imageUrlFor } from "../src/lib/catalog";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function checkVariant(
  label: "small" | "large",
  catalog: typeof SMALL_WISHLIST
) {
  const session = await prisma.session.create({
    data: {
      wishlistVariant: label,
      items: {
        create: catalog.map((item) => ({
          name: item.name,
          brand: item.brand,
          imageUrl: imageUrlFor(item.slug),
          price: item.price,
          originalPrice: item.originalPrice,
          rating: item.rating,
          category: item.category,
          tags: item.tags,
          seededOpenCount: item.seededOpenCount,
        })),
      },
    },
    include: { items: true },
  });

  const expected = catalog.length;
  const actual = session.items.length;
  console.log(
    `[${label}] created session ${session.id} with ${actual}/${expected} items`
  );
  if (actual !== expected) {
    throw new Error(`[${label}] expected ${expected} items, got ${actual}`);
  }

  await prisma.session.delete({ where: { id: session.id } });
  console.log(`[${label}] cleaned up`);
}

async function main() {
  await checkVariant("small", SMALL_WISHLIST);
  await checkVariant("large", LARGE_WISHLIST);
  console.log("\nDB round-trip OK for both wishlist variants.");
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
