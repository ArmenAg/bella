# Release Follow-Up Goal - Fix QA Gaps And Prepare Staging

## Goal

Address the nonblocking integration QA follow-ups, add high-value smoke coverage, and prepare the MVP for staged release.

## Current State

Integration QA passed with documented follow-ups.

Read first:

- `docs/qa/MVP_INTEGRATION_QA.md`
- `docs/backend/PHASE_3_HANDOFF.md`
- `docs/backend/PHASE_3_COMPLETION_AUDIT.md`
- `docs/frontend/PHASE_2_COMPLETION_NOTE.md`
- `README.md`

Verdict from QA:

- Ready for staging.
- No critical defects open.
- Seven backend contract gaps should be fixed before production.
- Browser-based Playwright smoke tests should be added for the highest-value flows.
- README needs local prerequisite clarification.

## Scope

Fix only integration/release-readiness gaps. Do not add new product features.

## Backend Contract Follow-Ups

### 1. Add `listEvidenceLinks(diagnosis_id)`

Problem:

- Diagnostic-tree edit page can render only evidence links added in-session.

Implement:

- service function
- server action
- contract/filter if needed
- test

Done when:

- Existing evidence links for a diagnosis can be fetched and rendered.

### 2. Add `listSourceLinks(source_id)`

Problem:

- `linkSourceTo*` actions save successfully, but frontend cannot render existing source links.

Implement:

- source link list service/action
- response shape covering event, diagnosis, and decision links
- test

Done when:

- Source detail/edit UI can show linked events, diagnoses, and decisions.

### 3. Plumb Soft-Delete Reasons

Problem:

- UI captures delete reason, but soft-delete actions drop it.

Implement:

- optional `reason` argument for relevant `softDelete*` actions/services
- write reason into audit log metadata or an audit note field
- keep backwards compatibility for existing calls without reason
- tests

Surfaces:

- entries
- decisions
- diagnoses
- sources
- medications
- medication responses
- procedures
- appointments
- tasks
- vasomotor measurements
- attachments if practical

Done when:

- Destructive confirmation reason is persisted in audit data.

### 4. Export `SourceType`

Problem:

- Frontend derives `SourceType` locally as `Source["source_type"]`.

Implement:

- export `SourceType` from `src/server/contracts/sources.ts`
- ensure barrel export includes it

Done when:

- Frontend imports `SourceType` directly.

### 5. Tighten Flare Checkpoint Symptom Schema

Problem:

- `flareCheckpointInputSchema.symptoms` is typed as `z.array(z.record(z.unknown()))`.
- Forms send `{ symptom_id, severity?, notes? }`.

Implement:

- reuse the entry symptom input schema or equivalent strict schema
- update tests
- preserve accepted frontend payload shape

Done when:

- Boundary validation catches malformed checkpoint symptom payloads.

### 6. Add Recent Flare Summary Action

Problem:

- `/flare` can only show in-session summaries.

Implement:

- `listRecentFlareSummaries` or equivalent
- include start/end, duration, peak pain, checkpoints count, triggers, body regions, and notes summary
- test

Done when:

- Frontend can show "View last flare summary" across sessions.

### 7. Document Timeline 1000-Row Safety Cap

Problem:

- Timeline service caps each source-table query at 1000 rows.

Implement:

- document the tradeoff in backend docs
- return a cap-hit warning/metadata if practical
- add audit/log marker only if low-risk

Done when:

- Frontend can display or log that timeline results may be capped.

## Browser Smoke Tests

Add Playwright if not already present.

High-value flows:

1. Create pain entry.
2. Start and end flare.
3. Create vasomotor measurement.
4. View timeline.
5. Generate clinician export packet.

Requirements:

- Use seeded/demo data.
- Keep tests stable and minimal.
- Do not require real uploaded private medical files.
- Document any local Supabase dependency.

## Setup Documentation Fixes

Update README with:

- PostgreSQL 15 prerequisite for `db:verify:local-postgres`.
- macOS install example: `brew install postgresql@15`.
- Docker Desktop requirement for local Supabase.
- Note that first `supabase start` pulls large containers.

## Verification

Run:

- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run test`
- `npm run build`

If environment supports it:

- `npm run db:verify:local-postgres`
- `npx supabase start`
- `npx supabase db reset`
- `npm run supabase:seed`
- `npm run supabase:verify`
- Playwright smoke tests

## Deliverables

- Fixed backend gaps.
- Updated frontend imports/usages where needed.
- Playwright smoke tests or documented blocker.
- README setup updates.
- `docs/qa/RELEASE_FOLLOWUP.md` with pass/fail notes.

## Definition Of Done

- All seven QA backend gaps are resolved or explicitly deferred with rationale.
- High-value smoke tests exist or the blocker is documented.
- README reflects real local prerequisites.
- Verification gates pass or environment blockers are documented.
- App remains ready for staging.
