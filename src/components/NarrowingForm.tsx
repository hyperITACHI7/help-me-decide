"use client";

import { useEffect, useState } from "react";
import { submitAnswers } from "@/app/wishlist/decide/shortlist/actions";
import type { NarrowingQuestion, ShortlistOutcome } from "@/lib/shortlist";
import { TIER_LABELS } from "@/lib/tierDisplay";
import { ShareControls } from "@/components/ShareControls";

type CandidateDisplay = {
  id: string;
  name: string;
  brand: string;
  price: number;
  imageUrl: string;
};

export function NarrowingForm({
  questions,
  candidateItems,
  friendVoteEnabled,
}: {
  questions: NarrowingQuestion[];
  candidateItems: CandidateDisplay[];
  friendVoteEnabled: boolean;
}) {
  const [selected, setSelected] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [outcome, setOutcome] = useState<ShortlistOutcome | null>(null);
  // edge_case.md EC18: distinguish "still thinking" from "taking too long" —
  // a silent multi-second spinner reads as broken on first contact.
  const [slow, setSlow] = useState(false);

  useEffect(() => {
    if (!submitting) return;
    const timer = setTimeout(() => setSlow(true), 6000);
    return () => clearTimeout(timer);
  }, [submitting]);

  const allAnswered = questions.every((q) => selected[q.id]);

  async function handleSubmit() {
    if (!allAnswered || submitting) return;
    setSlow(false);
    setSubmitting(true);
    const started = performance.now();
    try {
      const answers = questions.map((q) => ({
        question: q.text,
        answer: selected[q.id],
      }));
      const result = await submitAnswers(answers);
      // §3.3 NFR check — logged for verification, not shown to the shopper.
      console.log(`[shortlist] resolved in ${Math.round(performance.now() - started)}ms`);
      setOutcome(result);
    } finally {
      setSubmitting(false);
    }
  }

  if (outcome) {
    return (
      <ShortlistResult
        outcome={outcome}
        candidateItems={candidateItems}
        friendVoteEnabled={friendVoteEnabled}
      />
    );
  }

  if (submitting) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-sm font-medium text-muted">
          {slow ? "Still working on it — a little longer than usual…" : "Finding your 3 picks…"}
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <h1 className="text-lg font-bold text-ink">A couple of quick questions</h1>
      <p className="mt-1 text-sm text-muted">
        This narrows your {candidateItems.length} kept items to 3 picks.
      </p>

      <div className="mt-5 space-y-6">
        {questions.map((q) => (
          <div key={q.id}>
            <p className="text-sm font-semibold text-ink">{q.text}</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {q.options.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSelected((s) => ({ ...s, [q.id]: opt }))}
                  className={`rounded-full border px-3 py-1.5 text-xs font-medium ${
                    selected[q.id] === opt
                      ? "border-brand bg-brand-soft text-brand-dark"
                      : "border-border bg-surface text-ink"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={!allAnswered}
        onClick={() => void handleSubmit()}
        className="mt-8 w-full rounded-lg bg-brand py-3 text-center text-sm font-bold text-white disabled:opacity-40"
      >
        See my picks
      </button>
    </div>
  );
}

function ShortlistResult({
  outcome,
  candidateItems,
  friendVoteEnabled,
}: {
  outcome: ShortlistOutcome;
  candidateItems: CandidateDisplay[];
  friendVoteEnabled: boolean;
}) {
  if (outcome.status === "not_configured" || outcome.status === "error") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-base font-bold text-ink">Couldn&apos;t reach the AI right now</p>
        <p className="mt-2 text-sm text-muted">
          {outcome.status === "not_configured"
            ? "GROQ_API_KEY is missing on the server — a setup gap, not a verdict on your items."
            : "This is a connection hiccup, not a verdict on your items. Try again in a moment."}
        </p>
      </div>
    );
  }

  if (outcome.status === "not_separable") {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="text-base font-bold text-ink">These are too close to call</p>
        <p className="mt-2 text-sm text-muted">{outcome.reason}</p>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col px-4 py-6">
      <h1 className="text-lg font-bold text-ink">Your 3 picks</h1>
      <p className="mt-1 text-xs text-muted">
        An AI suggestion based on your answers — not the final word.
      </p>

      <div className="mt-4 space-y-4">
        {outcome.tiers.map((tier) => {
          const item = candidateItems.find((c) => c.id === tier.itemId);
          if (!item) return null;
          return (
            <div key={tier.tier} className="flex gap-3 rounded-xl bg-surface p-3 shadow-sm">
              <div className="h-20 w-16 shrink-0 overflow-hidden rounded-lg bg-canvas">
                {/* eslint-disable-next-line @next/next/no-img-element -- local SVG data URI */}
                <img src={item.imageUrl} alt={item.name} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="inline-block rounded bg-brand-soft px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-brand-dark">
                  {TIER_LABELS[tier.tier]}
                </span>
                <p className="mt-1 truncate text-sm font-bold text-ink">{item.brand}</p>
                <p className="truncate text-xs text-muted">{item.name}</p>
                <p className="text-xs font-semibold text-ink">₹{item.price}</p>
                <p className="mt-1 text-xs text-muted">{tier.reason}</p>
              </div>
            </div>
          );
        })}
      </div>

      <ShareControls
        shortlistId={outcome.shortlistId}
        tiers={outcome.tiers.map((t) => ({
          tier: t.tier,
          itemId: t.itemId,
          brand: candidateItems.find((c) => c.id === t.itemId)?.brand ?? "",
        }))}
        enabled={friendVoteEnabled}
      />
    </div>
  );
}
