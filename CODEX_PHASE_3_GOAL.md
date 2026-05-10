# Codex Phase 3 Goal - Backend Completion Layer

## Goal

Complete the remaining Codex-owned backend layer while Claude continues frontend work: medications/responses, procedure/test events, source library, clinician export packet, bulk export, metrics, historical import scaffolding, and final backend handoff docs.

## Current State

Backend Phase 2 is complete. Read:

- `docs/backend/PHASE_2_COMPLETION_AUDIT.md`
- `docs/backend/PHASE_2_HANDOFF.md`
- `README.md`
- `ARCHITECTURE.md`
- `TICKETS.md`
- `src/server/contracts/*`
- `src/server/actions/*`
- `src/server/services/*`

Claude is still actively working on frontend phase 1. Treat frontend files as owned by Claude.

## Ownership Boundary

Codex may edit:

- `src/server/**`
- `supabase/**`
- `scripts/**`
- `docs/backend/**`
- backend tests
- shared contracts only when needed for backend tickets

Avoid editing:

- `src/app/**`
- `src/components/**`
- `src/features/**`
- `src/lib/**` unless it is clearly backend-safe and not UI behavior
- shadcn UI files
- frontend routes/layouts

If a compile issue is caused by concurrent frontend work, prefer documenting the blocker unless a tiny compile-only fix is unavoidable.

## Primary Tickets

### 1. BE-014 - Medications And Responses API

Implement or complete:

- medication CRUD
- medication response CRUD
- query responses by medication/date/entry

Requirements:

- Medication responses can link to entries/flares.
- Response checkpoints support 30/60/120 minutes.
- Include side effects, function effect, and overall response.
- Keep contracts aligned with `src/server/contracts/medications.ts`.
- Add service/action tests.

### 2. BE-015 - Procedure/Test Event API

Implement procedure/test event support.

Procedure fields:

- diagnostic question
- baseline before
- immediate effect
- 24h effect
- 72h effect
- 1 week effect
- 1 month effect
- new symptoms
- did it answer the diagnostic question
- repeat recommendation

Requirements:

- Existing procedure/test events can be imported or represented.
- New procedure/test events can be tracked prospectively.
- Data should appear in timeline API.
- Add service/action tests.

### 3. BE-016 - Source Library API

Implement or complete:

- source CRUD
- link sources to events/diagnoses/decisions
- attach files to sources
- store summary/citation/provider/date/type

Requirements:

- Existing markdown reports and PDFs can be represented as sources.
- Source rows can be linked as evidence.
- Add service/action tests.

### 4. BE-017 - Clinician Export Packet

Generate markdown export packets.

Inputs:

- date range
- diagnostic branch
- body region
- flares only
- include photos
- include procedure summaries

Packet must include:

- working diagnosis paragraph
- confirmed-by criteria for active/supported diagnostic branches
- current meds
- active decisions
- upcoming appointments/tests
- flare frequency and recovery time
- selected photo comparisons and temperature deltas
- procedure impact summaries
- key timeline items
- clinician questions

Requirements:

- Start with markdown output.
- Keep output concise and clinician-readable.
- Export should use existing service/query functions, not duplicate raw query logic.
- Add tests for export content shape.

### 5. BE-018 - Bulk Data Export

Implement full data export.

Output:

- JSON or CSV for structured tables
- uploaded file manifest
- generated export packets
- zip archive if practical in this phase; otherwise a documented manifest-first implementation

Requirements:

- Exclude soft-deleted records unless explicitly requested by primary/caregiver.
- Include enough metadata to restore or migrate data later.
- Add tests for manifest/content generation.

### 6. BE-019 - Metrics Query API

Implement aggregate queries:

- flares per week
- recovery time
- pain by body region
- trigger frequency
- medication response summary
- vasomotor deltas over time
- upcoming appointments/tasks
- open decisions

Requirements:

- Efficient and scoped by RLS-compatible service calls.
- Return frontend-friendly DTOs.
- Add tests with demo fixture-style data.

### 7. BE-020 - Import Historical Timeline From Workspace

Create idempotent import scaffolding for current workspace records/reports.

Sources:

- `reports_md/FINAL_TREATMENT_PLAN_2026-05-08.md`
- `reports_md/MOST_LIKELY_DIAGNOSIS_2026-05-08.md`
- `reports_md/NEXT_STEPS_LITERATURE_2026-05-08.md`
- `reports_md/NEXT_STEPS_DEEPER_RESEARCH_2026-05-08.md`
- `reports_md/record_synthesis/NEW_DATA_ADDENDUM_2026-05-08.md`
- `records_md/generated/`

Output:

- historical timeline events
- source rows
- initial procedure/test events
- initial diagnostic evidence links where practical

Requirements:

- Prefer a conservative importer that creates structured source/event rows without over-parsing.
- Idempotent reruns.
- Imported rows tagged as imported.
- Do not modify source medical records.

## Secondary Tasks

### Backend Handoff Update

Create `docs/backend/PHASE_3_HANDOFF.md` listing:

- new actions/functions
- import paths
- example payloads
- response shapes
- known limitations
- frontend tickets unblocked

### Completion Audit

Create `docs/backend/PHASE_3_COMPLETION_AUDIT.md` with:

- ticket checklist
- evidence paths
- verification commands run
- blockers or deferred items

## Verification

Run and keep passing:

- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run test`
- `npm run build`
- `npm run db:verify:local-postgres`

If local Supabase is available:

- `npx supabase start`
- `npx supabase db reset`
- `npm run supabase:seed`
- `npm run supabase:verify`

Do not leave dev servers running.

## Definition Of Done

- Medication/response backend is usable from frontend.
- Procedure/test backend supports Procedure Impact View.
- Source library backend supports first source UI.
- Clinician export packet produces useful markdown.
- Bulk export has at least a structured manifest/data export.
- Metrics API supports dashboard and charts.
- Historical import scaffolding exists and is idempotent.
- Phase 3 handoff and completion audit are written.
- Verification commands pass or blockers are documented.
