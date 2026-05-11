# Bella Care Tracker

Private family-facing care tracker built with Next.js App Router, TypeScript,
Tailwind, shadcn/ui-ready structure, and Supabase.

This repository contains the staging-ready MVP app surface plus the typed
backend contracts, services, Supabase migrations, and demo seed data.

## Local Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Install local database prerequisites:
   - Docker Desktop is required for the local Supabase stack. Start Docker
     before running `supabase start`.
   - The first `supabase start` can pull large Supabase containers.
   - `npm run db:verify:local-postgres` requires PostgreSQL 15 binaries
     (`initdb`, `pg_ctl`, and `psql`) on `PATH`.

   macOS example:

   ```bash
   brew install postgresql@15
   export PATH="/opt/homebrew/opt/postgresql@15/bin:$PATH"
   ```

3. Create local environment variables:

   ```bash
   cp .env.example .env.local
   ```

   After `supabase start`, replace the placeholder values in `.env.local` with
   the printed local keys:
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Supabase `Publishable` key.
   - `SUPABASE_SERVICE_ROLE_KEY`: Supabase `Secret` key.

4. Start Supabase locally from the `app/` directory:

   ```bash
   supabase start
   supabase db reset
   npm run supabase:seed
   npm run supabase:verify
   ```

5. Start the app:

   ```bash
   npm run dev
   ```

## Mobile Home Screen Install

Use a stable HTTPS deployment URL for iPhone install QA. In Safari, open Bella,
sign in, tap Share, choose Add to Home Screen, name it `Bella`, then launch it
from the Home Screen icon. Confirm the app opens full screen, avoids the status
bar and home indicator, and keeps the mobile bottom navigation tappable.

The service worker is production-only and intentionally caches static assets and
the generic offline page only. Authenticated pages, server actions, uploads, API
responses, and signed URLs must keep using the network.

Mobile rollout flags:

```bash
NEXT_PUBLIC_MOBILE_INSTALL_PROMPT_ENABLED=true
NEXT_PUBLIC_OFFLINE_CAPTURE_ENABLED=false
NEXT_PUBLIC_WEB_PUSH_ENABLED=false
```

Flags only hide unfinished UI; server validation and storage policies remain the
security boundary. If a bad service worker ships, deploy a new `public/sw.js`
with `ROLLBACK_UNREGISTER = true`; that worker clears `bella-*` caches,
unregisters itself, and reloads open clients.

## Scripts

- `npm run dev`: start the Next.js dev server.
- `npm run build`: build the Next.js app.
- `npm run typecheck`: run TypeScript checks.
- `npm run lint`: run ESLint.
- `npm run format`: check formatting with Prettier.
- `npm run test`: run Vitest tests.
- `npm run test:e2e`: run Playwright browser smokes. Tier-1 only by default;
  set `BELLA_E2E_SUPABASE=1` to run Tier-2 smokes against local Supabase.
  See `tests/e2e/README.md`.
- `npm run verify`: fast all-in-one — `typecheck && lint && format && test &&
build`. Use before opening a PR.
- `npm run verify:full`: `verify` plus `db:verify:local-postgres` and
  `test:e2e`. Use before tagging a staging release.
- `npm run supabase:seed`: load reference, demo, diagnostic-tree, historical,
  and current-records seed data into the running local Supabase database.
- `npm run supabase:verify`: run SQL checks for RLS, role, soft-delete, and
  storage boundaries against the running local Supabase database.
- `npm run db:verify:local-postgres`: run all migrations, all seed files twice,
  and the RLS verifier against a temporary PostgreSQL 15 database with Supabase
  auth/storage stubs.
- `npm run bootstrap:prepare`: scan `../records_md` and `../reports_md` into
  local review files for the one-time historical import.
- `npm run bootstrap:verify`: statically verify generated bootstrap review
  files.
- `npm run bootstrap:seed-sql`: regenerate the curated current-records seed at
  `supabase/seed/005_current_records_bootstrap.sql`.
- `npm run bootstrap:apply`: generate deterministic SQL from accepted bootstrap
  rows.
- `npm run bootstrap:apply:local`: generate and apply accepted bootstrap rows to
  a running local Supabase stack.
