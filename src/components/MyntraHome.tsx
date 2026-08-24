import Link from "next/link";

const CATEGORIES = [
  { label: "Fashion", emoji: "👕" },
  { label: "Beauty", emoji: "💄" },
  { label: "Homeliving", emoji: "🏠" },
  { label: "Footwear", emoji: "👟" },
  { label: "Accessories", emoji: "👜" },
];

const NAV_TABS = ["ALL", "MEN", "WOMEN", "KIDS"];

/**
 * A realistic Myntra-style home screen — the entry point before the
 * wishlist, so the "Help me decide" flow starts from a plausible product
 * surface rather than a bare demo chooser. Mostly decorative (search,
 * category tabs, hero banner); the wishlist icon is the one functional
 * link, since F1's entry point lives on the wishlist itself, not here.
 * Styled after Myntra's visual language, not affiliated with or using any
 * of Myntra's actual branding/imagery — see the disclaimer on the chooser.
 */
export function MyntraHome({ wishlistCount }: { wishlistCount: number }) {
  return (
    <div className="flex flex-1 flex-col pb-16">
      <header className="border-b border-border bg-surface px-4 pb-3 pt-4">
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand text-sm font-extrabold text-white">
            HD
          </span>
          <div className="flex flex-1 items-center gap-2 rounded-full border border-border bg-canvas px-3 py-2">
            <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 shrink-0 text-muted">
              <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.5" />
              <path d="M17 17l-3.5-3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <span className="truncate text-xs text-muted">Search for &ldquo;Jeans&rdquo;</span>
          </div>
          <Link
            href="/wishlist"
            aria-label={`Wishlist, ${wishlistCount} items`}
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
            {wishlistCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
                {wishlistCount}
              </span>
            )}
          </Link>
        </div>

        <div className="no-scrollbar mt-3 flex gap-5 overflow-x-auto text-xs font-bold tracking-wide text-muted">
          {NAV_TABS.map((tab, i) => (
            <span
              key={tab}
              className={
                i === 0
                  ? "border-b-2 border-brand pb-1 text-brand"
                  : "pb-1"
              }
            >
              {tab}
            </span>
          ))}
        </div>
      </header>

      <main className="flex-1">
        <div className="no-scrollbar flex gap-5 overflow-x-auto px-4 py-4">
          {CATEGORIES.map((cat) => (
            <div key={cat.label} className="flex shrink-0 flex-col items-center gap-1.5">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-soft text-2xl">
                {cat.emoji}
              </span>
              <span className="text-[11px] font-medium text-ink">{cat.label}</span>
            </div>
          ))}
        </div>

        <div className="mx-4 overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-dark px-5 py-8 text-white">
          <p className="text-xs font-semibold uppercase tracking-wide text-white/80">
            Featured brands
          </p>
          <p className="mt-1 text-2xl font-extrabold">Bestsellers</p>
          <p className="mt-1 text-sm text-white/90">Up to 50% off</p>
        </div>

        <div className="mx-4 mt-4 rounded-xl border border-border bg-surface p-4 text-center">
          <p className="text-xs text-muted">
            Saved something you can&apos;t choose between? Head to your{" "}
            <Link href="/wishlist" className="font-semibold text-brand">
              wishlist
            </Link>{" "}
            and let &ldquo;Help me decide&rdquo; narrow it down.
          </p>
        </div>
      </main>

      <div className="fixed inset-x-0 bottom-0 flex border-t border-border bg-surface px-2 py-2">
        <div className="flex flex-1 flex-col items-center gap-0.5 text-brand">
          <span className="text-lg">⌂</span>
          <span className="text-[10px] font-semibold">Home</span>
        </div>
        <Link
          href="/wishlist"
          className="flex flex-1 flex-col items-center gap-0.5 text-muted"
        >
          <span className="text-lg">♡</span>
          <span className="text-[10px] font-semibold">Wishlist</span>
        </Link>
        <div className="flex flex-1 flex-col items-center gap-0.5 text-muted">
          <span className="text-lg">🛍</span>
          <span className="text-[10px] font-semibold">Bag</span>
        </div>
      </div>
    </div>
  );
}
