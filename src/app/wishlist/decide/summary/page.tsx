import Link from "next/link";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export default async function TriageSummaryPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const kept = await prisma.wishlistItem.findMany({
    where: {
      sessionId: session.id,
      triageDecisions: { some: { sessionId: session.id, direction: "keep" } },
    },
  });

  // Nobody has triaged yet — send them back to the deck rather than show an
  // empty summary.
  if (kept.length === 0) {
    redirect("/wishlist/decide");
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <h1 className="text-lg font-bold text-ink">
        Kept {kept.length} of your favourites
      </h1>
      <p className="mt-1 text-sm text-muted">
        Next, a couple of quick questions will narrow these down to 3 picks.
      </p>

      <div className="mt-5 grid grid-cols-2 gap-x-3 gap-y-5">
        {kept.map((item) => (
          <div key={item.id} className="overflow-hidden rounded-lg bg-surface">
            <div className="aspect-[3/4] w-full overflow-hidden rounded-lg bg-canvas">
              {/* eslint-disable-next-line @next/next/no-img-element -- local SVG data URI */}
              <img
                src={item.imageUrl}
                alt={item.name}
                className="h-full w-full object-cover"
              />
            </div>
            <p className="mt-2 truncate text-xs font-bold text-ink">{item.brand}</p>
            <p className="truncate text-xs text-muted">{item.name}</p>
          </div>
        ))}
      </div>

      <div className="mt-6">
        <Link
          href="/wishlist/decide/shortlist"
          className="block w-full rounded-lg bg-brand py-3 text-center text-sm font-bold text-white"
        >
          Continue
        </Link>
      </div>
    </div>
  );
}
