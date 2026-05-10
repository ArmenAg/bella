# Completion Audit

Objective: build the Codex-owned backend foundation for Bella Care Tracker so
Claude can implement the frontend against stable contracts.

## Success Criteria

This audit uses the `CODEX_GOAL.md` "Definition Of Done For This Codex Phase"
as the completion boundary. Later backend tickets such as full flare,
vasomotor, timeline, diagnosis, metrics, import, and export implementations are
represented by schema and shared contracts where requested, but their full
service-layer implementations are outside this phase unless called out below.

- Next/Supabase backend foundation exists.
- Migrations run from scratch.
- RLS is enabled on every table.
- Reference and demo seeds are idempotent.
- Shared Zod/TypeScript contracts exist.
- Entries and storage backend slices work.
- Auth, role, privacy, offline, security, and backup decisions are documented.
- CI/tooling gates exist and pass locally.

## Prompt-To-Artifact Checklist

| Requirement                                                           | Evidence                                                                                                                                                          | Status |
| --------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Scaffold Next.js app inside `app/`                                    | `package.json`, `next.config.ts`, `src/app/layout.tsx`, `src/app/page.tsx`                                                                                        | Done   |
| App Router, TypeScript, Tailwind, shadcn/ui-ready structure           | `src/app`, `tsconfig.json`, `tailwind.config.ts`, `src/components/ui/button.tsx`, `src/lib/utils.ts`                                                              | Done   |
| Migration/data-access approach chosen and documented                  | `docs/backend/BE-000-tooling.md`                                                                                                                                  | Done   |
| Prefer raw Supabase SQL migrations                                    | `supabase/migrations/20260510000000_initial_backend_foundation.sql`                                                                                               | Done   |
| ESLint, Prettier, Vitest, scripts                                     | `package.json`, `eslint.config.mjs`, `.prettierrc.json`, `vitest.config.ts`                                                                                       | Done   |
| Package scripts `dev`, `build`, `typecheck`, `lint`, `format`, `test` | `package.json`                                                                                                                                                    | Done   |
| `.env.example`                                                        | `.env.example`                                                                                                                                                    | Done   |
| GitHub Actions for typecheck/lint/test                                | `.github/workflows/ci.yml`                                                                                                                                        | Done   |
| Local setup and migration workflow                                    | `README.md`, `docs/backend/BE-000-tooling.md`                                                                                                                     | Done   |
| Initial schema tables                                                 | Static test `src/test/sql-foundation.test.ts` verifies all required table names in migration                                                                      | Done   |
| UUID primary keys                                                     | Migration uses `uuid primary key default gen_random_uuid()` for entity tables and UUID composite links                                                            | Done   |
| Created/updated/deleted timestamps where applicable                   | Migration includes timestamps and soft-delete columns across domain tables                                                                                        | Done   |
| UTC timestamps                                                        | Migration uses `timestamptz`; contract docs require UTC ISO strings                                                                                               | Done   |
| Timeline/date/link/body-region/diagnosis/soft-delete indexes          | Migration includes indexes for entries, events, appointments, links, diagnoses, attachments, tasks, audit                                                         | Done   |
| RLS enabled on every table                                            | Migration enables RLS; static test checks coverage                                                                                                                | Done   |
| No public table reads                                                 | Policies grant authenticated reads only, migration revokes anon table privileges, verifier checks no anon table privileges                                        | Done   |
| Polymorphic link tradeoffs documented                                 | `docs/backend/BE-001-polymorphic-links.md`                                                                                                                        | Done   |
| Reference seed                                                        | `supabase/seed/001_reference.sql`                                                                                                                                 | Done   |
| Demo fixture seed                                                     | `supabase/seed/002_demo.sql`                                                                                                                                      | Done   |
| Seeds idempotent                                                      | Static tests check `on conflict`; demo uses deterministic `uuid_generate_v5` IDs; `db:verify:local-postgres` runs both seeds twice                                | Done   |
| Fake/safe demo data                                                   | Demo seed comments and fixture text identify data as fake                                                                                                         | Done   |
| Shared contracts for requested domains                                | `src/server/contracts/*` exports entries, flares, vasomotor, attachments, timeline, diagnoses, evidence, decisions, appointments, medications, responses, exports | Done   |
| Zod validates mutation inputs                                         | Contract tests and service parsing cover entry/upload mutations                                                                                                   | Done   |
| Pagination default 50, max 200                                        | `src/server/contracts/common.ts`; unit test verifies                                                                                                              | Done   |
| Consistent error response shape                                       | `src/server/contracts/common.ts`, `src/server/actions/result.ts`                                                                                                  | Done   |
| Auth method decision                                                  | `docs/backend/BE-003a-auth-method.md`                                                                                                                             | Done   |
| Auth profiles, roles, RLS                                             | Migration creates roles/profiles, auth trigger, role helpers, role-aware policies                                                                                 | Done   |
| RLS verification queries/tests                                        | `supabase/tests/rls_verification.sql`, static coverage in `src/test/sql-foundation.test.ts`, and passing `db:verify:local-postgres` execution                     | Done   |
| Soft delete and audit helpers                                         | Migration includes `soft_delete_record()` and audit triggers for key domain tables                                                                                | Done   |
| Entries API                                                           | `src/server/services/entries.ts`, `src/server/actions/entries.ts`                                                                                                 | Done   |
| Entry filters                                                         | Entries service supports date range, type, flare-only, body region, symptom, trigger                                                                              | Done   |
| Private storage and attachment API                                    | `src/server/services/attachments.ts`, `src/server/actions/attachments.ts`, migration storage policies                                                             | Done   |
| Private bucket, no public URLs, signed short-lived URLs               | Migration bucket config and attachment service                                                                                                                    | Done   |
| Allowed mime types and 50 MB cap                                      | Contracts, migration, and tests                                                                                                                                   | Done   |
| Server-side mime sniffing plan or implementation                      | Helper in `src/server/services/attachments.ts`; production workflow documented in `docs/backend/BE-007-storage.md`                                                | Done   |
| GPS EXIF strip plan                                                   | `docs/backend/BE-007-storage.md`                                                                                                                                  | Done   |
| Offline capture design spike                                          | `docs/backend/BE-021-offline-capture.md`                                                                                                                          | Done   |
| Security checklist                                                    | `docs/backend/SEC-001-security-checklist.md`                                                                                                                      | Done   |
| Backup/disaster recovery note                                         | `docs/backend/OPS-001-backup-disaster-recovery.md`                                                                                                                | Done   |
| Sanity UI only, not full frontend                                     | `src/app/page.tsx` is a minimal backend-foundation page                                                                                                           | Done   |

## Verification Commands

Passing:

- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run test` (16 tests)
- `npm run build`
- `npm audit --json`
- `curl -fsS http://127.0.0.1:3000`
- `npm run db:verify:local-postgres`
- `npx supabase start`
- `npx supabase db reset`
- `npm run supabase:seed` (run twice to verify idempotency)
- `npm run supabase:verify`

Notes: The earlier OrbStack data ownership issue was resolved locally, and the
native Supabase stack starts successfully. Supabase CLI 2.98.2 rejects these
multi-statement SQL files through `supabase db query -f`, so the seed and
verifier npm scripts now execute SQL through `scripts/run-supabase-sql.sh`
inside the running Supabase database container. The Docker-free
`db:verify:local-postgres` command remains as a fallback and independently
verifies the migration, seed idempotency, grants, RLS policies, and verifier on
a fresh temporary PostgreSQL 15 cluster.

## Completion Decision

The Codex phase is complete. The implementation is in place, application gates
pass, and the database foundation has been exercised from scratch through both
the native local Supabase stack and the temporary PostgreSQL verifier.
