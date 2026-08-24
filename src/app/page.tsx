import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { startDemo } from "@/app/actions";
import { MyntraHome } from "@/components/MyntraHome";

export default async function LandingPage() {
  const session = await getSession();

  // Returning visitor with a live session — show the home screen instead of
  // the demo chooser (F1's actual entry point lives on the wishlist, this
  // page is just realistic navigational context before it).
  if (session) {
    const wishlistCount = await prisma.wishlistItem.count({
      where: { sessionId: session.id },
    });
    return <MyntraHome wishlistCount={wishlistCount} />;
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
