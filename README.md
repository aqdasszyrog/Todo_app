# Todo

Personal and shared to-do lists with live updates and a chat on every shared task. Built with **Next.js 16** (App Router) and **Supabase** (Postgres, Auth, Realtime).

- [docs/auth-flow.md](docs/auth-flow.md): how login and sessions work
- [docs/realtime.md](docs/realtime.md): how live updates reach the right people
- [docs/billing.md](docs/billing.md): plans and Stripe payments

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in your Supabase URL and publishable key
npm run dev
```

Open http://localhost:3000.

## Project structure

```
src/
  app/                 Routes. (app)/ is the signed-in area and shares one layout.
  actions/             Server Actions: every write. Each checks the session and validates input.
  components/          UI, grouped by feature (tasks/, shared-tasks/, notifications/, …).
    realtime/          The one Realtime connection per tab (RealtimeProvider).
  hooks/               Client hooks: useRealtimeEvent, useNotifications, useTaskComments.
  lib/                 Types, validation and pure logic, shared by server and browser.
    data/              Server-side reads for pages.
    supabase/          Supabase clients and the generated database types.
supabase/
  migrations/          The database schema, in order. The source of truth for RLS.
  tests/               Database tests (pgTAP).
```

Rules of thumb:

- **Reads** for a page happen in Server Components through `lib/data/*`. **Writes** go through `actions/*`.
- **Security lives in Postgres.** RLS policies, `security definer` functions and triggers decide what each user can see and do. The app code checks input and turns errors into messages.
- **Live updates** come from database triggers that broadcast to one private channel per user. Components listen with `useRealtimeEvent()`; they never open channels of their own. See [docs/realtime.md](docs/realtime.md).

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Development server |
| `npm run check` | Lint, typecheck and unit tests (run before pushing) |
| `npm test` | Unit tests (Vitest), `src/**/*.test.ts` |
| `npm run test:db` | Database tests in `supabase/tests` (needs Docker and `npx supabase start`) |
| `npm run db:push` | Apply new migrations to the linked Supabase project |
| `npm run db:types` | Regenerate `src/lib/supabase/database.types.ts` from the linked project |
| `npm run build` | Production build |

## Database changes

Migrations live in `supabase/migrations` and are applied with the Supabase CLI (installed as a dev dependency).

**One-time setup** (links this folder to your Supabase project):

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
```

Migrations 001–010 were originally applied by hand in the SQL Editor, so the CLI doesn't know they've already run. Mark them as applied once:

```bash
npx supabase migration repair --status applied 001 002 003 004 005 006 007 008 009 010
```

**For each schema change:**

1. Add `supabase/migrations/NNN_description.sql`.
2. `npm run db:push` to apply it.
3. `npm run db:types` to regenerate the TypeScript types, then `npm run typecheck`.
4. Add or update a test in `supabase/tests/` if it touches RLS or triggers.

## Environment variables

| Variable | |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase Dashboard → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Same page. Safe in the browser; RLS protects the data. |
| `SUPABASE_SECRET_KEY` | Same page, "Secret keys". **Server-only.** Writes a user's plan after Stripe confirms payment |
| `STRIPE_SECRET_KEY` | Stripe Dashboard → Developers → API keys |
| `STRIPE_PREMIUM_PRICE_ID` | The Premium product's recurring price (`price_…`) |
| `STRIPE_WEBHOOK_SECRET` | The webhook endpoint's signing secret (`whsec_…`) |
| `DEV_ORIGINS` | Optional, dev only: comma-separated LAN IPs allowed to use `npm run dev` (e.g. your phone) |

The Stripe variables are optional until you sell Premium: without them the Plans page shows Premium as unavailable.

Missing required variables fail at startup with a clear message (`src/lib/env.ts`).
