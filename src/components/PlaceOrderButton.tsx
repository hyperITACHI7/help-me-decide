"use client";

import { useTransition } from "react";
import { IconLock } from "@tabler/icons-react";
import { placeOrder } from "@/app/bagActions";

/**
 * The checkout step.
 *
 * No payment form, deliberately: a prototype with no commerce backend must
 * never present fields that look like they take card details, because someone
 * would eventually type real ones into it. The note under the button says what
 * this does and doesn't do before it's pressed, not after.
 */
export function PlaceOrderButton() {
  const [pending, startTransition] = useTransition();

  return (
    <>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(async () => { await placeOrder(); })}
        className="w-full rounded-full bg-brand py-3.5 text-sm font-bold uppercase tracking-widest text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {pending ? "Placing order…" : "Place order"}
      </button>
      <p className="mt-3 flex items-start justify-center gap-1.5 text-center text-xs leading-relaxed text-muted">
        <IconLock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        <span>
          Prototype checkout — no payment is taken and nothing ships. Your order
          is recorded so you can see the confirmation step.
        </span>
      </p>
    </>
  );
}
