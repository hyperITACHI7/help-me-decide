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

/**
 * Original mark, not a stand-in for a real one — a shopper asked for
 * Myntra's actual "M" glyph here, which this project won't reproduce (it's
 * their trademark, and globals.css already draws that line: the palette is
 * "a design language reference, not the Myntra logo/wordmark"). This is a
 * heart outline (the wishlist icon used everywhere else in the header) with
 * a checkmark inside it — decided-on-what-you-love, for a decision-assist
 * tool over a wishlist — on the same brand-to-orange gradient the "HD" badge
 * it replaces already used.
 */
function Brand() {
  return (
    <Link href="/" className="relative z-20 mr-4 flex shrink-0 items-center">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand to-orange-400 shadow-sm">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden="true"
          className="h-5 w-5"
        >
          <path
            d="M12 20.5s-6.2-3.9-8.6-7.4C1.7 10.8 1.8 8.2 3.5 6.6c1.7-1.6 4.4-1.4 5.9.4L12 9.6l2.6-2.6c1.5-1.8 4.2-2 5.9-.4 1.7 1.6 1.8 4.2.1 6.5C18.2 16.6 12 20.5 12 20.5z"
            stroke="white"
            strokeWidth="1.4"
            strokeLinejoin="round"
            opacity="0.55"
          />
          <path
            d="M8.4 12.2l2.5 2.5 4.8-5"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="sr-only">Help Me Decide</span>
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
      <NavBody>
        <Brand />
        <NavItems items={NAV_ITEMS} className="text-xs font-bold tracking-wide" />
        <div className="relative z-20 flex shrink-0 items-center gap-5">
          <GooeyInput
            placeholder="Search for products, brands and more"
            collapsedWidth={200}
            expandedWidth={320}
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
