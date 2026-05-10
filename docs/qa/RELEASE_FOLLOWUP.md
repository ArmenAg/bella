# Release Follow-Up QA

**Date:** 2026-05-10
**Scope:** Integration QA follow-ups from `RELEASE_FOLLOWUP_GOAL.md`.
**Verdict:** Ready for staging after backend contract fixes and setup-doc
updates.

## Deliverable Checklist

| Requirement                           | Evidence                                                                                                                                                         | Status   |
| ------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| Add `listEvidenceLinks(diagnosis_id)` | `src/server/contracts/diagnoses.ts`, `src/server/services/diagnoses.ts`, `src/server/actions/diagnoses.ts`, diagnostic edit page hydrates `initialLinks`         | Pass     |
| Add `listSourceLinks(source_id)`      | `src/server/contracts/sources.ts`, `src/server/services/sources.ts`, `src/server/actions/sources.ts`, source edit page passes `sourceLinks` to `SourceLinksCard` | Pass     |
| Persist soft-delete reasons           | Soft-delete actions/services accept `reason`; current destructive UI passes the reason; `record_soft_delete_reason` stores it in `audit_log.metadata.reason`     | Pass     |
| Export `SourceType`                   | `src/server/contracts/sources.ts` exports `SourceType`; source UI imports it directly                                                                            | Pass     |
| Tighten flare checkpoint symptoms     | `flareCheckpointInputSchema.symptoms` uses `entrySymptomInputSchema`; contract test rejects malformed symptom payloads                                           | Pass     |
| Add recent flare summary action       | `listRecentFlareSummaries` contract/service/action returns start/end, duration, peak pain, checkpoint count, triggers, body regions, and notes summary           | Pass     |
| Document timeline 1000-row cap        | `TimelinePage.metadata` exposes source cap hits; timeline UI displays a warning; backend handoff documents the tradeoff                                          | Pass     |
| README setup prerequisites            | README documents PostgreSQL 15, macOS `brew install postgresql@15`, Docker Desktop, and first Supabase container pull                                            | Pass     |
| Browser smoke tests                   | Deferred; see blocker below                                                                                                                                      | Deferred |

## Browser Smoke Tests

Playwright is not configured in this project, and adding high-value browser
smoke tests is blocked by the lack of a stable browser login/auth-state setup.
The seed has demo credentials, but there is no login route/UI or Playwright
global setup that can create Supabase SSR cookies for server actions. Without
that, tests for create pain entry, start/end flare, vasomotor measurement,
timeline, and export packet would fail on authentication rather than product
behavior.

Recommended staging smoke setup once auth is available:

- Install `@playwright/test` and add a `test:e2e` or `test:smoke` script.
- Use local Supabase with `npx supabase start`, `npx supabase db reset`, and
  `npm run supabase:seed`.
- Authenticate a seeded primary or caregiver user in global setup.
- Preload `localStorage["bella:onboarding-ack-v1"] = "true"`.
- Run the five requested flows serially or reset the database per run because
  create/end flows mutate seeded state.
- Avoid private file uploads; vasomotor photos are optional for smoke coverage.

## Verification

| Gate                               | Result   | Notes                                                                               |
| ---------------------------------- | -------- | ----------------------------------------------------------------------------------- |
| `npm run typecheck`                | pass     | Clean after release follow-up changes.                                              |
| `npm run lint`                     | pass     | Zero warnings.                                                                      |
| `npm run format`                   | pass     | All matched files conform to Prettier.                                              |
| `npm run test`                     | pass     | 36/36 tests across 14 files.                                                        |
| `npm run build`                    | pass     | Production build completed.                                                         |
| `npm run db:verify:local-postgres` | pass     | Local PostgreSQL verifier completed.                                                |
| `npx supabase start`               | pass     | Local Supabase stack started; the missing `imgproxy` image was pulled.              |
| `npx supabase db reset`            | pass     | Applied all migrations through `20260510030000_release_followup_contract_gaps.sql`. |
| `npm run supabase:seed`            | pass     | Loaded reference, demo, diagnostic-tree, and historical import seeds.               |
| `npm run supabase:verify`          | pass     | RLS verifier completed against local Supabase.                                      |
| Playwright smoke tests             | deferred | Blocked by missing browser auth harness.                                            |

## Completion Audit

The explicit release follow-up requirements map to concrete artifacts above.
The only deferred item is Playwright smoke coverage; the blocker is environment
and auth harness readiness, not a product feature gap. No new product features
were added.
