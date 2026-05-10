# Claude Phase 2 Goal - Feature Screens From Completed Backend

## Goal

Build the next frontend layer now that Codex backend phases 2 and 3 are complete: Flare Mode, Photo Comparison/Vasomotor capture, Timeline, Diagnostic Tree, Decisions, Schedule, Medications, Procedure Impact View, Source Library, Export Packet, Bulk Export entry point, Dashboard, and charts.

## Current State

Frontend Phase 1 is complete per Claude report:

- typecheck passed
- lint passed with zero warnings
- format passed
- tests passed 32/32
- build passed with 20 routes
- onboarding, app shell, settings, Pain Book, Log Book, upload component, and empty/loading/error UX are shipped

Backend phases 2 and 3 are complete. Read:

- `docs/backend/PHASE_2_HANDOFF.md`
- `docs/backend/PHASE_3_HANDOFF.md`
- `docs/backend/PHASE_2_COMPLETION_AUDIT.md`
- `docs/backend/PHASE_3_COMPLETION_AUDIT.md`
- `UX.md`
- `DESIGN.md`
- `ARCHITECTURE.md`
- `TICKETS.md`

## Ownership Boundary

Claude owns:

- `src/app/**`
- `src/components/**`
- frontend feature modules if created
- route/page composition
- client forms
- shadcn/ui composition
- charts and responsive layouts

Avoid editing:

- `src/server/**`
- `supabase/**`
- `scripts/**`
- `docs/backend/**`
- backend contracts/actions/services

Use existing backend actions and contracts. If a backend contract is insufficient, document the exact request instead of changing backend code.

## Backend Actions Available

Use handoff docs for examples. Major action files:

- `src/server/actions/flares.ts`
- `src/server/actions/vasomotor.ts`
- `src/server/actions/timeline.ts`
- `src/server/actions/diagnoses.ts`
- `src/server/actions/decisions.ts`
- `src/server/actions/schedule.ts`
- `src/server/actions/medications.ts`
- `src/server/actions/procedures.ts`
- `src/server/actions/sources.ts`
- `src/server/actions/exports.ts`
- `src/server/actions/metrics.ts`
- `src/server/actions/attachments.ts`

Frontend code should import shared types/schemas from `src/server/contracts`.

## Product Rules

- The app does not diagnose or treat.
- Keep language observational.
- Do not mark suspected diagnoses as confirmed unless backend status says confirmed.
- Mobile capture matters more than desktop aesthetics.
- No marketing hero sections.
- No decorative dashboard-card mosaics.
- Use dense, calm, clinical layouts.
- Photo comparison and flare capture are highest-value workflows.

## Primary Tickets

### 1. FE-005 - Flare Mode UI

Build the live flare workflow against `src/server/actions/flares.ts`.

Requirements:

- Global Start flare button should start a real flare.
- Show active flare banner/status across app shell.
- `getActiveFlare` on app load/session load.
- Add checkpoint UI for start, 30m, 60m, 120m, 6h, 12h, 24h, 48h, and custom.
- Quick pain score, trigger, body region, symptoms, and notes.
- End flare and show generated summary.
- Integrate photo/temperature pair once FE-007 is ready.

Done when:

- A user can start a flare, add checkpoints, and end it from the UI.
- Mobile flow is fast and usable.

### 2. FE-007 - Photo Comparison And Vasomotor Capture

Build side-by-side color/temperature documentation against `attachments` and `vasomotor` actions.

Workflow:

- Select site pair: knees, thighs, feet, wrists, hands, arms, custom.
- Upload/capture left photo.
- Upload/capture right photo.
- Enter left/right temperature Celsius.
- Show computed delta.
- Add color labels, lighting notes, context, notes.
- Link measurement to flare/log entry.

Done when:

- A clinician-readable comparison panel can be created and viewed.
- Panel displays timestamp, side labels, temperatures, delta, lighting/context, and photo previews.

### 3. FE-008 - Timeline View

Wire timeline page to `listTimelineItems`.

Requirements:

- Dense chronological list.
- Filters for date range, type, body region, symptom, trigger, diagnostic branch, flare-only, media-only.
- Pagination.
- Attachment preview metadata.
- Empty/loading/error states.
- Link out to source entity pages when available.

Done when:

- Demo fixture data renders as a unified timeline.

