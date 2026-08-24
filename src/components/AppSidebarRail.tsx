"use client";

import { usePathname } from "next/navigation";
import { IconArrowsShuffle, IconHeart, IconHome2 } from "@tabler/icons-react";
import { SidebarProvider, DesktopSidebar, SidebarLink } from "@/components/ui/sidebar";

export function AppSidebarRail({ wishlistCount }: { wishlistCount: number }) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: <IconHome2 className="h-5 w-5 shrink-0 text-ink" /> },
    {
      href: "/wishlist",
      label: wishlistCount > 0 ? `Wishlist (${wishlistCount})` : "Wishlist",
      icon: <IconHeart className="h-5 w-5 shrink-0 text-ink" />,
    },
    {
      href: "/wishlist/decide",
      label: "Decide",
      icon: <IconArrowsShuffle className="h-5 w-5 shrink-0 text-ink" />,
    },
  ];

  return (
    <SidebarProvider>
      <DesktopSidebar className="sticky top-20 h-fit shrink-0 self-start rounded-r-2xl border-r border-border bg-surface">
        <div className="flex flex-col gap-1">
          {links.map((link) => (
            <SidebarLink
              key={link.href}
              link={{ label: link.label, href: link.href, icon: link.icon }}
              className={
                pathname === link.href
                  ? "rounded-lg bg-canvas px-2 text-brand"
                  : "rounded-lg px-2 hover:bg-canvas"
              }
            />
          ))}
        </div>
      </DesktopSidebar>
    </SidebarProvider>
  );
}
