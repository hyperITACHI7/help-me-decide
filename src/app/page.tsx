import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { startDemo } from "@/app/actions";
import { CatalogBrowser } from "@/components/CatalogBrowser";

export default async function LandingPage() {
  const session = await getSession();

  // Returning visitor with a live session — show the home/browse screen
  // instead of the demo chooser (F1's actual entry point lives on the
  // wishlist, this page is just realistic navigational context before it).
  // The site-wide header/sidebar (src/app/layout.tsx) already supplies the
  // logo, search, and wishlist icon here, so this page renders only the feed.
  if (session) {
    const items = await prisma.wishlistItem.findMany({
      where: { sessionId: session.id },
    });

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
        }))}
      />
    );
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-16">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-brand text-lg font-extrabold text-white">
            HD
          </span>
          <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-ink">
            Help Me Decide
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            A demo wishlist styled after Myntra&apos;s app — pick a size to try
            the &ldquo;Help me decide&rdquo; flow. This prototype is not
            affiliated with or endorsed by Myntra.
          </p>
        </div>

        <div className="space-y-3">
          <form action={startDemo}>
            <input type="hidden" name="variant" value="small" />
            <button
              type="submit"
              className="w-full rounded-xl border border-border bg-surface px-5 py-4 text-left shadow-sm transition hover:border-brand"
            >
              <span className="block text-sm font-bold text-ink">
                Small wishlist
              </span>
              <span className="block text-xs text-muted">
                3 jackets — a quick, realistic decision
              </span>
            </button>
          </form>

          <form action={startDemo}>
            <input type="hidden" name="variant" value="large" />
            <button
              type="submit"
              className="w-full rounded-xl border border-border bg-surface px-5 py-4 text-left shadow-sm transition hover:border-brand"
            >
              <span className="block text-sm font-bold text-ink">
                Large wishlist
              </span>
              <span className="block text-xs text-muted">
                60 items across 8 categories — the stress-test case
              </span>
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
