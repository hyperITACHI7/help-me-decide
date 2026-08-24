"use client";

import { useEffect, useRef, useState } from "react";
import { castVote } from "@/app/vote/[token]/actions";

type VoteItem = {
  id: string;
  name: string;
  brand: string;
  imageUrl: string;
  price: number;
};

const FINGERPRINT_KEY = "hmd_voter_fingerprint";

function getOrCreateFingerprint(): string {
  const existing = window.localStorage.getItem(FINGERPRINT_KEY);
  if (existing) return existing;
  const fresh =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID()
      : `voter-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(FINGERPRINT_KEY, fresh);
  return fresh;
}

export function VotePanel({ token, items }: { token: string; items: VoteItem[] }) {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [index, setIndex] = useState(0);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<"invalid" | "revoked" | null>(null);
  const [dragX, setDragX] = useState(0);
  const dragging = useRef(false);
  const startX = useRef(0);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so this genuinely can't be a
    // lazy useState initializer — it must run once, client-only, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFingerprint(getOrCreateFingerprint());
  }, []);

  const current = items[index];

  async function vote(liked: boolean) {
    if (!current || !fingerprint || pending) return;
    setPending(true);
    try {
      const result = await castVote(token, current.id, fingerprint, liked);
      if (!result.ok) {
        setFailed(result.reason);
        return;
      }
      setIndex((i) => i + 1);
      setDragX(0);
    } finally {
      setPending(false);
    }
  }

  function onPointerDown(e: React.PointerEvent) {
    if (pending) return;
    dragging.current = true;
    startX.current = e.clientX;
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!dragging.current) return;
    setDragX(e.clientX - startX.current);
  }
  function onPointerUp() {
    if (!dragging.current) return;
    dragging.current = false;
    const threshold = 90;
    if (dragX > threshold) void vote(true);
    else if (dragX < -threshold) void vote(false);
    else setDragX(0);
  }

  if (failed === "revoked") {
    return (
      <EmptyState
        title="This list is no longer open for voting"
        body="Whoever sent you this has closed it. Ask them to send a new link."
      />
    );
  }
  if (failed === "invalid") {
    return (
      <EmptyState title="Something went wrong" body="Refresh the page and try again." />
    );
  }

  if (!current) {
    return (
      <EmptyState
        title="Thanks for voting!"
        body="Your picks have been sent back to whoever shared this."
      />
    );
  }

  const tilt = Math.max(-12, Math.min(12, dragX / 12));

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <p className="text-xs font-medium text-muted">
        Which of these do you like? ({index + 1} of {items.length})
      </p>

      <div className="mt-4 flex flex-1 items-center justify-center">
        <div
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
          style={{ transform: `translateX(${dragX}px) rotate(${tilt}deg)`, touchAction: "pan-y" }}
          className="relative w-full max-w-xs cursor-grab select-none overflow-hidden rounded-2xl bg-surface shadow-lg active:cursor-grabbing"
        >
          <div className="relative aspect-[3/4] w-full bg-canvas">
            {/* eslint-disable-next-line @next/next/no-img-element -- local SVG data URI */}
            <img
              src={current.imageUrl}
              alt={current.name}
              className="h-full w-full object-cover"
              draggable={false}
            />
            {dragX > 40 && (
              <span className="absolute right-3 top-3 rounded border-2 border-discount px-2 py-1 text-sm font-extrabold text-discount">
                LIKE
              </span>
            )}
            {dragX < -40 && (
              <span className="absolute left-3 top-3 rounded border-2 border-brand px-2 py-1 text-sm font-extrabold text-brand">
                PASS
              </span>
            )}
          </div>
          <div className="p-3">
            <p className="truncate text-sm font-bold text-ink">{current.brand}</p>
            <p className="truncate text-xs text-muted">{current.name}</p>
            <p className="mt-1 text-sm font-bold text-ink">₹{current.price}</p>
          </div>
        </div>
      </div>

      <div className="mt-4 flex justify-center gap-4 pb-2">
        <button
          type="button"
          disabled={pending || !fingerprint}
          onClick={() => void vote(false)}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border bg-surface text-2xl text-muted shadow-sm disabled:opacity-50"
          aria-label="Pass on this item"
        >
          ✕
        </button>
        <button
          type="button"
          disabled={pending || !fingerprint}
          onClick={() => void vote(true)}
          className="flex h-14 w-14 items-center justify-center rounded-full bg-brand text-2xl text-white shadow-sm disabled:opacity-50"
          aria-label="Like this item"
        >
          ♥
        </button>
      </div>
    </div>
  );
}

function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
      <p className="text-base font-bold text-ink">{title}</p>
      <p className="mt-2 text-sm text-muted">{body}</p>
    </div>
  );
}
