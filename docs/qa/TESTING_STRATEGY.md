# Testing Strategy

Practical guide to what we test, how, and what we don't. Read this before
adding tests or changing CI.

## Layered model

| Layer                      | Tool                                                 | What it catches                                                                                                             | What it doesn't                                                       |
| -------------------------- | ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| **Typecheck**              | `tsc --noEmit` × app + e2e tsconfigs                 | Contract drift, prop mismatch, missing exports                                                                              | Runtime payload shape after JSON parse, RLS, browser quirks           |
| **Lint**                   | `eslint .` (max-warnings = 0)                        | Dead code, unused vars, React rule violations                                                                               | Behavior                                                              |
| **Format**                 | `prettier --check`                                   | Style drift                                                                                                                 | Anything semantic                                                     |
| **Unit / contract tests**  | Vitest                                               | Pure helpers, contract parsing, parser logic, agent tool allowlist                                                          | Server actions that hit Supabase, RLS, route rendering                |
| **SQL + RLS verifier**     | `db:verify:local-postgres` (a throwaway Postgres 15) | Migration runs cleanly, seeds idempotent, RLS denies cross-family, soft-delete hidden from reads, no public anon privileges | Production Supabase RLS replay, storage policies, real client cookies |
| **Production build**       | `next build`                                         | Server component errors, mis-typed routes, dead imports, bundling regressions                                               | Real DB calls                                                         |
| **Browser smoke (Tier 1)** | Playwright                                           | Rendering of public fallback routes, no server crashes                                                                      | Auth flows, anything past the onboarding gate                         |
| **Browser smoke (Tier 2)** | Playwright + local Supabase                          | Authenticated flows: shell, Pain Book, Flare, Vasomotor, Agent, Import, Apple Health, Export                                | Production-Supabase-only behavior, real OpenAI                        |

## Local commands

| Goal                                                 | Command                                 |
| ---------------------------------------------------- | --------------------------------------- |
| Fast loop (everything that matters most of the time) | `npm run verify`                        |
| Adds DB verifier + browser smokes                    | `npm run verify:full`                   |
| Just typecheck both projects                         | `npm run typecheck`                     |
| Just unit + contract tests                           | `npm run test`                          |
| Watch unit tests                                     | `npm run test:watch`                    |
| One unit test file                                   | `npm run test -- apple-health`          |
| SQL + RLS verifier (throwaway Postgres 15)           | `npm run db:verify:local-postgres`      |
| Seed your live Supabase dev project                  | `npm run supabase:seed`                 |
| Verify RLS against your live Supabase                | `npm run supabase:verify`               |
| Tier-1 browser smokes (no Supabase)                  | `npm run test:e2e`                      |
| Tier-2 browser smokes (needs local Supabase)         | `BELLA_E2E_SUPABASE=1 npm run test:e2e` |

### One-time setup

- `npm ci`
- `npx playwright install --with-deps chromium` (for browser smokes)
- For `db:verify:local-postgres`: `brew install postgresql@15` (macOS) or apt
  equivalent. The script will pick up the binaries from
  `/opt/homebrew/opt/postgresql@15/bin` automatically; set `PG_BIN` to
  override.
- For Tier-2 smokes: Docker Desktop running, then
  `npx supabase start && npx supabase db reset && npm run supabase:seed`.

## CI

`.github/workflows/ci.yml` runs:

1. `verify` job — `typecheck`, `lint`, `format`, `test`, `build`. Always.
2. `db-verify` job — Postgres 15 + `db:verify:local-postgres`. Runs on push
   to `main` and on PRs labeled `db-verify`. Keeps PR runtime short while
   still catching SQL regressions before merge.

CI **does not** require any third-party secrets. Builds use placeholder env
values because nothing is fetched at build time.

## How to add new tests

### Add a unit / contract test

Drop a file next to the code being tested:

```text
src/server/services/<feature>.test.ts
src/server/contracts/<feature>.test.ts
```

Use the Zod schemas as fixtures wherever possible. Tests must not require
network, real DB, real OpenAI, or environment variables. Run with
`npm run test`.

### Add a browser smoke

Add a file under `tests/e2e/smoke/`. If it requires Supabase, gate with:

```ts
import { supabaseE2EEnabled } from "../auth";
test.skip(!supabaseE2EEnabled(), "Set BELLA_E2E_SUPABASE=1 to run this.");
```

Use semantic selectors: `getByRole`, `getByLabel`, visible text. Avoid CSS
classnames and layout coordinates — those flake on small style edits.

### Add a SQL / RLS check

Edit `supabase/tests/rls_verification.sql`. The verifier executes it against
a throwaway Postgres 15 and reports failures.

## Fixtures

`tests/fixtures/`. **No real PHI. Ever.** See
`tests/fixtures/README.md` for the rules and for the synthetic Apple Health
`export.zip` shipped with the repo. To regenerate the zip after editing the
XML, run `node tests/fixtures/apple-health/build/build-export-zip.mjs`.

If a test needs a larger fixture, generate it at runtime — don't commit it.

## Required pre-staging smokes

Run before tagging a staging release. Tier-1 must pass on every CI run; the
others should be checked locally with seeded Supabase.

1. `npm run verify`
2. `npm run db:verify:local-postgres`
3. `npm run test:e2e` (Tier 1 — public offline fallback renders cleanly)
4. `BELLA_E2E_SUPABASE=1 npm run test:e2e` (Tier 2 — authenticated shell + nav)
5. Manual browser spot-checks for upload-heavy flows (Pain Book attachments,
   Vasomotor photos, Apple Health import) — see
   `docs/qa/STAGING_TEST_CHECKLIST.md`.

## Known gaps and follow-ups

These are deliberately deferred. They are out of scope for fast PR review;
land them as their own PRs when justified.

- **Tier-2 smokes for every feature surface.** The harness and Pain
  Book/Flare/Agent/Apple Health smokes are scaffolded but several are still
  documented-only. They need a stable seed user + password mechanism that
  doesn't weaken production auth.
- **Real OpenAI mock for Agent / AI Import.** Today the agent service is
  testable via its `injectableResponsesClient`, but a Playwright smoke that
  drives `/agent` end-to-end needs a mock injected through the dev server.
  Scope this with the test-only route discussion (see `agent-runner.ts`).
- **Apple Health daily-summary SQL function still groups by UTC day.** The
  parser already tags `metadata.local_date` per sample (see
  `apple-health-local-date.test.ts`). The next backend pass needs to update
  the SQL function to group by `metadata->>'local_date'` (or to add a
  dedicated `local_date` column). Until then, sleep records that cross local
  midnight will show under the UTC day.
- **Apple Health full persistence integration test.** The parser idempotency
  test in `apple-health-idempotency.test.ts` proves `external_key`
  stability, which the DB unique constraint then enforces. A true round-trip
  through Supabase requires the Supabase test harness (`@supabase/ssr`
  cookie wiring) and is gated on Tier-2 work.

## Rules

- Tests must not load real PHI.
- Tests must not require third-party secrets (OpenAI keys, etc.) to pass.
- Tests must not weaken production auth, RLS, or storage policies to keep
  themselves green.
- A failing test that exposes a real bug is fixed by changing the product
  code, not the test.
- New tests should select on behavior (visible text, role, label, contract
  shape), not on implementation details (component name, CSS class).
- Adding a test that flakes once gets a `test.fixme(...)` with a tracking
  issue, not a `test.skip`. Skips drift; fixmes nag.
