import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { ShowcasePanel } from "@/components/ShowcasePanel";
import { loadShowcaseResults } from "@/lib/loadShowcaseResults";

/**
 * The real results page — what a refresh or a direct link lands on. Reached
 * by "View reactions" from the wishlist it's intercepted by
 * src/app/wishlist/@modal/(.)showcase and shown as an overlay instead; both
 * render the same panel off the same loader.
 */
export default async function ShowcaseOwnerPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const results = await loadShowcaseResults(session.id, token);

  if (!results) {
    return (
      <main className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-base font-bold text-ink">Showcase not found</p>
        <p className="mt-2 text-sm text-muted">
          This showcase doesn&apos;t belong to your current session.
        </p>
        <Link href="/wishlist" className="mt-6 text-sm font-semibold text-brand underline">
          Back to wishlist
        </Link>
      </main>
    );
  }

  return <ShowcasePanel {...results} />;
}
