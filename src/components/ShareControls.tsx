"use client";

import { useEffect, useRef, useState } from "react";
import {
  createShareLink,
  getShareStatus,
  revokeShareLink,
  type ShareStatus,
} from "@/app/wishlist/decide/shortlist/shareActions";
import { TIER_LABELS, type TierDisplay } from "@/lib/tierDisplay";

const POLL_MS = 4000;

export function ShareControls({
  shortlistId,
  tiers,
  enabled,
}: {
  shortlistId: string;
  tiers: TierDisplay[];
  enabled: boolean;
}) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<ShareStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function startPolling() {
    if (pollRef.current) clearInterval(pollRef.current);
    pollRef.current = setInterval(async () => {
      const s = await getShareStatus(shortlistId);
      setStatus(s);
      if (!s || s.revoked) {
        if (pollRef.current) clearInterval(pollRef.current);
      }
    }, POLL_MS);
  }

  async function handleShare() {
    setBusy(true);
    try {
      const token = await createShareLink(shortlistId);
      setShareUrl(`${window.location.origin}/vote/${token}`);
      const s = await getShareStatus(shortlistId);
      setStatus(s);
      startPolling();
    } finally {
      setBusy(false);
    }
  }

  async function handleRevoke() {
    setBusy(true);
    try {
      await revokeShareLink(shortlistId);
      setStatus((s) => (s ? { ...s, revoked: true } : s));
      if (pollRef.current) clearInterval(pollRef.current);
    } finally {
      setBusy(false);
    }
  }

  async function handleCopy() {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  // N2 (edge_case.md): nothing shared until the owner explicitly acts — this
  // whole panel starts inert.
  if (!enabled) return null;

  if (!shareUrl) {
    return (
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleShare()}
        className="mt-4 w-full rounded-lg border border-brand py-3 text-center text-sm font-bold text-brand disabled:opacity-50"
      >
        Send these 3 to friends for a vote
      </button>
    );
  }

  return (
    <div className="mt-4 rounded-xl bg-surface p-3 shadow-sm">
      <p className="text-xs font-semibold text-ink">
        {status?.revoked ? "Sharing stopped" : "Shared — anyone with this link can vote"}
      </p>
      <div className="mt-2 flex items-center gap-2">
        <input
          readOnly
          value={shareUrl}
          className="min-w-0 flex-1 truncate rounded border border-border bg-canvas px-2 py-1.5 text-xs text-muted"
        />
        <button
          type="button"
          onClick={() => void handleCopy()}
          className="shrink-0 rounded bg-ink px-2.5 py-1.5 text-xs font-semibold text-white"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>

      {status && status.tally.some((t) => t.votes > 0) && (
        <div className="mt-3 space-y-1.5">
          {status.tally.map((t) => {
            const tier = tiers.find((x) => x.itemId === t.itemId);
            return (
              <div key={t.itemId} className="flex items-center justify-between text-xs">
                <span className="truncate text-muted">
                  {tier ? `${TIER_LABELS[tier.tier]} — ${tier.brand}` : t.itemId}
                </span>
                <span className="font-semibold text-ink">
                  {t.likes}/{t.votes} liked
                </span>
              </div>
            );
          })}
        </div>
      )}
      {status && status.tally.every((t) => t.votes === 0) && !status.revoked && (
        <p className="mt-2 text-xs text-muted">No votes yet.</p>
      )}

      {!status?.revoked && (
        <button
          type="button"
          disabled={busy}
          onClick={() => void handleRevoke()}
          className="mt-3 text-xs font-semibold text-muted underline"
        >
          Stop sharing
        </button>
      )}
    </div>
  );
}
