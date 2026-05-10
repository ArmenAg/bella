# Codex Goal - Backend Foundation

## Goal

Build the Codex-owned backend foundation for Bella Care Tracker so Claude can implement the frontend against stable contracts.

## Read First

- `app/DESIGN.md`
- `app/ARCHITECTURE.md`
- `app/TICKETS.md`

Do not build the full frontend. Only create enough scaffold/sanity UI if needed to verify the app runs.

## Complete These Tickets In Order

### BE-000 - Tooling And CI Baseline

- Scaffold the Next.js app inside `app/`.
- Use Next.js App Router, TypeScript, Tailwind, shadcn/ui-ready structure.
- Choose and document the migration/data-access approach.
- Prefer raw Supabase SQL migrations unless there is a strong reason not to.
- Add ESLint, Prettier, Vitest, basic test scripts.
- Add Playwright only if low cost; otherwise document as next.
- Add package scripts: `dev`, `build`, `typecheck`, `lint`, `format`, `test`.
- Add `app/.env.example`.
- Add GitHub Actions for typecheck/lint/test if repo structure allows it.
- Document local setup and migration workflow.

### BE-001 - Define Database Schema Migration

Create the initial Supabase schema for:

- roles
- profiles
- body_regions
- symptoms
- triggers
- entries
- entry_regions
- entry_symptoms
- entry_triggers
- flare_checkpoints if needed
- vasomotor_measurements
- events
- attachments
- attachment_links
- diagnoses
- evidence_links
- decisions
- appointments
- medications
- medication_responses
- sources
- tasks
- audit_log

Requirements:

- UUID primary keys.
- `created_at`, `updated_at`, `deleted_at` where applicable.
- Store timestamps in UTC.
- Useful indexes for timeline/date filters, linked entities, body region filters, diagnosis status, and soft-delete filtering.
- Enable RLS on every table at creation time.
- No table publicly readable.
- Document polymorphic link tradeoffs.

### BE-001a - Demo And Fixture Data Seed

Create two seed layers:

- Reference seed: roles, body regions, symptoms, Bella-specific triggers.
- Demo fixture seed: fake pain entries, fake flare with checkpoints, fake vasomotor L/R measurements, fake appointments/tasks, fake decisions, fake diagnostic nodes, fake procedure impact entry.

Requirements:

- Seeds are idempotent.
- Demo data is fake/safe.
- Claude can reset dev data and immediately see populated states.

### BE-002 - Shared TypeScript/Zod Contracts

Create shared contracts for:

- Entry create/update
- Flare start/checkpoint/update/end
- Vasomotor measurement create/update
- Attachment metadata
- Timeline item
- Diagnosis node
- Evidence link
- Decision
- Appointment
- Medication
- Medication response
- Export packet request

Requirements:

- Zod validates all mutation inputs.
- DTOs match DB schema.
- Default pagination page size `50`, max `200`.
- All timestamps stored UTC; client renders in user timezone.
- Define consistent error response shape.
- Frontend can reuse schemas via react-hook-form/zod.

### BE-003a - Auth Method Decision

Document the initial auth method.

Recommended:

- Supabase email magic link for family users.
- Optional password + MFA path for primary/caregiver later.

Decide:

- magic link vs email/password
- MFA requirement
- session duration/timeout
- invite flow
- local/dev/prod Supabase auth settings

### BE-003 - Supabase Auth, Profiles, Roles, And RLS

Implement auth/profile/role backend.

Roles:

- primary
- caregiver
- viewer
- clinician_readonly

Requirements:

- Supabase auth users map to profile rows.
- RLS denies by default.
- primary/caregiver can create/update normal records.
- viewer/clinician_readonly are read-only.
- soft-deleted rows hidden by default.
- no public reads.
- RLS tests or SQL verification queries prove boundaries.

### BE-004 - Audit Log And Soft Delete Helpers

- Soft delete sets `deleted_at`.
- Normal reads exclude `deleted_at`.
- Create/update/delete actions write audit events for decisions, diagnoses, sources, medications, appointments, and deletions.
- Admin/debug query can include deleted rows only when explicitly requested.

### BE-005 - Entries API

Implement:

- `createEntry`
- `updateEntry`
- `softDeleteEntry`
- `getEntry`
- `listEntries`
- `listEntriesByDateRange`

Support entry type, pain scores, body regions, symptoms, triggers, notes, flare flag, and recovery time.

Requirements:

- CRUD works with RLS.
- Filters: date range, type, flare-only, body region, symptom, trigger.
- Inputs use BE-002 Zod contracts.

### BE-006 - Flare Session API

Implement:

- `startFlare`
- `addFlareCheckpoint`
- `updateFlare`
- `endFlare`
- `getActiveFlare`

Checkpoints:

- start
- 30m
- 60m
- 120m
- 6h
- 12h
- 24h
- 48h
- custom

Requirements:

- one active flare per user by default.
- checkpoints preserve timestamps.
- ending flare computes duration and recovery fields.

### BE-007 - Private Storage And Attachment API

