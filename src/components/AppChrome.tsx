"use client";

import { usePathname } from "next/navigation";
import { SiteHeader } from "@/components/SiteHeader";
import { AppSidebarRail } from "@/components/AppSidebarRail";

export function AppChrome({
  wishlistCount,
  children,
}: {
  wishlistCount: number;
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  // Public vote pages are opened by friends who never created a wishlist
  // session — the branded nav/sidebar has nothing meaningful to link to for
  // them, so this minimal page stays chrome-free by design.
  if (pathname?.startsWith("/vote/")) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <SiteHeader wishlistCount={wishlistCount} />
      <div className="flex flex-1">
        <AppSidebarRail wishlistCount={wishlistCount} />
        <main className="flex min-w-0 flex-1 flex-col">{children}</main>
      </div>
    </div>
  );
}
