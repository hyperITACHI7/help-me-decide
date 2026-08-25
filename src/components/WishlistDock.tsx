"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { IconSparkles, IconShare2, IconWashDrycleanOff } from "@tabler/icons-react";
import { FloatingDock } from "@/components/ui/floating-dock";
import { cleanWishlist } from "@/app/actions";

export function WishlistDock({
  onAiPick,
  canShowcase,
  discardedCount,
}: {
  onAiPick: () => void;
  /** A shortlist only exists once triage has kept something. */
  canShowcase: boolean;
  discardedCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [confirmingClean, setConfirmingClean] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  function runClean() {
    setConfirmingClean(false);
    startTransition(async () => {
      const result = await cleanWishlist();
      const protectedNote =
        result.skippedProtected > 0
          ? `${result.skippedProtected} left in place — still used by a shortlist.`
          : "";
      setNotice(
        result.removed > 0
          ? `Removed ${result.removed} item${result.removed === 1 ? "" : "s"} you passed on. ${protectedNote}`.trim()
          : protectedNote || "Nothing to clean.",
      );
      router.refresh();
    });
  }

  const items = [
    {
      title: "AI Pick",
      icon: <IconSparkles className="h-full w-full text-brand" />,
      onClick: onAiPick,
    },
    {
      title: canShowcase ? "Showcase" : "Showcase — run AI Pick first",
      icon: <IconShare2 className="h-full w-full text-ink" />,
      href: "/wishlist/decide/shortlist",
      disabled: !canShowcase,
    },
    {
      title:
        discardedCount > 0
          ? `Clean Wishlist (${discardedCount})`
          : "Clean Wishlist — nothing passed on yet",
      icon: <IconWashDrycleanOff className="h-full w-full text-ink" />,
      onClick: () => setConfirmingClean(true),
      disabled: discardedCount === 0 || pending,
    },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex flex-col items-center gap-2">
      {notice && (
        <p className="pointer-events-auto rounded-full border border-border bg-surface px-4 py-1.5 text-xs text-ink shadow-md">
          {notice}
        </p>
      )}

      {confirmingClean && (
        <div className="pointer-events-auto flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg">
          <span className="text-xs text-ink">
            Remove {discardedCount} item{discardedCount === 1 ? "" : "s"} you passed
            on? This can&apos;t be undone.
          </span>
          <button
            type="button"
            onClick={() => setConfirmingClean(false)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-ink"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={runClean}
            className="rounded-lg bg-brand px-3 py-1.5 text-xs font-bold text-white"
          >
            Remove
          </button>
        </div>
      )}

      <div className="pointer-events-auto">
        <FloatingDock
          items={items}
          desktopClassName="border border-border bg-surface/95 shadow-lg backdrop-blur"
          mobileClassName="ml-auto mr-4"
        />
      </div>
    </div>
  );
}
