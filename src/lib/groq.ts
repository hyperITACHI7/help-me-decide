// Groq client wrapper — model tiering per phased_architecture.md §2/§6.2.
//
// Reuses the exact model names the Discovery Engine already confirmed work
// on this Groq account/free-tier project (pipeline/config.py
// GROQ_MODEL_EXTRACTION / GROQ_MODEL_SYNTHESIS), rather than guessing at
// current model names cold — Groq's catalog turns over and the Discovery
// Engine already paid the cost of discovering that once.
//
// Phase 3 builds the actual narrowing-question and tier-synthesis prompts on
// top of this; this file only owns the transport + the three-way outcome
// (not configured / configured-but-errored / success) that keeps an infra
// failure from ever being mistaken for a model judgment (edge_case.md EC12).

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

export const GROQ_MODELS = {
  fast: "openai/gpt-oss-20b", // Phase 3: adaptive narrowing questions
  large: "openai/gpt-oss-120b", // Phase 3: one-shot 3-tier synthesis
} as const;

export type GroqTier = keyof typeof GROQ_MODELS;

// edge_case.md EC18: the §3.3 NFR is "a few seconds" — a hung request must
// fail into the same distinct infra-error state as any other Groq failure,
// not spin the "still thinking" UI indefinitely.
const REQUEST_TIMEOUT_MS = 12_000;

export interface GroqJsonOutcome<T> {
  /** false = no GROQ_API_KEY set at all — distinct from a call that ran and failed. */
  configured: boolean;
  raw?: string;
  parsed?: T;
  error?: string;
}

export async function callGroqJson<T = Record<string, unknown>>(
  tier: GroqTier,
  prompt: string,
  opts: { temperature?: number } = {}
): Promise<GroqJsonOutcome<T>> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    return { configured: false };
  }

  let res: Response;
  try {
    res = await fetch(GROQ_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: GROQ_MODELS[tier],
        messages: [{ role: "user", content: prompt }],
        temperature: opts.temperature ?? 0.2,
        response_format: { type: "json_object" },
      }),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (err) {
    // Network-level failure OR a timed-out request (AbortSignal.timeout) —
    // same "infra failure" bucket as a non-2xx response, never silently
    // swallowed and never left to hang past the §3.3 latency NFR.
    console.error(`[groq:${tier}] request failed`, err);
    return { configured: true, error: `Groq request failed: ${String(err)}` };
  }

  if (!res.ok) {
    const errBody = await res.text().catch(() => "");
    console.error(`[groq:${tier}] API error ${res.status}`, errBody.slice(0, 500));
    return {
      configured: true,
      error: `Groq API error ${res.status}: ${errBody.slice(0, 300)}`,
    };
  }

  const data = await res.json();
  const raw: string | undefined = data?.choices?.[0]?.message?.content;
  if (!raw) {
    return { configured: true, error: "Groq returned no content" };
  }

  try {
    const parsed = JSON.parse(raw) as T;
    return { configured: true, raw, parsed };
  } catch {
    return { configured: true, raw, error: "Model output was not valid JSON" };
  }
}
