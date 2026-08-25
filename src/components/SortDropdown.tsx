"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { cn } from "@/lib/utils";

/** Panel motion lifted from Aceternity's navbar-menu dropdown. */
const transition = {
  type: "spring" as const,
  mass: 0.5,
  damping: 11.5,
  stiffness: 100,
  restDelta: 0.001,
  restSpeed: 0.001,
};

export type SortOption<T extends string> = { key: T; label: string };

export function SortDropdown<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SortOption<T>[];
  value: T;
  onChange: (next: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const active = options.find((o) => o.key === value) ?? options[0];

  // Click-to-open rather than the source component's hover, since a sort
  // control has to stay usable by keyboard and on touch.
  useEffect(() => {
    if (!open) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex w-60 items-center justify-between gap-3 border border-border bg-surface px-4 py-2.5 text-sm text-ink"
      >
        <span>
          Sort by : <span className="font-bold">{active.label}</span>
        </span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          className={cn(
            "h-4 w-4 shrink-0 text-muted transition-transform duration-200",
            open && "rotate-180",
          )}
        >
          <path
            d="M5 7.5l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 10 }}
            transition={transition}
            className="absolute right-0 top-[calc(100%_+_0.25rem)] z-50 w-60 origin-top overflow-hidden border border-border bg-surface shadow-xl"
          >
            <ul role="listbox" aria-label="Sort by" className="py-2">
              {options.map((option) => (
                <li key={option.key}>
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.key === value}
                    onClick={() => {
                      onChange(option.key);
                      setOpen(false);
                    }}
                    className={cn(
                      "block w-full px-4 py-2.5 text-left text-sm transition-colors hover:bg-canvas",
                      option.key === value
                        ? "font-bold text-brand"
                        : "text-ink",
                    )}
                  >
                    {option.label}
                  </button>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
