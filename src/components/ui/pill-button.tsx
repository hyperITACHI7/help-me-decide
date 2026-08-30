"use client";

import { cn } from "@/lib/utils";

/**
 * Shared between the per-category "Narrow it down" panel and the wishlist-
 * wide AI Pick flow — both ask a shopper to answer a few multiple-choice
 * questions one at a time, so they share this control rather than each
 * keeping its own copy.
 *
 * One option (or, in a finished summary, one confirmed answer). Sized to its
 * label rather than stretched to fill its container. The ring is an inset
 * box-shadow rather than a border: a border changes the box on hover, an
 * inset shadow paints inside a box that never moves.
 *
 * `selected` fills it solid — used both for the option a question already
 * has an answer for (revisited via back/forward) and, always, for a
 * summary's answers, since those aren't a multi-choice to pick between
 * anymore, just a record of what was picked. `large` bumps a summary's
 * buttons up a size from the in-progress ones, since those are meant to
 * read as a finished answer at a glance, not one of several options.
 */
export function PillButton({
  selected,
  large,
  onClick,
  children,
  ...rest
}: {
  selected?: boolean;
  large?: boolean;
  onClick: () => void;
  children: React.ReactNode;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        "rounded-full font-bold tracking-widest uppercase transition duration-200",
        large ? "px-7 py-3.5 text-sm" : "px-6 py-3 text-xs",
        selected
          ? "bg-ink text-white shadow-[inset_0_0_0_2px_var(--color-ink)]"
          : "bg-transparent text-ink shadow-[inset_0_0_0_2px_var(--color-border)] hover:bg-ink hover:text-white hover:shadow-[inset_0_0_0_2px_var(--color-ink)]",
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function CircleIconButton({
  icon: Icon,
  onClick,
  disabled,
  label,
}: {
  icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  disabled?: boolean;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-full border transition-colors",
        disabled
          ? "cursor-not-allowed border-border/50 text-muted/40"
          : "border-border text-muted hover:border-ink hover:text-ink",
      )}
    >
      <Icon className="h-4 w-4" />
    </button>
  );
}