- `npm run import:inbox`: scan files dropped into `data/import-inbox/` and
  create inbox-specific review files.

AI import extraction requires server-side OpenAI credentials:

```bash
OPENAI_API_KEY=...
AI_IMPORT_MODEL=gpt-5.4-mini
AI_AGENT_MODEL=gpt-5.4-mini
```

The AI import assistant only creates reviewable drafts. Records are written
only after a draft is explicitly committed.

The multi-turn AI agent uses the same OpenAI key and falls back from
`AI_AGENT_MODEL` to `AI_IMPORT_MODEL`, then `OPENAI_MODEL`, then
`gpt-5.4-mini`. The agent can read family-scoped records through allowlisted
tools and create/update/reject import drafts, but it is not given a commit
tool. Human approval remains the only path to real record creation.

Apple Health manual exports are supported through the private attachment flow:
upload the iPhone Health `export.zip`, then call the Apple Health import action.
The importer stream-parses `export.xml`, dedupes repeat imports, and stores
daily summaries for charting. See `docs/backend/APPLE_HEALTH_IMPORT.md`.

## Testing

See `docs/qa/TESTING_STRATEGY.md` for the layered model, what each gate
covers, local/CI commands, and how to add new tests without committing
PHI. Use `docs/qa/STAGING_TEST_CHECKLIST.md` before tagging a staging
release.

## Migration Workflow

Raw Supabase SQL migrations are the source of truth under
`supabase/migrations/`. This keeps RLS policies, storage policies, triggers, and
SQL helpers reviewable without ORM indirection.

Reference seeds live in `supabase/seed/001_reference.sql`. Fake local/demo
fixtures live in `supabase/seed/002_demo.sql`. The idempotent diagnostic-tree
import scaffold lives in `supabase/seed/003_diagnostic_tree.sql`. The
historical workspace import scaffold lives in
`supabase/seed/004_historical_import.sql`. The curated current-records
bootstrap seed lives in `supabase/seed/005_current_records_bootstrap.sql`.

The Supabase seed and verifier npm scripts execute SQL files through
`scripts/run-supabase-sql.sh`, which uses `psql` inside the running local
Supabase database container. Start Supabase before running them.

When Docker/Supabase local services are unavailable, use:

```bash
npm run db:verify:local-postgres
```

This verifies the raw migration, seed idempotency, grants, RLS policies, and SQL
verifier against an isolated temporary PostgreSQL 15 cluster.

The demo seed creates fake local accounts:

- `bella.demo@example.test`
- `caregiver.demo@example.test`
- password for local password testing: `local-demo-password`

The initial auth decision is still magic link first; the password exists only to
make local Supabase fixture login easier if the frontend chooses to use it.

## Bootstrap Import Workflow

Historical record import is intentionally review-first. Source files are
registered with stable IDs, hashes, paths, and source-library metadata. Timeline
events are generated as candidates and only rows marked
`"review_status": "accepted"` are emitted into import SQL.

For the current records:

```bash
npm run bootstrap:seed-sql
npm run supabase:seed:current-records
```

The tracked seed file contains reviewed source-library and timeline rows for
the current Bella records. The ignored `data/bootstrap/*.jsonl` files remain the
regenerable review artifacts behind that seed. See
`docs/import/CURRENT_RECORDS_SEED_AUDIT.md` for coverage, duplicate/source-only
decisions, and known gaps.

For new PDFs, Markdown files, or portal exports, place files in
`data/import-inbox/` and run:

```bash
npm run import:inbox
```

Generated `data/bootstrap/*.jsonl` and `*.sql` files are ignored by git because
they may contain health information. The committed
`supabase/seed/005_current_records_bootstrap.sql` is also private health record
data and should stay in a private repository/environment. See
`docs/import/BOOTSTRAP_WORKFLOW.md` for the review rules and limitations.

## Frontend Contract Rule

Frontend code should import schemas and types from `src/server/contracts` and
call server actions from `src/server/actions`. It should not query Supabase
tables directly.

For the AI import assistant, use the server actions in
`src/server/actions/ai-import.ts`; see `docs/backend/AI_IMPORT_ASSISTANT.md`.
