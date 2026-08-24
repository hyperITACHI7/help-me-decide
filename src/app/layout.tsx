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

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await getSession();
  const wishlistCount = session
    ? await prisma.wishlistItem.count({ where: { sessionId: session.id } })
    : 0;

  return (
    <html lang="en" className={cn("h-full", inter.variable, "font-sans", geist.variable)}>
      <body className="min-h-full flex flex-col bg-canvas text-ink antialiased">
        {session ? (
          <AppChrome wishlistCount={wishlistCount}>{children}</AppChrome>
        ) : (
          children
        )}
      </body>
    </html>
  );
}
