import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { BackLink } from "@/components/BackLink";
import { ItemDetail } from "@/components/ItemDetail";
import { loadItemDetail } from "@/lib/loadItemDetail";

/**
 * The real product page — what a refresh, a direct link, or a shared URL
 * lands on. Reached by click from inside the app it's intercepted by
 * src/app/@modal/(.)item and shown as an overlay instead; both render the
 * same ItemDetail off the same loader.
 */
export default async function ItemPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  // EC1/EC2: no session, or a dangling one — fail soft to the chooser.
  const session = await getSession();
  if (!session) redirect("/");

  const item = await loadItemDetail(session.id, id);

  if (!item) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-base font-bold text-ink">Item not found</p>
        <p className="mt-2 text-sm text-muted">
          This item isn&apos;t in your current session&apos;s wishlist.
        </p>
        <Link href="/wishlist" className="mt-6 text-sm font-semibold text-brand underline">
          Back to wishlist
        </Link>
      </main>
    );
  }

  return (
    <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-6">
      <BackLink href="/wishlist" label="Back to wishlist" />
      <div className="mt-4">
        <ItemDetail item={item} />
      </div>
    </main>
  );
}
