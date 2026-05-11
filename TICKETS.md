# Bella Care Tracker - Implementation Tickets

## Ownership Model

Backend owner: **Codex**

- Supabase schema and migrations
- Row Level Security policies
- Auth/role model
- Private storage and signed URLs
- Server actions / API routes
- Seed/import scripts
- Export generation
- Validation schemas and TypeScript data contracts

Frontend owner: **Claude**

- Next.js App Router UI
- shadcn/ui components
- App shell and navigation
- Forms, views, filters, charts, and responsive layouts
- Client-side state and UX flows
- Integration against Codex-provided typed backend functions

Shared rule:

- Codex defines backend contracts first.
- Claude builds against those contracts.
- Claude should not change database schema, RLS, storage policies, or server action signatures without a paired backend ticket.
- Codex should not redesign UI flows unless a backend constraint requires it.

## Milestone 0 - Project Scaffold And Contracts

### BE-000 - Tooling And CI Baseline

Owner: Codex

Choose and document the backend/tooling baseline before schema work starts.

Decisions:

- Migration/data-access approach: raw Supabase SQL migrations, Drizzle, Prisma, Kysely, or another option.
- Test framework: Vitest for unit tests.
- End-to-end framework: Playwright.
- Formatting/linting: ESLint, Prettier, Husky, lint-staged.
- CI: GitHub Actions running typecheck, lint, and tests on PR.
- Deploy flow: Vercel preview deployments.

Requirements:

- Add package scripts for typecheck, lint, test, and e2e.
- Document local setup and migration workflow.
- Keep schema/migration choice compatible with Supabase RLS and SQL policies.

Definition of done:

- Tooling decision is documented.
- CI workflow exists.
- A trivial test passes locally and in CI.
- Vercel preview deployment path is documented.

### BE-001 - Define Database Schema Migration

Owner: Codex

Create the initial Supabase schema for:

- roles
- users/profiles
- body_regions
- symptoms
- triggers
- entries
- entry_regions
- entry_symptoms
- entry_triggers
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

- Use UUID primary keys.
- Include `created_at`, `updated_at`, and `deleted_at` where applicable.
- Add useful indexes for timeline queries, entry timestamps, diagnosis status, linked entities, and soft-delete filtering.
- Include seed rows for roles, body regions, symptoms, and Bella-specific triggers.
- Document any intentional polymorphic-link tradeoffs.
- Enable RLS on every table at creation time, even before final policies are implemented.

Definition of done:

- Migration runs cleanly on a fresh Supabase project.
- Seed data loads.
- Generated TypeScript types compile.
- No table is accidentally left without RLS enabled.

### BE-001a - Demo And Fixture Data Seed

Owner: Codex

Create non-production fixture data so Claude can build UI states without hand-entering data after every reset.

Fixture data:

- Several pain entries across baseline, flare, recovery, and procedure-related types.
- At least one active or recently ended flare with checkpoints.
- Left/right photo comparison placeholders.
- Vasomotor measurement rows with temperature deltas.
- Sample appointments and tasks.
- Sample decisions in multiple statuses.
- Seed diagnostic tree nodes with evidence links.
- Example procedure impact entry.

Requirements:

- Clearly separate fixture/demo seed from production reference seed.
- Fixtures must be safe fake data, not real medical details unless explicitly imported by a later import ticket.
- Fixture seed is idempotent.

Definition of done:

- Claude can reset local/dev data and immediately see populated UI states.
- Fixture data covers empty, normal, and high-density states.

### BE-002 - Define Shared TypeScript Contracts

Owner: Codex

Create shared TypeScript/Zod contracts for all backend-facing data shapes.

Contracts needed:

- Entry create/update
- Flare session create/update/end
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
- Care team member
- Avoid/contraindication item
- Versioned case summary
- Emergency packet request/response
- Record attribution fields (`subject_user_id`, `entered_by_user_id`)

Definition of done:

