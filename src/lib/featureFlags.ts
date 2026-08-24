/**
 * Feature flag (phased_architecture.md Phase 4 / §7 R1,M2): step 5 is the
 * architecture's highest-risk element by the product's own design. This flag
 * lets it be switched off instantly if share-through tests near zero,
 * without touching anything in Phases 1–3.
 *
 * Plain sync helper — deliberately NOT inside a "use server" file, since a
 * Server Actions file may only export async actions.
 */
export function friendVoteEnabled(): boolean {
  return process.env.ENABLE_FRIEND_VOTE !== "false";
}
