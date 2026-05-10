# Integration QA Goal - MVP End-To-End Validation

## Goal

Run an integrated MVP QA pass now that backend phases 1-3 and frontend phases 1-2 are complete. Validate the app as a real product: backend contracts, frontend flows, seeded data, auth assumptions, timeline consistency, export output, and release readiness.

## Current State

Reported complete:

- Backend foundation: `docs/backend/COMPLETION_AUDIT.md`
- Backend phase 2: `docs/backend/PHASE_2_COMPLETION_AUDIT.md`
- Backend phase 3: `docs/backend/PHASE_3_COMPLETION_AUDIT.md`
- Frontend phase 1: `docs/frontend/PHASE_1_COMPLETION_NOTE.md`
- Frontend phase 2: `docs/frontend/PHASE_2_COMPLETION_NOTE.md`

Read first:

- `README.md`
- `UX.md`
- `DESIGN.md`
- `ARCHITECTURE.md`
- `TICKETS.md`
- backend handoffs in `docs/backend/`
- frontend completion notes in `docs/frontend/`

## Ownership

This pass may touch both frontend and backend, but only to fix integration defects.

Do:

- Fix contract mismatches.
- Fix broken forms/actions.
- Fix build/lint/type/test failures.
- Add regression tests for discovered bugs.
- Improve error handling where flows fail.
- Update docs for real setup issues.

Do not:

- Redesign major UI flows.
- Add new product features.
- Refactor large subsystems.
- Change schema unless an integration blocker requires it.
- Remove existing seeded/demo data without replacement.

## Verification Gates

Run:

- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run test`
- `npm run build`
- `npm run db:verify:local-postgres`

If Supabase local services are available:

- `npx supabase start`
- `npx supabase db reset`
- `npm run supabase:seed`
- `npm run supabase:verify`

Start the app locally only for browser/E2E QA, and stop it afterward.

## Manual Flow QA

Validate these flows against local seeded data and real backend actions.

### 1. App Shell And Navigation

- App loads.
- Onboarding disclosure is reachable/works as designed.
- Desktop nav works.
- Mobile nav works if tested in browser viewport.
- Global Start flare action is visible.
- Empty/loading/error states render without crashes.

### 2. Pain Book

- List pain entries.
- Create pain entry.
- Edit pain entry.
- Soft-delete or destructive-confirm flow works.
- Body regions, symptoms, and Bella-specific triggers populate from backend/reference data.
- Entry appears in timeline.

### 3. Log Book

- List log entries.
- Create freeform log event.
- Attach body regions/symptoms/triggers.
- Entry appears in timeline.

### 4. Uploads

- Upload UI renders.
- Allowed files are accepted.
- Oversized/disallowed files are rejected gracefully if possible.
- Signed preview/download flow works or blocker is documented.
- Attachment can link to an entry/source/measurement where supported.

### 5. Flare Mode

- `getActiveFlare` state loads.
- Start flare.
- Add checkpoint.
- Add notes/symptoms/triggers/regions.
- End flare.
- Recovery/duration displays.
- Flare appears in timeline.

### 6. Photo Comparison / Vasomotor

- Create left/right photo comparison.
- Enter left/right temperatures.
- Delta displays consistently.
- Site/context/lighting notes save.
- Measurement appears in timeline and export packet.

### 7. Timeline

- Timeline loads seeded and newly created records.
- Filters work: date, type, body region, symptom, trigger, flare-only, media-only.
- Pagination works.
- Linked attachments/evidence metadata displays without crashes.

### 8. Diagnostic Tree

- Diagnostic nodes load from seed.
- Status/confidence display correctly.
- Evidence for/against displays correctly.
- Create/update evidence link if UI supports it.
- No UI implies suspected diagnoses are confirmed.

### 9. Decisions

- List decisions.
- Create/edit decision.
- Status groups/filters work.
- Evidence/risk/what-would-change fields display.
- Decision appears in timeline where expected.

### 10. Schedule

- List appointments and tasks.
- Create/edit appointment.
- Create/edit task.
- Upcoming/open filters work.

### 11. Medications

- List medications.
- Create/edit medication.
- Add medication response.
- 30/60/120 response fields save/display.
- Response can link to entry/flare if supported.

### 12. Procedures

- List procedure/test events.
- Create/edit procedure/test event.
- Procedure impact fields save/display.
- Procedure appears in timeline.

### 13. Sources

- List sources.
- Create/edit source.
- Attach file to source if supported.
- Link source to event/diagnosis/decision if UI supports it.

### 14. Export

- Generate clinician markdown packet.
- Packet includes working diagnosis paragraph, active decisions, meds, upcoming items, timeline highlights, procedure summaries, vasomotor deltas/photos where available.
- Bulk export manifest/data export works or limitation is accurately displayed.

### 15. Dashboard And Charts

- Dashboard metrics load.
- Active flare card behaves correctly.
- Upcoming appointments/open decisions/tasks render.
- Charts render without empty-data crashes.
- Charts are readable and not decorative-only.

## Automated Test Additions

Add focused tests only where they catch real integration risk.

Preferred:

- Server action smoke tests for high-risk flows.
- Component tests for forms with Zod schemas.
- Playwright smoke tests if test infrastructure is already practical.

High-value Playwright flows if feasible:

- create pain entry
- start/end flare
- create vasomotor measurement
- view timeline
- generate export packet

## Security And Data Checks

Verify or document:

- No public storage buckets.
- RLS verifier still passes.
- No frontend code calls Supabase tables directly.
- No third-party analytics/tracking added.
- Signed URL handling remains short-lived.
- Soft-delete confirmation pattern exists for medical records.

## Documentation Updates

Update or create:

- `docs/qa/MVP_INTEGRATION_QA.md`
- Any setup docs if local run differs from `README.md`
- Any known backend/frontend contract gap notes
- Any release blockers

## Definition Of Done

- All verification gates pass or blockers are documented.
- Manual QA checklist is completed with pass/fail notes.
- Critical integration bugs are fixed.
- Noncritical issues are recorded as follow-up tickets.
- MVP can be run locally from a clean setup using README instructions.
- A clinician export packet can be generated from demo or local data.