- Claude can import stable types.
- All server actions/API routes validate input with Zod.
- Type names and field names match schema.
- All timestamps are stored in UTC; clients render in the user's timezone.
- List/query contracts define default page size `50` and max page size `200`.

### FE-001 - Next.js App Shell

Owner: Claude

Build the authenticated app shell.

Views:

- Dashboard
- Flare Mode
- Pain Book
- Log Book
- Timeline
- Diagnostic Tree
- Decisions
- Schedule
- Medications
- Procedures & Tests
- Source Library
- Export Packet
- Settings

Requirements:

- Use shadcn/ui and Tailwind.
- Use a compact left nav on desktop.
- Use bottom or drawer navigation on mobile.
- No marketing hero.
- Make "Start flare" globally accessible.

Backend dependency:

- Auth/profile contract from BE-003.

Definition of done:

- Empty-state navigation works.
- Mobile and desktop layouts are usable.
- No mock schema divergence from backend contracts.

### FE-000 - Onboarding Privacy Disclosure

Owner: Claude

Build first-login disclosure UI.

Message:

- This is a family-controlled personal health record, not a HIPAA-covered clinical system.
- Data is private to invited users.
- No third-party analytics should process medical text/events.
- Records are soft-deleted by default.
- The family can export all data at any time.

Backend dependency:

- Auth/profile contract from BE-003.

Definition of done:

- New users see the disclosure once.
- Acknowledgement is stored on the profile.

## Milestone 1 - Auth, Roles, Privacy

### BE-003a - Auth Method Decision

Owner: Codex

Choose the initial authentication method before FE auth UI is finalized.

Recommended default:

- Email magic link for family users.
- Optional password + MFA path for primary/caregiver accounts if needed.

Decision points:

- Magic link vs email/password.
- MFA requirement for primary/caregiver.
- Session duration and timeout.
- Invite flow for family/viewer accounts.

Definition of done:

- Auth method is documented.
- FE-001 and FE-002 know what screens/states to build.
- Supabase auth settings needed for local/dev/prod are listed.

### BE-003 - Supabase Auth, Profiles, Roles, And RLS

Owner: Codex

Implement auth model.

Requirements:

- Supabase auth users map to app profile rows.
- Roles: primary, caregiver, viewer, clinician_readonly.
- RLS denies access by default.
- Primary/caregiver can create/update normal records.
- Viewer and clinician_readonly are read-only.
- Soft-deleted rows are hidden by default.
- MFA should be supported/configurable for primary and caregiver accounts.

Definition of done:

- RLS tests or SQL verification queries prove read/write boundaries.
- A new user can be assigned a role.
- No table is publicly readable.
- Auth flow follows BE-003a.

### BE-004 - Audit Log And Soft Delete Helpers

Owner: Codex

Implement backend helpers for soft delete and audit logging.

Requirements:

- Create/update/delete actions write audit events for decisions, diagnoses, sources, medications, and appointments.
- Soft delete sets `deleted_at`.
- Normal read queries exclude `deleted_at`.
- Admin/debug query can include deleted rows when explicitly requested.

Definition of done:

- Mutations produce audit rows.
- Delete operations do not physically remove medical records.

### FE-002 - Settings And Access UI

Owner: Claude

Build Settings screens for:

- Profile
- Role display
- Family users list
- MFA status placeholder
- Data export entry point

Backend dependency:

- BE-003, BE-004.

Definition of done:

- User can see current role and account state.
- No UI exposes actions that role cannot perform.

## Milestone 2 - Pain Book, Log Book, And Flare Mode

### BE-005 - Entries API

Owner: Codex

Implement server actions/API for entries.

Actions:

- `createEntry`
- `updateEntry`
- `softDeleteEntry`
- `getEntry`
- `listEntries`
- `listEntriesByDateRange`

Support:

- Entry type
- Pain scores
- Body regions
- Symptoms
- Triggers
- Notes
- Flare flag
- Recovery time

