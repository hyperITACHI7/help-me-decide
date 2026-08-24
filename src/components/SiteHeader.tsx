"use client";

import Link from "next/link";
import { useState } from "react";
import { IconHeart, IconShoppingBag, IconUser } from "@tabler/icons-react";
import {
  Navbar,
  NavBody,
  NavItems,
  MobileNav,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import { GooeyInput } from "@/components/ui/gooey-input";

const NAV_ITEMS = [
  { name: "HOME", link: "/" },
  { name: "MEN", link: "/" },
  { name: "WOMEN", link: "/" },
  { name: "KIDS", link: "/" },
  { name: "BEAUTY", link: "/" },
  { name: "GENZ", link: "/" },
];

function Brand() {
  return (
    <Link href="/" className="relative z-20 mr-4 flex shrink-0 items-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-orange-400 text-sm font-extrabold text-white shadow-sm">
        HD
      </span>
    </Link>
  );
}

function WishlistIcon({ wishlistCount, className }: { wishlistCount: number; className?: string }) {
  return (
    <Link
      href="/wishlist"
      aria-label={`Wishlist, ${wishlistCount} items`}
      className={className ?? "relative flex items-center justify-center text-ink"}
    >
      <IconHeart className="h-5 w-5" />
      {wishlistCount > 0 && (
        <span className="absolute -right-2 -top-2 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand px-1 text-[10px] font-bold text-white">
          {wishlistCount}
        </span>
      )}
    </Link>
  );
}

export function SiteHeader({ wishlistCount }: { wishlistCount: number }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <Navbar className="top-0">
      <NavBody className="justify-between gap-4">
        <Brand />
        <NavItems items={NAV_ITEMS} className="text-xs font-bold tracking-wide" />
        <div className="relative z-20 flex shrink-0 items-center gap-5">
          <GooeyInput
            placeholder="Search for products, brands and more"
            collapsedWidth={220}
            expandedWidth={360}
            classNames={{
              trigger: "bg-canvas text-ink ring-1 ring-border hover:bg-border/40",
              bubbleSurface: "bg-canvas text-ink ring-1 ring-border",
              input: "text-ink placeholder:text-muted",
            }}
          />
          <div className="flex items-center gap-4 text-ink">
            <IconUser className="h-5 w-5" aria-hidden />
            <WishlistIcon wishlistCount={wishlistCount} />
            <IconShoppingBag className="h-5 w-5" aria-hidden />
          </div>
        </div>
      </NavBody>

      <MobileNav>
        <MobileNavHeader>
          <Brand />
          <div className="flex items-center gap-4">
            <WishlistIcon wishlistCount={wishlistCount} className="relative flex items-center justify-center text-ink" />
            <MobileNavToggle isOpen={mobileOpen} onClick={() => setMobileOpen((v) => !v)} />
          </div>
        </MobileNavHeader>

        <MobileNavMenu isOpen={mobileOpen} onClose={() => setMobileOpen(false)}>
          {NAV_ITEMS.map((item) => (
            <a
              key={item.name}
              href={item.link}
              onClick={() => setMobileOpen(false)}
              className="text-sm font-bold tracking-wide text-ink"
            >
              {item.name}
            </a>
          ))}
        </MobileNavMenu>
      </MobileNav>
    </Navbar>
  );
}
