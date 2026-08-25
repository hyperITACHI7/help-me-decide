"use client";

import { useEffect, useState } from "react";
import { castVote } from "@/app/vote/[token]/actions";
import { SwipeCardStack } from "@/components/SwipeCardStack";
import { ProductImage } from "@/components/ProductImage";

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

function VoteCardVisual({ item }: { item: VoteItem }) {
  return (
    <div className="w-full max-w-xs overflow-hidden rounded-2xl bg-surface shadow-lg">
      <div className="relative aspect-[3/4] w-full bg-canvas">
        <ProductImage
          src={item.imageUrl}
          alt={item.name}
          className="h-full w-full object-cover"
          draggable={false}
        />
      </div>
      <div className="p-3">
        <p className="truncate text-sm font-bold text-ink">{item.brand}</p>
        <p className="truncate text-xs text-muted">{item.name}</p>
        <p className="mt-1 text-sm font-bold text-ink">₹{item.price}</p>
      </div>
    </div>
  );
}

export function VotePanel({ token, items }: { token: string; items: VoteItem[] }) {
  const [fingerprint, setFingerprint] = useState<string | null>(null);
  const [queue, setQueue] = useState(items);
  const [votedCount, setVotedCount] = useState(0);
  const [pending, setPending] = useState(false);
  const [failed, setFailed] = useState<"invalid" | "revoked" | null>(null);

  useEffect(() => {
    // localStorage doesn't exist during SSR, so this genuinely can't be a
    // lazy useState initializer — it must run once, client-only, after mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFingerprint(getOrCreateFingerprint());
  }, []);

  async function vote(item: VoteItem, liked: boolean) {
    if (!fingerprint || pending) return;
    setPending(true);
    try {
      const result = await castVote(token, item.id, fingerprint, liked);
      if (!result.ok) {
        setFailed(result.reason);
        return;
      }
      setQueue((q) => q.filter((i) => i.id !== item.id));
      setVotedCount((n) => n + 1);
    } finally {
      setPending(false);
    }
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

  if (queue.length === 0) {
    return (
      <EmptyState
        title="Thanks for voting!"
        body="Your picks have been sent back to whoever shared this."
      />
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <p className="text-xs font-medium text-muted">
        Which of these do you like? ({votedCount + 1} of {items.length})
      </p>

      <div className="mt-4 flex flex-1 items-center justify-center">
        <SwipeCardStack
          queue={queue}
          disabled={pending || !fingerprint}
          leftLabel="PASS"
          rightLabel="LIKE"
          onSwipeLeft={(item) => void vote(item, false)}
          onSwipeRight={(item) => void vote(item, true)}
          renderCard={(item) => <VoteCardVisual item={item} />}
          describeItem={(item) => `${item.brand} ${item.name}, ₹${item.price}`}
        />
      </div>

      <div className="mt-4 flex justify-center gap-4 pb-2">
        <button
          type="button"
          disabled={pending || !fingerprint}
          onClick={() => void vote(queue[0], false)}
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-border bg-surface text-2xl text-muted shadow-sm disabled:opacity-50"
          aria-label="Pass on this item"
        >
          ✕
        </button>
        <button
          type="button"
          disabled={pending || !fingerprint}
          onClick={() => void vote(queue[0], true)}
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