Definition of done:

- CRUD works with RLS.
- List supports date range, type, flare-only, body region, symptom, and trigger filters.
- Inputs are Zod-validated.

### FE-003 - Pain Book Entry Form

Owner: Claude

Build structured pain entry UI.

Fields:

- Entry type
- Date/time
- Pain current/peak/average
- Body regions
- Pain qualities
- Triggers
- Function impact
- Interventions tried
- Notes
- Attachments section placeholder

Backend dependency:

- BE-005.

Definition of done:

- Create/edit works.
- Form is fast on mobile.
- Bella-specific triggers are easy one-tap options.
- Form validation reuses BE-002 Zod schemas through `@hookform/resolvers/zod`.

### FE-004 - Log Book Entry Form

Owner: Claude

Build freeform event logging UI.

Use cases:

- Arm froze after BP cuff.
- Knee color/temperature change.
- New foot/big-toe numbness.
- Medication reaction.
- ED visit.
- Cognitive/vision/speech episode.

Backend dependency:

- BE-005.

Definition of done:

- Log entries can be tagged with symptoms, regions, triggers, and notes.
- Entries appear in timeline once timeline exists.
- Form validation reuses BE-002 Zod schemas through `@hookform/resolvers/zod`.

### BE-006 - Flare Session API

Owner: Codex

Implement flare-specific backend flow on top of entries.

Actions:

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

Definition of done:

- Only one active flare per user by default.
- Checkpoints preserve timestamps.
- Ending flare computes duration and recovery fields.

### FE-005 - Flare Mode UI

Owner: Claude

Build the live flare workflow.

Requirements:

- Global Start flare button.
- Active flare status bar.
- Quick pain score update.
- Add symptoms/triggers/regions.
- Add checkpoint.
- Add photo/temperature pair once BE-007/BE-008 are ready.
- End flare and summarize.

Backend dependency:

- BE-006.

Definition of done:

- A flare can be started and ended in under one minute.
- Checkpoints are easy to add on mobile.
- Form validation reuses BE-002 Zod schemas through `@hookform/resolvers/zod`.

## Milestone 3 - Uploads, Photo Comparison, Vasomotor Data

### BE-007 - Private Storage And Attachment API

Owner: Codex

Implement Supabase storage.

Requirements:

- Private bucket only.
- No public file URLs.
- Signed short-lived URLs for preview/download.
- File metadata in `attachments`.
- Link files to entries, events, diagnoses, decisions, appointments, or sources.
- Support image, video, PDF, and markdown/text files.
- Enforce allowed mime types and a max upload size, initially 50 MB per file.
- Perform server-side mime sniffing; do not trust client-provided mime type alone.
- Strip GPS EXIF metadata from uploaded images while preserving capture timestamp when available.

Actions:

- `createUploadUrl` or equivalent direct upload flow
- `createAttachment`
- `linkAttachment`
- `getSignedAttachmentUrl`
- `softDeleteAttachment`

Definition of done:

- Uploads are private.
- Signed previews work.
- RLS prevents cross-user access.
- Oversized or disallowed files are rejected.
- GPS EXIF is removed from image uploads.

### BE-008 - Vasomotor Measurement API

Owner: Codex

Implement paired temperature/color data.

Actions:

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

Definition of done:

- Delta is computed consistently.
- Measurements can be queried by date range, site, and entry.
- Measurement links to image attachments.

### FE-006 - Upload Component

Owner: Claude

Build reusable upload UI.

Requirements:

- Drag/drop on desktop.
- Camera-friendly upload on mobile.
- Image/video/PDF preview.
- Upload progress.
- Description field.
- Attach to current entity.

Backend dependency:

- BE-007.

Definition of done:

- Uploads work from Pain Book, Log Book, Flare Mode, Source Library.

### FE-007 - Photo Comparison And Temperature Capture

Owner: Claude

Build side-by-side vasomotor documentation UI.

Workflow:

- Select body site pair.
- Upload/capture left photo.
- Upload/capture right photo.
- Record L/R temperatures.
- Show computed delta.
- Record lighting and context.
- Link to flare/log entry.

Backend dependency:

- BE-007, BE-008.

Definition of done:

- Clinician-readable comparison panel exists.
- Panels can be included in export packet later.

## Milestone 4 - Timeline

### BE-009 - Timeline Query API

Owner: Codex

Create a unified timeline query that merges:

- entries
- flares
- events
- appointments
- medication changes
- procedures/tests
- decisions
- sources/uploads
- diagnosis updates

Filters:

- date range
- item type
- body region
- symptom
- trigger
- diagnostic branch
- flare only
- media only

Definition of done:

- Returns normalized `TimelineItem[]`.
- Supports pagination.
- Includes linked attachments and evidence counts.

### FE-008 - Timeline View

Owner: Claude

Build timeline UI.

Requirements:

- Dense chronological layout.
- Filters.
- Search.
- Expand item detail.
- Attachment preview.
- Link to diagnostic branch / decision / source.

Backend dependency:

- BE-009.

Definition of done:

- Historical records and new logs appear together.
- Filters are fast and understandable.

## Milestone 5 - Diagnostic Tree And Evidence

### BE-010 - Diagnostic Node And Evidence API

Owner: Codex

Implement diagnosis/evidence backend.

Actions:

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
- Track evidence direction: supports, weakens, neutral, pending.
- Store merge/split history in audit log.
- Allow links to entries, events, attachments, sources, decisions, and measurements.

Definition of done:

- Initial diagnostic tree can be seeded.
- Evidence links preserve source context.
- Merge/split actions are auditable.

### BE-011 - Seed Diagnostic Tree From Existing Reports

Owner: Codex

Create seed/import script for initial diagnostic branches from `DESIGN.md` and final treatment plan.

Initial nodes:

- Mixed-mechanism post-traumatic left lateral-thigh pain
- Focal scar / terminal branch / vastus-lateralis generator
- CRPS / chronic cold-phase phenotype
- CRPS Type I vs Type II subtype question
- Branch-to-vastus-lateralis motor injury
- L5 / peroneal / plexus foot/big-toe localization
- Central sensitization / nociplastic pain
- Functional movement disorder or CRPS motor overlay
- Autoimmune SFN
- Sjogren-related SFN / ganglionitis
- MCAS
- Sodium channelopathy
- AAG
- Occult vascular / lymphatic scar lesion
- Post-TBI cognitive / visual / gait track

Definition of done:

- Seed can run idempotently.
- Nodes include initial summaries and open questions.

### FE-009 - Diagnostic Tree UI

Owner: Claude

Build diagnostic tree view.

Requirements:

- Node list or tree layout.
- Status/confidence indicators.
- Evidence for/against sections.
- Tests needed.
- Treatment implications.
- Open questions.
- Linked entries/events/uploads.
- Merge/split affordance placeholder.

Backend dependency:

- BE-010, BE-011.

Definition of done:

- User can understand why each diagnosis is supported, weakened, or unresolved.

## Milestone 6 - Decisions And Scheduling

### BE-012 - Decisions API

Owner: Codex

Implement structured decision journal backend.

Actions:

- `createDecision`
- `updateDecision`
- `softDeleteDecision`
- `listDecisions`
- `linkDecisionEvidence`

Definition of done:

- Decisions can link evidence.
- Status changes are audited.

### FE-010 - Decisions Board

Owner: Claude

Build decisions UI.

Views:

- Board by status.
- Decision detail.
- Evidence for/against.
- Risks.
- What would change the decision.
- Final decision/rationale.

Backend dependency:

- BE-012.

Definition of done:

- Family can centralize open medical decisions.

### BE-013 - Appointments And Tasks API

Owner: Codex

Implement scheduling backend.

Actions:

