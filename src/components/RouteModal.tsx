"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { IconX } from "@tabler/icons-react";
import { useOutsideClick } from "@/hooks/use-outside-click";

/**
 * The overlay shell for an intercepted route.
 *
 * Closing is `router.back()` rather than a state flag, because the modal IS a
 * history entry — the URL changed when it opened. Anything else would leave
 * the address bar pointing at a product the shopper is no longer looking at,
 * and would break the browser's own back button as the close gesture.
 *
 * The page underneath keeps rendering behind the blur, which is the whole
 * point: the wishlist stays visible so opening an item reads as a step
 * sideways rather than a trip to somewhere else.
 */
export function RouteModal({
  children,
  label,
}: {
  children: React.ReactNode;
  /** Names the dialog for screen readers — usually the product name. */
  label: string;
}) {
  const router = useRouter();
  const panelRef = useRef<HTMLDivElement>(null);

  useOutsideClick(panelRef, () => router.back());

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") router.back();
    }
    // Saved and restored rather than reset to "auto": this component doesn't
    // own the page's scroll state and shouldn't assume what it was.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [router]);

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.15 }}
        className="fixed inset-0 z-50 overflow-y-auto bg-ink/40 backdrop-blur-md"
      >
        <div className="flex min-h-full items-start justify-center p-4 sm:p-6">
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label={label}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative my-auto w-full max-w-5xl rounded-3xl bg-surface p-5 shadow-2xl sm:p-8"
          >
            <button
              type="button"
              onClick={() => router.back()}
              aria-label="Close"
              className="absolute right-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-canvas text-ink transition-colors hover:bg-border"
            >
              <IconX className="h-4 w-4" />
            </button>
            {children}
          </motion.div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
