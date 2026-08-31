import Link from "next/link";
import { IconArrowLeft } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

/**
 * A real destination rather than history.back(): these pages are reachable
 * by a pasted link or a refresh, where there's nothing to go back to, and a
 * button that sometimes leaves the app is worse than one that always lands
 * somewhere sensible.
 */
export function BackLink({
  href,
  label,
  className,
}: {
  href: string;
  label: string;
  className?: string;
}) {
  return (
    <Link
      href={href}
      className={cn(
        "group inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-ink",
        className
      )}
    >
      <IconArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
      {label}
    </Link>
  );
}