- CRUD appointments
- CRUD tasks
- Link tasks to appointments/decisions/diagnoses/sources

Definition of done:

- Appointments and tasks support visit prep and follow-up.

### FE-011 - Schedule And Visit Prep UI

Owner: Claude

Build schedule UI.

Requirements:

- Appointment list/calendar-lite.
- Visit prep questions.
- Files/photos to show.
- After-visit summary.
- Follow-up tasks.

Backend dependency:

- BE-013.

Definition of done:

- A doctor visit can be prepared from recent logs and decisions.

## Milestone 7 - Medications, Procedures, Sources

### BE-014 - Medications And Responses API

Owner: Codex

Implement medication inventory and response tracking.

Actions:

- CRUD medications
- CRUD medication responses
- Query responses by medication/date/entry

Definition of done:

- Medication response can be linked to pain/flaring entries.
- Response checkpoints support 30/60/120 minutes.

### FE-012 - Medication Tracker UI

Owner: Claude

Build medication and response UI.

Requirements:

- Current meds.
- Past meds.
- Start/stop dates.
- Response history.
- Side effects.
- Linked pain entries.

Backend dependency:

- BE-014.

Definition of done:

- Medication effects can be reviewed over time.

### BE-015 - Procedure/Test Event API

Owner: Codex

Implement event support for procedures/tests and impact checkpoints.

Procedure fields:

- diagnostic question
- baseline before
- immediate effect
- 24h / 72h / 1 week / 1 month effect
- new symptoms
- did it answer the question
- repeat recommendation

Definition of done:

- Existing procedures can be imported.
- New procedures can be tracked prospectively.

### FE-013 - Procedure Impact View

Owner: Claude

Build procedure impact UI.

Requirements:

- One page per procedure.
- Diagnostic question at top.
- Baseline/immediate/follow-up sections.
- New symptoms.
- Repeat/not-repeat conclusion.
- Linked photos/logs/records.

Backend dependency:

- BE-015.

Definition of done:

- Prior nondiagnostic procedures can be reviewed consistently.

### BE-016 - Source Library API

Owner: Codex

Implement source record backend.

Actions:

- CRUD sources
- Link sources to events/diagnoses/decisions
- Attach files
- Store summary/citation

Definition of done:

- Existing markdown reports and PDFs can be represented as sources.

### FE-014 - Source Library UI

Owner: Claude

Build source library UI.

Requirements:

- Upload/list sources.
- Filter by type/date/provider.
- View summary.
- Link source to timeline/diagnosis/decision.

Backend dependency:

- BE-016.

Definition of done:

- Records are searchable and linkable.

## Milestone 8 - Export And Data Ownership

### BE-017 - Clinician Export Packet

Owner: Codex

Generate export packets.

Inputs:

- subject user
- date range
- diagnostic branch
- body region
- care team member
- flares only
- include photos
- include procedure summaries

Outputs:

- Markdown first
- PDF later

Packet should include:

- current working diagnosis
- working diagnosis paragraph, not only the label
- active versioned case summary when available
- confirmed-by criteria for active/supported diagnostic branches
- current meds
- active decisions
- upcoming appointments/tests
- flare frequency and recovery time
- selected photo comparisons and temperature deltas
- procedure impact summaries
- key timeline items
- clinician questions

Definition of done:

- Markdown export works.
- Output is clinician-readable.

### BE-017a - Safety And Care Coordination Backend Foundation

Owner: Codex

Implement backend foundation for emergency/safety records.

Schema/contracts:

- `care_team_members`
- `avoid_contraindications`
- `case_summary_versions`
- `emergency_packet_reviews`
- `subject_user_id` and `entered_by_user_id` attribution on medical records
- care team links from appointments, decisions, medications, sources, and procedure/test events

Requirements:

