# AGENTS.md

Short map for coding agents working in this repo. README is for humans; this
file is for agents. Update it whenever a constraint here turns out wrong.

## What this is

Private family-facing health tracker. Next.js 15 App Router + TypeScript +
Tailwind + shadcn-style components, Supabase (Postgres + Auth + private
Storage), Vercel. Single Next app, single Supabase project, typed server
action layer between UI and DB. No public surface.

Deeper context: [ARCHITECTURE.md](ARCHITECTURE.md), [DESIGN.md](DESIGN.md),
[UX.md](UX.md), [MOBILE.md](MOBILE.md), [TICKETS.md](TICKETS.md).

## Setup

1. `npm install`
2. `cp .env.example .env.local` (Supabase keys printed by `supabase start`)
3. `supabase start && supabase db reset && npm run supabase:seed && npm run supabase:verify`
4. `npm run dev`

Docker Desktop is required for the Supabase stack. `npm run
db:verify:local-postgres` additionally needs PostgreSQL 15 binaries on PATH.

## Required gates before any commit

Run these. They must all pass. CI runs the same set.

| Command             | Purpose                                                 |
| ------------------- | ------------------------------------------------------- |
| `npm run typecheck` | TS + Next typegen + e2e tsconfig                        |
| `npm run lint`      | ESLint, `--max-warnings=0`                              |
| `npm run format`    | Prettier check (do not skip; run `format:write` to fix) |
| `npm run test`      | Vitest (unit + contract + integration getters)          |
| `npm run build`     | Next production build                                   |

`npm run verify` runs all five in order. `npm run verify:full` adds
`db:verify:local-postgres` and `test:e2e`. Use `verify:full` before tagging a
staging release.

E2E specifics: Tier-1 Playwright runs by default. Tier-2 (real Supabase)
requires `BELLA_E2E_SUPABASE=1`. Agent/Import e2e without OpenAI requires
`BELLA_E2E_AGENT_FAKE=1`. See [tests/e2e/README.md](tests/e2e/README.md) and
[docs/qa/TESTING_STRATEGY.md](docs/qa/TESTING_STRATEGY.md).

## Directory boundaries

- `src/app/**` — Next routes/pages, layouts. Client and server components.
- `src/components/**` — shared UI (shadcn-style primitives, feature components).
- `src/server/contracts/**` — Zod schemas + inferred types. Source of truth for
  request/response shapes. UI imports types from here.
- `src/server/actions/**` — server actions. UI calls these.
- `src/server/services/**` — service layer that talks to Supabase. Actions call
  services; UI does not.
- `src/server/supabase/**` — Supabase client factories.
- `src/lib/**` — shared utilities, framework-agnostic where possible.
- `src/strings/en-us.json` — all user-facing strings live here.
- `supabase/migrations/**` — raw SQL migrations, source of truth for schema,
  RLS, storage policies, triggers.
- `supabase/seed/**` — reference, demo, diagnostic-tree, historical, and
  current-records seeds.
- `scripts/**` — Node scripts (bootstrap import, verifiers).
- `tests/`, `src/**/*.test.ts(x)` — Vitest unit/integration; Playwright in
  `tests/e2e`.

## Hard rules

- **UI never talks to Supabase directly.** Components under `src/app/` and
  `src/components/` import types from `src/server/contracts` and call server
  actions from `src/server/actions`. New data needs a contract + action +
  service, not a direct client.
- **All user-facing strings go in `src/strings/en-us.json`.** No inline copy in
  JSX. Same rule for error/empty/loading messages.
- **Schema and RLS changes must be migrations** under `supabase/migrations/`,
  not ad-hoc SQL or ORM models. The DB has RLS on every user-facing table;
  preserve it.
- **Storage is private.** Never return raw object paths to clients; mint
  short-lived signed URLs through the services layer.
- **Records are append-only by default.** Use soft-delete with audit
  metadata; do not add destructive cascades without an explicit ticket.
- **AI agent has no commit tool.** It can draft/update/reject imports; only a
  human-approved server action writes real records. Do not add an
  agent-callable tool that mutates real records.
- **Do not check in PHI.** Files under `data/bootstrap/*.jsonl` and `*.sql` are
  gitignored. The curated `supabase/seed/005_current_records_bootstrap.sql`
  contains real records and must stay private.
- **Never bypass hooks** (`--no-verify`, `--no-gpg-sign`) and never commit
  unless the human user explicitly says to.

## Conventions

- Forms: `react-hook-form` + `zodResolver` against contracts from
  `src/server/contracts`.
- Dates: `date-fns`. Apple Health import uses local-day bucketing — see
  [docs/backend/APPLE_HEALTH_IMPORT.md](docs/backend/APPLE_HEALTH_IMPORT.md).
- Charts: `recharts`.
- Icons: `lucide-react`.
- Comments: write none unless a non-obvious invariant or workaround needs one
  line of why. No phase/ticket/author references.

## Subsystem pointers

- AI import drafts (review-first, never auto-commits):
  [docs/backend/AI_IMPORT_ASSISTANT.md](docs/backend/AI_IMPORT_ASSISTANT.md)
- Multi-turn agent runtime + tool allowlist:
  [docs/backend/AI_AGENT_RUNTIME.md](docs/backend/AI_AGENT_RUNTIME.md)
- Apple Health zip import + dedupe:
  [docs/backend/APPLE_HEALTH_IMPORT.md](docs/backend/APPLE_HEALTH_IMPORT.md)
- Polymorphic attachment links: [docs/backend/BE-001-polymorphic-links.md](docs/backend/BE-001-polymorphic-links.md)
- Auth method: [docs/backend/BE-003a-auth-method.md](docs/backend/BE-003a-auth-method.md)
- Storage policy: [docs/backend/BE-007-storage.md](docs/backend/BE-007-storage.md)
- Offline capture flag: [docs/backend/BE-021-offline-capture.md](docs/backend/BE-021-offline-capture.md)
- Security checklist: [docs/backend/SEC-001-security-checklist.md](docs/backend/SEC-001-security-checklist.md)
- Backup/DR: [docs/backend/OPS-001-backup-disaster-recovery.md](docs/backend/OPS-001-backup-disaster-recovery.md)
- Bootstrap import workflow: [docs/import/BOOTSTRAP_WORKFLOW.md](docs/import/BOOTSTRAP_WORKFLOW.md)
- Staging checklist: [docs/qa/STAGING_TEST_CHECKLIST.md](docs/qa/STAGING_TEST_CHECKLIST.md)

## Assumptions an agent can rely on

- Local dev = local Supabase via Docker. Production = Vercel + hosted Supabase.
- Today's date during a session: trust the harness, not the model.
- The demo fixture user is `bella.demo@example.test` /
  `local-demo-password` (local only, never re-used in staging/prod).
- `OPENAI_API_KEY` may be unset; AI features must degrade gracefully and e2e
  must work with the deterministic fake (`BELLA_E2E_AGENT_FAKE=1`).
