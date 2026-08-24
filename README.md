# Help Me Decide — web app

The build for `../problem_statement.md`. See `../phased_architecture.md` and `../edge_case.md` for the design and edge-case rationale behind everything below — this file only covers how to actually run and deploy it.

## Stack

Next.js 16 (App Router, Turbopack) · Prisma 7 (`@prisma/adapter-pg`) · PostgreSQL · Groq · Tailwind CSS v4.

## Local development

1. **Start the dev database** (Docker):
   ```bash
   docker compose up -d
   ```
   This runs Postgres on `localhost:5435` with credentials already wired into `.env`.

2. **Install dependencies** (also runs `prisma generate` via `postinstall`):
   ```bash
   npm install
   ```

3. **Apply the schema**:
   ```bash
   npx prisma migrate dev
   ```

4. **Set your Groq key** in `.env.local` (copy from `.env.example`):
   ```
   GROQ_API_KEY=your-key-from-console.groq.com
   ```
   Without this, Phase 3 (the AI shortlist) shows an honest "not configured" state instead of crashing — the rest of the app (wishlist, sort, triage) works fine without it.

5. **Run it**:
   ```bash
   npm run dev
   ```
   Open http://localhost:3000 — it starts on the landing/chooser page (pick a 3-item or 60-item demo wishlist).

### Useful scripts

| Command | What it does |
|---|---|
| `npm run db:seed` | Smoke-tests the DB round-trip for both wishlist variants (creates + deletes throwaway sessions) |
| `npx tsx scripts/check-groq.ts` | Confirms `GROQ_API_KEY` is set and both model tiers respond |
| `npm run lint` | ESLint |
| `npm run build` | Production build (also typechecks) |

## Deploying to production

### 1. Provision a production Postgres

Any of these work — pick whichever has the least setup friction (`phased_architecture.md` §9.1 deliberately left this open):

- **Neon** (neon.tech) — generous free tier, serverless-native.
- **Vercel Postgres** — zero-config if you're already deploying to Vercel.
- **Supabase** — also fine.

**Use the pooled connection string**, not the direct one. Vercel serverless functions can spin up many concurrent instances; each opens its own Postgres connection via `pg`, and a handful of cold starts under load can exhaust a small database's connection limit fast. Neon and Vercel Postgres both label the pooled variant clearly in their dashboards (usually via PgBouncer on port 6543 for Neon). For this project's expected traffic (a mentor cold-testing a link, not real production load) this is a safety margin, not a hard requirement — but there's no reason not to use it since it costs nothing extra.

### 2. Run the migration against production

```bash
DATABASE_URL="<your production pooled connection string>" npx prisma migrate deploy
```

`migrate deploy` (not `migrate dev`) — it applies existing migrations without prompting or generating new ones.

### 3. Set environment variables on your hosting provider

| Variable | Value |
|---|---|
| `DATABASE_URL` | The pooled production connection string from step 1 |
| `GROQ_API_KEY` | Same key used locally, or a separate one — see `edge_case.md` §2.5 if you're also running the Discovery Engine live at the same time (shared Groq rate-limit bucket) |
| `ENABLE_FRIEND_VOTE` | Leave unset unless you specifically want to disable step 5 |

### 4. Deploy

Vercel (recommended, since the whole stack was built assuming it — see `phased_architecture.md` §2 for why):

```bash
npx vercel
```

Follow the prompts to link/create a project under your own Vercel account, then set the environment variables from step 3 in the Vercel dashboard (Project → Settings → Environment Variables) before the first real deploy, or via:

```bash
npx vercel env add DATABASE_URL production
npx vercel env add GROQ_API_KEY production
npx vercel --prod
```

### 5. Post-deploy checklist (`edge_case.md` EC35, `problem_statement.md` §11)

Do this from a fresh incognito window — zero cookies, nothing cached:

- [ ] Landing page loads and both wishlist-size buttons work
- [ ] Sort, swipe triage, and the 3-tier shortlist all complete on the deployed URL (not just localhost)
- [ ] Open the vote link on an actual phone, not just a resized desktop browser (this is the one screen a friend will realistically open)
- [ ] No login wall anywhere on the path from landing → shortlist → vote
- [ ] Revoke a share link and confirm the vote page reflects it

## What's still open (research, not code)

- **P6–P8 parity checks** (`../vault/09-Assignment/07-Progress-Ledger.md`): live research on 2026-08-23 found Myntra's current AI investment is a conversational assistant ("Maya") for product discovery plus styling/outfit tools and size-and-fit prediction — not a "narrow my saved wishlist items into 3 tiers" feature, which is directional evidence against parity but not a substitute for checking the actual wishlist screen on a real account. Wishlist **collections/folders (P7) are confirmed already shipped** by Myntra (visible in the reference screenshots and independently confirmed) — expected and already priced into the design (`../vault/09-Assignment/17-Solution-Ranking.md` §3, idea 5: "salvage mechanic, drop framing"). Product comparison (P8) is unconfirmed either way.
- **`post_shortlist_action` metric** (`phased_architecture.md` §5 Phase 5): this MVP has no real add-to-cart/purchase flow to instrument — it's a decision-assist prototype, not a checkout. Stated here as an honest measurement gap rather than a fabricated button whose only purpose would be firing an analytics event.