### 4. FE-009 - Diagnostic Tree UI

Wire diagnostic tree page to diagnosis/evidence actions.

Requirements:

- Node list or structured tree-like list; avoid complex graph layout.
- Status and confidence indicators.
- Evidence for/against sections.
- Tests needed, treatment implications, open questions.
- Linked evidence list.
- Create/update evidence link UI if practical.
- Merge/split can be placeholders if UX is too heavy, but node status/evidence must work.

Done when:

- User can understand why each diagnostic branch is supported, weakened, or unresolved.

### 5. FE-010 - Decisions Board

Wire decisions page to decisions actions.

Requirements:

- Board or grouped list by status.
- Create/edit decision.
- Evidence for/against.
- Risks.
- What would change the decision.
- Target date and owner.
- Final decision/rationale.

Done when:

- Family can manage open decisions from the UI.

### 6. FE-011 - Schedule And Visit Prep

Wire schedule page to appointment/task actions.

Requirements:

- Appointment list/calendar-lite.
- Create/edit appointment.
- Visit prep questions.
- Files/photos to show field.
- After-visit summary.
- Follow-up tasks.
- Open/upcoming filters.

Done when:

- A visit can be prepared and follow-up tasks tracked.

### 7. FE-012 - Medication Tracker

Wire medications page to medication actions.

Requirements:

- Current meds and past meds.
- Create/edit medication.
- Response history.
- Add medication response linked to entry/flare when possible.
- Show 30/60/120 min response fields.
- Show sedation/cognition/gait/side-effect fields.

Done when:

- Medication effects can be reviewed over time.

### 8. FE-013 - Procedure Impact View

Wire procedures page to procedure/test event actions.

Requirements:

- Procedure/test list.
- Create/edit procedure/test event.
- Diagnostic question at top.
- Baseline, immediate, 24h, 72h, 1w, 1m sections.
- New symptoms.
- Did it answer the question?
- Repeat recommendation.
- Linked logs/photos/sources where available.

Done when:

- Prior nondiagnostic procedures can be reviewed consistently.

### 9. FE-014 - Source Library

Wire sources page to source actions and upload component.

Requirements:

- List/filter sources by type/date/provider/tag.
- Create/edit source.
- View summary/citation.
- Attach files.
- Link source to event/diagnosis/decision if practical.

Done when:

- Records are searchable and linkable.

### 10. FE-015 / FE-016 - Export UI

Wire export page to export actions.

Requirements:

- Clinician packet builder: date range, diagnostic branch, body region, flares-only, include photos, include procedure summaries, clinician questions.
- Markdown preview.
- Download markdown.
- Bulk data export entry point using manifest-first backend response.
- Explain zip is deferred if backend limitation says so.

Done when:

- Family can generate a clinician markdown packet from the UI.

### 11. FE-017 / FE-018 - Dashboard And Charts

Wire dashboard to metrics action.

Sections:

- Active flare/current status.
- Upcoming appointments.
- Open decisions.
- Recent flares.
- Recent photo comparisons.
- Current meds.
- Tasks due.
- Key trends.

Charts:

- flare frequency.
- recovery time.
- trigger frequency.
- pain by body region.
- vasomotor deltas.
- medication response summary.

Done when:

- Dashboard answers "what needs attention now?"
- Charts are readable and not decorative.

## Cross-Cutting Requirements

- Reuse existing empty/loading/error components.
- Use destructive confirmation pattern for soft deletes.
- Use shared Zod schemas with `@hookform/resolvers/zod` for forms where practical.
- Maintain responsive mobile-first capture flows.
- No direct Supabase calls from UI.
- Keep route count and build stable.

## Suggested Build Order

1. FE-005 Flare Mode
2. FE-007 Photo Comparison/Vasomotor Capture
3. FE-008 Timeline
4. FE-009 Diagnostic Tree
5. FE-010 Decisions
6. FE-011 Schedule
7. FE-012 Medications
8. FE-013 Procedures
9. FE-014 Sources
10. FE-015/016 Export
11. FE-017/018 Dashboard and charts

## Verification

Run:

- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run test`
- `npm run build`

Do not leave dev servers running.

## Deliverables

- Functional screens for the primary tickets.
- Clear notes for any backend contract gaps.
- No backend schema/service/action modifications unless explicitly necessary and documented.
- All verification commands pass or blockers are documented.
