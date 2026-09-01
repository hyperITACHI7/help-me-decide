import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { ItemDetail } from "@/components/ItemDetail";
import { RouteModal } from "@/components/RouteModal";
import { loadItemDetail } from "@/lib/loadItemDetail";

/**
 * Intercepts /item/[id] when it's reached by a click from inside the app, so
 * the product opens over the wishlist instead of replacing it. A direct visit,
 * a refresh, or a shared link still renders the real page at src/app/item —
 * same component, same data loader, so the two can't drift.
 */
export default async function ItemModal({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await getSession();
  if (!session) redirect("/");

  const item = await loadItemDetail(session.id, id);

  // Nothing to overlay — fall through to the full page, which owns the
  // not-found copy.
  if (!item) return null;

  return (
    <RouteModal label={item.name}>
      <ItemDetail item={item} />
    </RouteModal>
  );
}
