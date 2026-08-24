import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

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

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full`}>
      <body className="min-h-full flex flex-col bg-canvas text-ink antialiased">
        {children}
      </body>
    </html>
  );
}
