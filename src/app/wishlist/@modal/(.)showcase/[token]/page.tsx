import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { RouteModal } from "@/components/RouteModal";
import { ShowcasePanel } from "@/components/ShowcasePanel";
import { loadShowcaseResults } from "@/lib/loadShowcaseResults";

/**
 * Intercepts the showcase results when "View reactions" is clicked from the
 * wishlist, so the tally opens over it rather than replacing it — the same
 * treatment the item page gets. A direct link or a refresh still renders the
 * full page.
 */
export default async function ShowcaseModal({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const session = await getSession();
  if (!session) redirect("/");

  const results = await loadShowcaseResults(session.id, token);

  // Nothing to overlay — fall through to the full page, which owns the
  // not-found copy.
  if (!results) return null;

  return (
    <RouteModal label="Showcase results">
      <ShowcasePanel {...results} inModal />
    </RouteModal>
  );
}