- RLS enabled on all new tables.
- Soft-delete and audit hooks included.
- Caregiver-entered records preserve who the record is about and who entered it.
- Avoid/contraindication items include category, severity, reaction/description, evidence/source, active/inactive, and last-reviewed fields.
- Versioned case summary stores calibrated family/clinician-authored narrative and is not treated as a diagnosis assertion.
- No AI Q&A, automatic flare prediction, or automatic pattern interpretation.

Definition of done:

- Migration runs on a fresh database.
- Shared Zod/TypeScript contracts validate.
- Bulk export includes the new tables.
- Visit packet can use active case summary as its working paragraph source.

### BE-017b - Emergency Packet Markdown Export

Owner: Codex

Generate the emergency packet separately from the visit packet.

Inputs:

- subject user
- generated timestamp

Sections:

- calibrated active case summary
- current medications
- allergies and medication intolerances
- avoid/contraindication items
- care team contacts/roles
- last-reviewed timestamp

Requirements:

- Markdown first, PDF later.
- One-page ED-oriented output.
- Each section has a clear source table.
- Output does not diagnose, predict, or recommend treatment.

Definition of done:

- Server action returns typed emergency packet data and Markdown.
- Packet source map identifies source table/row for each section.
- Disabled or inactive safety items are excluded from the emergency packet but remain available in structured data/export.

### FE-015 - Export Packet UI

Owner: Claude

Build export packet builder.

Requirements:

- Select date range/scope.
- Select sections.
- Preview summary.
- Download markdown.
- PDF placeholder if not ready.

Backend dependency:

- BE-017.

Definition of done:

- Family can generate a visit summary before appointments.

### BE-018 - Bulk Data Export

Owner: Codex

Implement full data export.

Output:

- JSON or CSV for structured tables
- Uploaded files
- Generated export packets
- Zip archive

Definition of done:

- A complete archive can be generated and downloaded.
- Export excludes soft-deleted records unless explicitly requested by primary/caregiver.

### FE-016 - Bulk Export UI

Owner: Claude

Build data ownership export UI.

Backend dependency:

- BE-018.

Definition of done:

- User can request and download all app data.

### FE-016a - Safety List UI

Owner: Claude

Build UI for avoid/contraindication records.

Requirements:

- Create/edit/list active and inactive safety items.
- Support allergy, medication intolerance, procedure precaution, physical do-not, and care-context warning categories.
- Show severity, reaction/description, evidence/source, active state, and last-reviewed date.
- Keep disabled/inactive items visible and exportable where applicable.
- Surface active items in pre-procedure planning contexts.

Backend dependency:

- BE-017a.

Definition of done:

- Family can maintain the safety list without editing packet text directly.
- UI uses Codex-provided contracts and server actions.

### FE-016b - Care Team UI

Owner: Claude

Build care team management and linking UI.

Requirements:

- Create/edit/list care team members.
- Track organization, specialty/role, portal/contact notes, what they manage, last visit, and next visit.
- Let appointments, decisions, medications, sources, and procedure/test events link to a care team member while preserving existing free-text provider fields.

Backend dependency:

- BE-017a.

Definition of done:

- Care team members can be selected where provider/prescriber/owner strings are currently repeated.

### FE-016c - Emergency Packet UI

Owner: Claude

Build emergency packet view/download UI.

Requirements:

- Separate from visit packet builder.
- Show one-page ED-oriented preview.
- Download Markdown.
- Display last-reviewed timestamp.
- Include clear affordance to review safety list and case summary before export.
- Do not add diagnostic interpretation or treatment recommendations.

Backend dependency:

- BE-017b.

Definition of done:

- Family can generate the current emergency packet quickly from Settings or Export Packets.

## Milestone 9 - Dashboard And Charts

### BE-019 - Metrics Query API

Owner: Codex

Create aggregate queries for:

- flares per week
- recovery time
- pain by body region
- trigger frequency
- medication response summary
- vasomotor deltas over time
- upcoming appointments/tasks
- open decisions

Definition of done:

- Metrics are efficient and scoped by RLS.

### FE-017 - Dashboard

