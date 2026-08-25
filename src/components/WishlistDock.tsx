"use client";

import { IconSparkles, IconShare2, IconWashDrycleanOff } from "@tabler/icons-react";
import { FloatingDock } from "@/components/ui/floating-dock";

export function WishlistDock({
  onAiPick,
  onShowcase,
  canClean,
}: {
  onAiPick: () => void;
  onShowcase: () => void;
  canClean: boolean;
}) {
  const items = [
    {
      title: "AI Pick — choose items, AI picks the best 3",
      icon: <IconSparkles className="h-full w-full text-brand" />,
      onClick: onAiPick,
    },
    {
      title: "Showcase — pick items for friends to react to",
      icon: <IconShare2 className="h-full w-full text-ink" />,
      onClick: onShowcase,
    },
    {
      title: "Clean Wishlist — swipe to keep or delete",
      icon: <IconWashDrycleanOff className="h-full w-full text-ink" />,
      href: "/wishlist/clean",
      disabled: !canClean,
    },
  ];

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-40 flex justify-center">
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
