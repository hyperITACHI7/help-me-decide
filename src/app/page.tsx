import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { startDemo } from "@/app/actions";
import { CatalogBrowser } from "@/components/CatalogBrowser";

export default async function LandingPage() {
  const session = await getSession();

  // Returning visitor with a live session — show the home/browse screen
  // instead of the demo chooser (F1's actual entry point lives on the
  // wishlist, this page is just realistic navigational context before it).
  if (session) {
    const items = await prisma.wishlistItem.findMany({
      where: { sessionId: session.id },
    });

    return (
      <div className="flex flex-1 flex-col">
        <header className="border-b border-border bg-surface px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-extrabold text-white">
              HD
            </span>
            <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-canvas px-3 py-2">
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-muted">
                <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
                <path d="M17 17l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              <span className="truncate text-xs text-muted">Search items</span>
            </div>
            <Link
              href="/wishlist"
              aria-label={`Wishlist, ${items.length} items`}
              className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-canvas text-ink"
            >
              <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5">
                <path
                  d="M12 20s-7-4.35-9.5-8.8C.7 7.9 2.3 4.5 5.8 4c2-.28 3.7.72 4.7 2.3.5.8.5 1 1.5.8 1-.2 1.2-.5 1.7-1.3 1-1.5 2.7-2.5 4.7-2.2 3.5.5 5.1 3.9 3.3 7.2C19 15.65 12 20 12 20z"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinejoin="round"
                />
              </svg>
              {items.length > 0 && (
                <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                  {items.length}
                </span>
              )}
            </Link>
          </div>
        </header>

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
      </div>
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
