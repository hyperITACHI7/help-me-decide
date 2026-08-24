import "server-only";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

/**
 * First-party funnel events (phased_architecture.md §5 Phase 5, §6 metric
 * table) — bespoke to this product's five-step flow, so a third-party
 * analytics SaaS wouldn't give us these out of the box. sessionId is
 * intentionally optional: an event fired before a session cookie exists
 * (edge_case.md EC33) is still recorded, just not attributable to a session.
 *
 * Callers should `await` this. Fire-and-forget looks tempting but a
 * serverless function can be frozen the instant its response is sent
 * (Vercel), silently dropping an un-awaited write — worse for §6 metric
 * accuracy than a few extra milliseconds of latency. A failure here is
 * swallowed (logged, not thrown) so a broken analytics write can never take
 * down the actual product flow it's measuring.
 */
export async function track(
  eventName: string,
  opts: { sessionId?: string; props?: Record<string, unknown> } = {}
): Promise<void> {
  try {
    await prisma.analyticsEvent.create({
      data: {
        sessionId: opts.sessionId,
        eventName,
        props: opts.props as Prisma.InputJsonValue | undefined,
      },
    });
  } catch (err) {
    console.error(`[analytics] failed to record "${eventName}"`, err);
  }
}