Implement:

- `createUploadUrl` or equivalent upload flow
- `createAttachment`
- `linkAttachment`
- `getSignedAttachmentUrl`
- `softDeleteAttachment`

Requirements:

- private bucket only.
- no public file URLs.
- signed short-lived URLs.
- metadata in attachments.
- links in attachment_links.
- allowed mime types: images, videos, PDFs, markdown/text.
- max upload size `50 MB`.
- server-side mime sniffing plan or implementation.
- strip GPS EXIF metadata from uploaded images while preserving capture timestamp if available.
- RLS prevents cross-user access.

### BE-008 - Vasomotor Measurement API

Implement:

- `createVasomotorMeasurement`
- `updateVasomotorMeasurement`
- `softDeleteVasomotorMeasurement`
- `listVasomotorMeasurements`

Fields:

- entry_id
- measured_at
- site
- left_temp_c
- right_temp_c
- delta_c
- left_color
- right_color
- lighting_notes
- context
- notes
- linked left/right attachments

### BE-009 - Timeline Query API

Create unified timeline query merging entries, flares, events, appointments, medication changes, procedures/tests, decisions, sources/uploads, and diagnosis updates.

Filters:

- date range
- item type
- body region
- symptom
- trigger
- diagnostic branch
- flare only
- media only

Return normalized `TimelineItem[]` with pagination, linked attachments, and evidence counts.

### BE-010 - Diagnostic Node And Evidence API

Implement:

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

- status/confidence tracking.
- evidence direction: supports, weakens, neutral, pending.
- links to entries, events, attachments, sources, decisions, measurements.
- merge/split actions audited.

### BE-011 - Seed Diagnostic Tree From Existing Reports

Create idempotent seed/import for the initial diagnostic branches listed in `app/TICKETS.md`.

Each node should include initial summary and open questions.

### BE-012 - Decisions API

Implement:

- `createDecision`
- `updateDecision`
- `softDeleteDecision`
- `listDecisions`
- `linkDecisionEvidence`

### BE-013 - Appointments And Tasks API

Implement:

- CRUD appointments
- CRUD tasks
- link tasks to appointments/decisions/diagnoses/sources

### BE-014 - Medications And Responses API

Implement:

- CRUD medications
- CRUD medication responses
- query responses by medication/date/entry

Response checkpoints support 30/60/120 minutes.

### BE-015 - Procedure/Test Event API

Implement procedure/test event support with:

- diagnostic question
- baseline before
- immediate effect
- 24h / 72h / 1 week / 1 month effect
- new symptoms
- did it answer the question
- repeat recommendation

### BE-016 - Source Library API

Implement:

- CRUD sources
- link sources to events/diagnoses/decisions
- attach files
- store summary/citation

### BE-017 - Clinician Export Packet

Generate markdown export packets.

Inputs:

- date range
- diagnostic branch
- body region
- flares only
- include photos
- include procedure summaries

Packet includes:

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

### BE-018 - Bulk Data Export

Implement full export:

- JSON or CSV for structured tables
- uploaded files
- generated export packets
- zip archive

Exclude soft-deleted records unless explicitly requested by primary/caregiver.

### BE-019 - Metrics Query API

Implement aggregate queries:

- flares per week
- recovery time
- pain by body region
- trigger frequency
- medication response summary
- vasomotor deltas over time
- upcoming appointments/tasks
- open decisions

### BE-020 - Import Historical Timeline From Workspace

Create idempotent import script for current workspace records/reports.

Sources:

- `app/DESIGN.md`
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

### BE-021 - Offline Capture Design Spike

Write a design note covering local queue shape, timestamp preservation, attachment staging, conflict resolution, sync API requirements, and frontend constraints.

### SEC-001 - Security Review Checklist

Create and run first-pass checklist after BE-003 and BE-007.

Checklist:

- RLS coverage matrix
- negative cross-account access tests
- signed URL TTL audit
- MFA/session timeout status
- file upload mime sniffing
- path traversal checks
- GPS EXIF stripping
- no public storage buckets
- no third-party analytics/trackers

### OPS-001 - Backup And Disaster Recovery Note

Document Supabase backup expectations, manual export cadence, bulk export process, and high-level restore path.

## Suggested Build Order

1. BE-000, BE-001, BE-001a, BE-002, BE-003a, BE-003
2. BE-021, then FE-000/FE-001/FE-002 can start
3. BE-005, BE-007
4. BE-006, BE-008
5. BE-009 through BE-019 as needed by frontend milestones
6. BE-020, OPS-001, SEC-001 final pass before production sharing

## Definition Of Done For This Codex Phase

- Next/Supabase backend foundation exists.
- Migrations run from scratch.
- RLS enabled on every table.
- Reference and demo seeds run idempotently.
- Shared Zod/TS contracts exist.
- Entries and storage backend slices work.
- Claude has stable contracts and fixtures for first frontend implementation.
- Docs updated if implementation decisions differ from DESIGN/ARCHITECTURE/TICKETS.
