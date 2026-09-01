import type { Metadata } from "next";
import { Inter, Geist } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { AppChrome } from "@/components/AppChrome";

const geist = Geist({subsets:['latin'],variable:'--font-sans'});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Help Me Decide — Wishlist Demo",
  description:
    "A progressive decision-assist flow for a Myntra-style wishlist. Prototype for a NextLeap PM Fellowship graduation project — not affiliated with Myntra.",
};

export default async function RootLayout({ children, modal }: LayoutProps<"/">) {
  const session = await getSession();
  const [wishlistCount, bagCount] = session
    ? await Promise.all([
        prisma.wishlistItem.count({ where: { sessionId: session.id } }),
        prisma.wishlistItem.count({
          where: { sessionId: session.id, bagAddedAt: { not: null } },
        }),
      ])
    : [0, 0];

  return (
    <html lang="en" className={cn("h-full", inter.variable, "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col bg-canvas text-ink antialiased">
        {session ? (
          <AppChrome wishlistCount={wishlistCount} bagCount={bagCount}>
            {children}
          </AppChrome>
        ) : (
          children
        )}
        {/* Parallel slot for intercepted routes (src/app/@modal). Renders
            null on every normal page; an overlay sits here when a product is
            opened by click from inside the app. Outside AppChrome so the blur
            covers the header too. */}
        {modal}
      </body>
    </html>
  );
}
