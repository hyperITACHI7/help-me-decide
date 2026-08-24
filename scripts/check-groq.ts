// Phase 0 smoke test for the Groq wrapper — confirms GROQ_API_KEY is present
// and both model tiers actually respond, before Phase 3 builds real prompts
// on top of this. Run with: npx tsx scripts/check-groq.ts
import { config } from "dotenv";
config({ path: ".env.local" });
config({ path: ".env" });
import { callGroqJson, GROQ_MODELS } from "../src/lib/groq";

async function main() {
  for (const tier of Object.keys(GROQ_MODELS) as (keyof typeof GROQ_MODELS)[]) {
    const result = await callGroqJson(
      tier,
      'Reply with the JSON object {"ok": true} and nothing else.'
    );
    console.log(`[${tier} → ${GROQ_MODELS[tier]}]`, result);
    if (!result.configured) {
      throw new Error("GROQ_API_KEY is not set in .env.local");
    }
    if (result.error) {
      throw new Error(`[${tier}] ${result.error}`);
    }
  }
  console.log("\nGroq wrapper OK on both tiers.");
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
