import { redirect } from "next/navigation";
import { getSession, createSeededSession } from "@/lib/session";

/**
 * Provisions the demo wishlist for a first-time visitor, then drops them on
 * the home feed.
 *
 * This exists as a route handler rather than living in the landing page
 * because seeding sets the session cookie, and a Server Component can't write
 * cookies — only a Route Handler or Server Action can. The chooser screen used
 * to cover that gap by making the visitor press a button (a Server Action);
 * with one fixed wishlist size there's nothing left to choose, so the redirect
 * does it instead.
 *
 * A GET that writes is normally worth avoiding, but nothing links here for a
 * prefetcher to trip over, and the worst case is an unused demo session row.
 */
export async function GET() {
  // Guards the double-fire case: a visitor who already has a session landing
  // here (a stale tab, a manual URL) shouldn't be handed a second wishlist.
  const existing = await getSession();
  if (!existing) {
    await createSeededSession("large");
  }
  redirect("/");
}
