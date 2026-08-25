import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { VotePanel } from "@/components/VotePanel";

// edge_case.md EC29: never index or preview-index a friend's shared
// shortlist link.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default async function VotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const link = await prisma.shareLink.findUnique({
    where: { token },
    include: {
      shortlist: {
        include: { tiers: { include: { item: true } } },
      },
      items: { include: { item: true }, orderBy: { position: "asc" } },
    },
  });

  // EC22 (edge_case.md): a syntactically plausible but nonexistent token —
  // a friendly page, not a raw 404.
  if (!link) {
    return (
      <EmptyState
        title="This link isn't valid"
        body="Double-check the link your friend sent you — it may have been mistyped."
      />
    );
  }

  // EC23: the owner revoked this link — must not silently accept a vote.
  if (link.revokedAt) {
    return (
      <EmptyState
        title="This list is no longer open for voting"
        body="Whoever sent you this has closed it. Ask them to send a new link."
      />
    );
  }

  // A showcase carries its own item set; a shortlist link resolves through
  // its tiers. Either way the friend swipes the same way.
  const source =
    link.items.length > 0
      ? link.items.map((i) => i.item)
      : (link.shortlist?.tiers.map((t) => t.item) ?? []);

  if (source.length === 0) {
    return (
      <EmptyState
        title="There's nothing to react to"
        body="This link doesn't have any items on it any more."
      />
    );
  }

  const items = source.map((item) => ({
    id: item.id,
    name: item.name,
    brand: item.brand,
    imageUrl: item.imageUrl,
    price: item.price,
  }));

  return <VotePanel token={token} items={items} />;
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}
