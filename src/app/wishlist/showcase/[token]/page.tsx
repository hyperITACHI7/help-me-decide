import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { ShowcasePanel } from "@/components/ShowcasePanel";

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

  // Scoped to the owner's session: a token alone must not expose the tally.
  const link = await prisma.shareLink.findFirst({
    where: { token, sessionId: session.id },
    include: {
      items: { include: { item: true }, orderBy: { position: "asc" } },
      votes: true,
    },
  });

  if (!link) {
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

  const tally = link.items.map(({ item }) => {
    const votes = link.votes.filter((v) => v.itemId === item.id);
    return {
      id: item.id,
      name: item.name,
      brand: item.brand,
      imageUrl: item.imageUrl,
      price: item.price,
      likes: votes.filter((v) => v.liked).length,
      votes: votes.length,
    };
  });

  return (
    <ShowcasePanel
      token={token}
      revoked={Boolean(link.revokedAt)}
      tally={tally}
    />
  );
}
