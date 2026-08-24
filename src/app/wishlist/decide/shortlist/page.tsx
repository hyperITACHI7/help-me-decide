import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import {
  generateNarrowingQuestions,
  MAX_CANDIDATES_FOR_AI,
  type CandidateItem,
} from "@/lib/shortlist";
import { NarrowingForm } from "@/components/NarrowingForm";
import { friendVoteEnabled } from "@/lib/featureFlags";

export default async function ShortlistPage() {
  const session = await getSession();
  if (!session) {
    redirect("/");
  }

  const kept = await prisma.wishlistItem.findMany({
    where: {
      sessionId: session.id,
      triageDecisions: { some: { sessionId: session.id, direction: "keep" } },
    },
  });

  if (kept.length === 0) {
    redirect("/wishlist/decide");
  }

  const candidates: CandidateItem[] = [...kept]
    .sort(
      (a, b) =>
        b.seededOpenCount + b.liveOpenCount - (a.seededOpenCount + a.liveOpenCount)
    )
    .slice(0, MAX_CANDIDATES_FOR_AI)
    .map((i) => ({
      id: i.id,
      name: i.name,
      brand: i.brand,
      category: i.category,
      price: i.price,
      tags: i.tags,
    }));

  let questionResult = await generateNarrowingQuestions(candidates);
  if (questionResult.status === "error") {
    questionResult = await generateNarrowingQuestions(candidates);
  }

  if (questionResult.status === "not_configured") {
    return (
      <EmptyState
        title="AI shortlist isn't configured yet"
        body="GROQ_API_KEY is missing on the server — this is a setup gap, not a product judgment."
      />
    );
  }
  if (questionResult.status === "error") {
    return (
      <EmptyState
        title="Couldn't reach the AI right now"
        body="Give it another try in a moment — this is a connection hiccup, not a verdict on your items."
      />
    );
  }

  return (
    <NarrowingForm
      questions={questionResult.questions}
      candidateItems={kept
        .filter((k) => candidates.some((c) => c.id === k.id))
        .map((k) => ({
          id: k.id,
          name: k.name,
          brand: k.brand,
          price: k.price,
          imageUrl: k.imageUrl,
        }))}
      friendVoteEnabled={friendVoteEnabled()}
    />
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
