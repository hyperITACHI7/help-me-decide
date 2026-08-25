"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { revokeShowcase } from "@/app/wishlist/showcaseActions";
import { ProductImage } from "@/components/ProductImage";

type TallyRow = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: number;
  likes: number;
  votes: number;
};

export function ShowcasePanel({
  token,
  revoked,
  tally,
}: {
  token: string;
  revoked: boolean;
  tally: TallyRow[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const [shareUrl, setShareUrl] = useState("");

  // Built client-side so the link always matches the host the shopper is
  // actually on (localhost in dev, the deployed origin in production).
  // window.location isn't available during SSR, and a lazy initializer would
  // desync hydration, so post-mount state really is the right shape here.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setShareUrl(`${window.location.origin}/vote/${token}`);
  }, [token]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  const totalVotes = tally.reduce((sum, row) => sum + row.votes, 0);

  return (
    <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
      <p className="text-xs text-muted">
        <Link href="/wishlist" className="underline">
          Wishlist
        </Link>
        <span className="mx-1">/</span> Showcase
      </p>
      <h1 className="mt-1 text-lg font-bold text-ink">
        Your showcase{" "}
        <span className="font-normal text-muted">— {tally.length} items</span>
      </h1>

      {revoked ? (
        <p className="mt-4 rounded-lg border border-border bg-surface px-4 py-3 text-sm text-muted">
          This showcase is closed. Friends who open the link will be told it&apos;s
          no longer accepting reactions.
        </p>
      ) : (
        <div className="mt-4 rounded-lg border border-border bg-surface p-4">
          <p className="text-xs font-semibold text-ink">
            Send this to friends — they react by swiping.
          </p>
          <div className="mt-2 flex items-center gap-2">
            <input
              readOnly
              value={shareUrl}
              aria-label="Showcase link"
              className="min-w-0 flex-1 truncate rounded border border-border bg-canvas px-2 py-2 text-xs text-ink"
            />
            <button
              type="button"
              onClick={copy}
              className="shrink-0 rounded bg-brand px-3 py-2 text-xs font-bold text-white"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              startTransition(async () => {
                await revokeShowcase(token);
                router.refresh();
              })
            }
            className="mt-3 text-xs font-semibold text-muted underline disabled:opacity-50"
          >
            Close this showcase
          </button>
        </div>
      )}

      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-muted">
        Reactions {totalVotes === 0 ? "— none yet" : `— ${totalVotes} so far`}
      </p>

      <ul className="mt-3 space-y-3">
        {tally.map((row) => (
          <li
            key={row.id}
            className="flex items-center gap-3 rounded-lg border border-border bg-surface p-2"
          >
            <div className="h-16 w-12 shrink-0 overflow-hidden rounded bg-canvas">
              <ProductImage
                src={row.imageUrl}
                alt={row.name}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-ink">{row.brand}</p>
              <p className="truncate text-xs text-muted">{row.name}</p>
              <p className="text-xs font-semibold text-ink">₹{row.price}</p>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-sm font-bold text-brand">{row.likes} ♥</p>
              <p className="text-[11px] text-muted">of {row.votes}</p>
            </div>
          </li>
        ))}
      </ul>

      <Link
        href="/wishlist"
        className="mt-6 block text-center text-xs font-semibold text-muted underline"
      >
        Back to wishlist
      </Link>
    </main>
  );
}