Owner: Claude

Build dashboard.

Sections:

- Active flare/current status
- Upcoming appointments
- Open decisions
- Recent flares
- Recent uploads/photo comparisons
- Current meds
- Tasks due
- Key trends

Backend dependency:

- BE-019 plus earlier APIs.

Definition of done:

- Dashboard answers "what needs attention now?"

### FE-018 - Charts And Trend Views

Owner: Claude

Build focused charts.

Charts:

- flare frequency
- recovery time
- trigger frequency
- pain by body region
- vasomotor temperature deltas
- medication response

Backend dependency:

- BE-019.

Definition of done:

- Charts are readable and not decorative.

## Cross-Cutting Tickets

### BE-020 - Import Historical Timeline From Workspace

Owner: Codex

Create import script for current records/reports.

Sources:

- final treatment plan
- diagnosis report
- literature reports
- new data addendum
- generated record markdown

Output:

- historical timeline events
- source rows
- initial procedure/test events
- initial diagnostic evidence links where practical

Definition of done:

- Import can be rerun idempotently.
- Imported records are tagged as imported.

### FE-019 - Empty States And Loading/Error UX

Owner: Claude

Build consistent empty/loading/error states.

Definition of done:

- Every major view has a useful empty state.
- Errors are actionable and non-technical.
- Destructive actions use a consistent confirmation pattern.
- Soft-delete confirmations capture an optional reason for medical records, decisions, diagnostic nodes, sources, medications, and appointments.

### SEC-001 - Security Review Checklist

Owner: Codex

Run a repeatable security review after BE-003 and BE-007 ship.

Timing:

- First pass immediately after auth/RLS and private storage are implemented.
- Repeat before any production sharing outside the core family.

Checklist:

- RLS coverage matrix for every table.
- Negative cross-account access tests.
- Signed URL TTL audit.
- MFA verified for primary/caregiver accounts.
- Session timeout verified.
- File upload mime sniffing verified.
- File path traversal checks.
- GPS EXIF stripping verified.
- No public storage buckets.
- No third-party trackers or analytics in production build.

Definition of done:

- Checklist exists in the repo.
- Each item has pass/fail evidence.
- Any failure creates a follow-up ticket before production sharing.

### OPS-001 - Backup And Disaster Recovery Note

Owner: Codex

Document backup and recovery expectations.

Content:

- What Supabase plan backups cover.
- What they do not cover.
- Recommended family-owned manual export cadence.
- How to run a bulk export.
- How to restore from exported structured data and files at a high level.

Definition of done:

- Backup note exists in README or Settings copy source.
- Settings UI can link to or display the note later.

### BE-021 - Offline Capture Design Spike

Owner: Codex

Design the offline persistence strategy for future implementation.

Scope:

- local queue shape
- timestamp preservation
- attachment staging
- conflict resolution
- sync API requirements

Definition of done:

- A short design note exists.
- Frontend can avoid choices that block offline capture later.

### FE-020 - Mobile Flare UX Spike

Owner: Claude

Prototype the fastest possible mobile flare capture flow.

Definition of done:

- Start flare, pain score, trigger, region, photo pair, temp pair can be captured with minimal taps.

## Suggested Build Order

1. BE-000, BE-001, BE-001a, BE-002, BE-003a, BE-003
2. BE-021, FE-000, FE-001, FE-002
3. BE-005, BE-007
   4a. FE-003, FE-004, FE-006
   4b. BE-006, BE-008, FE-005, FE-007, FE-020
   4c. SEC-001 first pass
4. BE-009, FE-008
5. BE-010, BE-011, FE-009
6. BE-012, BE-013, FE-010, FE-011
7. BE-014, BE-015, BE-016, FE-012, FE-013, FE-014
8. BE-017, BE-018, FE-015, FE-016
9. BE-019, FE-017, FE-018
10. BE-020, FE-019
11. OPS-001, SEC-001 final pass before production sharing
