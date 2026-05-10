# Codex Next Goal - Backend Phase 2

## Goal

Extend the completed backend foundation with the next backend APIs Claude will need after basic capture: flare sessions, vasomotor measurements, timeline, diagnostic tree/evidence, decisions, schedule, and source import scaffolding.

## Current State

The initial Codex backend foundation is complete. Evidence:

- `docs/backend/COMPLETION_AUDIT.md`
- `README.md`
- `src/server/contracts/*`
- `src/server/actions/entries.ts`
- `src/server/actions/attachments.ts`
- `src/server/services/entries.ts`
- `src/server/services/attachments.ts`
- `supabase/migrations/20260510000000_initial_backend_foundation.sql`
- `supabase/seed/001_reference.sql`
- `supabase/seed/002_demo.sql`

Claude can work concurrently on FE-000, FE-001, FE-002, FE-003, FE-004, and FE-006. Do not modify Claude-owned UI files unless necessary for compile fixes.

## Read First

- `app/DESIGN.md`
- `app/ARCHITECTURE.md`
- `app/TICKETS.md`
- `app/UX.md`
- `docs/backend/COMPLETION_AUDIT.md`

## Ownership Boundaries

Codex owns:

- backend services
- server actions
- contracts
- migrations/seeds when needed
- tests
- backend docs

Avoid touching:

- route/page UI implementations beyond compile-safe exports
- shadcn component styling
- frontend feature components

If frontend contracts need to change, preserve backwards compatibility where possible and document the change clearly.

## Primary Tickets

### 1. BE-006 - Flare Session API

Implement or complete:

- `startFlare`
- `addFlareCheckpoint`
- `updateFlare`
- `endFlare`
- `getActiveFlare`

Requirements:

- One active flare per user by default.
- Checkpoints: start, 30m, 60m, 120m, 6h, 12h, 24h, 48h, custom.
- Checkpoints preserve timestamps.
- Ending a flare computes duration/recovery fields.
- Service layer and server actions validate with existing Zod contracts.
- Add unit tests.

### 2. BE-008 - Vasomotor Measurement API

Implement or complete:

- `createVasomotorMeasurement`
- `updateVasomotorMeasurement`
- `softDeleteVasomotorMeasurement`
- `listVasomotorMeasurements`

Requirements:

- Compute `delta_c` consistently when both temperatures exist.
- Query by date range, site, and entry.
- Support linked left/right attachments if schema already allows it; otherwise add a minimal compatible migration.
- Add unit tests.

### 3. BE-009 - Timeline Query API

Implement `listTimelineItems`.

Merge:

- entries
- flare checkpoints/sessions
- events
- appointments
- medication changes
- procedure/test events
- decisions
- sources/uploads
- diagnosis updates where available

Filters:

- date range
- item type
- body region
- symptom
- trigger
- diagnostic branch
- flare only
- media only

Requirements:

- Return normalized `TimelineItem[]`.
- Default page size 50, max 200.
- Include linked attachment counts/preview metadata where available.
- Add tests for sorting, pagination, and filters.

### 4. BE-010 - Diagnostic Node And Evidence API

Implement or complete:

- `createDiagnosis`
- `updateDiagnosis`
- `softDeleteDiagnosis`
- `listDiagnoses`
- `createEvidenceLink`
- `updateEvidenceLink`
- `removeEvidenceLink`
- `mergeDiagnosisNodes`
- `splitDiagnosisNode`

Requirements:

- Track status/confidence.
- Evidence direction: supports, weakens, neutral, pending.
- Link evidence to entries, events, attachments, sources, decisions, and vasomotor measurements.
- Merge/split actions write audit records.
- Add unit tests.

### 5. BE-011 - Seed Diagnostic Tree From Existing Reports

Create an idempotent seed/import script for the diagnostic branches listed in `TICKETS.md`.

Requirements:

- Include initial summary and open questions.
- Do not over-import real sensitive details beyond what is already in local reports.
- Script can be rerun safely.

### 6. BE-012 / BE-013 - Decisions, Appointments, Tasks APIs

Implement or complete:

- `createDecision`
- `updateDecision`
- `softDeleteDecision`
- `listDecisions`
- `linkDecisionEvidence`
- appointment CRUD
- task CRUD
- task linking

Requirements:

- Status changes are audited.
- Queries support upcoming/open filters.
- Add unit tests.

## Secondary Tickets If Time Allows

- BE-014 medications/responses API
- BE-015 procedure/test event API
- BE-016 source library API

Only start these after the primary tickets pass verification.

## Verification

Run and keep passing:

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

## Deliverables

- Backend services/actions for the primary tickets.
- Updated contracts if needed.
- Tests for new behavior.
- Updated backend docs or completion note.
- A short handoff section listing exactly which functions Claude can call next and example payloads.

## Definition Of Done

- Flare and vasomotor APIs are usable from frontend.
- Timeline API returns normalized data from demo fixtures.
- Diagnostic tree/evidence API supports the first UI.
- Decisions and schedule APIs support first UI.
- All verification commands pass or blockers are documented.
