# Backend Phase 3 Completion Audit

Objective: complete the remaining Codex-owned backend layer while Claude
continues frontend work: medications/responses, procedure/test events, source
library, clinician export packet, bulk export, metrics, historical import
scaffolding, and final backend handoff docs.

## Success Criteria

- Medication and medication-response services/actions are usable from frontend.
- Procedure/test event services/actions support the procedure impact view.
- Source library services/actions support source CRUD, source links, and file
  attachments.
- Clinician export packet produces concise markdown from existing service/query
  functions.
- Bulk export produces at least structured data and an uploaded-file manifest.
- Metrics API returns dashboard/chart aggregates.
- Historical import scaffold is idempotent and does not modify source records.
- Phase 3 handoff and completion audit exist.
- Required verification commands pass or blockers are documented.

## Prompt-To-Artifact Checklist

| Requirement                                         | Evidence                                                                                                                                                                                                                                                    | Status |
| --------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ |
| Avoid frontend-owned files                          | Phase 3 backend work is in `src/server/**`, `supabase/**`, `scripts/**`, and `docs/backend/**`. Only existing frontend files were touched by the configured formatter, and one stale compile-only form call was already resolved before backend completion. | Done   |
| BE-014 medication CRUD                              | `src/server/services/medications.ts`, `src/server/actions/medications.ts`                                                                                                                                                                                   | Done   |
| BE-014 medication response CRUD                     | `src/server/services/medications.ts`, `src/server/actions/medications.ts`                                                                                                                                                                                   | Done   |
| BE-014 response queries by medication/date/entry    | `listMedicationResponses` in `src/server/services/medications.ts`                                                                                                                                                                                           | Done   |
| BE-014 30/60/120 checkpoints and effects            | Existing medication contracts plus tests in `src/server/services/medications.test.ts`                                                                                                                                                                       | Done   |
| BE-015 procedure/test API                           | `src/server/services/procedures.ts`, `src/server/actions/procedures.ts`                                                                                                                                                                                     | Done   |
| BE-015 required procedure impact fields             | `src/server/contracts/procedures.ts`; normalization test in `src/server/services/procedures.test.ts`                                                                                                                                                        | Done   |
| BE-015 timeline representation                      | Procedure/test rows use existing `events` table and are already consumed by `listTimelineItems`                                                                                                                                                             | Done   |
| BE-016 source CRUD                                  | `src/server/services/sources.ts`, `src/server/actions/sources.ts`                                                                                                                                                                                           | Done   |
| BE-016 link sources to events/diagnoses/decisions   | `linkSourceToEvent`, `linkSourceToDiagnosis`, `linkSourceToDecision`                                                                                                                                                                                        | Done   |
| BE-016 attach files to sources                      | `attachFileToSource` uses existing attachment link service                                                                                                                                                                                                  | Done   |
| BE-016 source summaries/citation/provider/date/type | `src/server/contracts/sources.ts`, `src/server/services/sources.ts`                                                                                                                                                                                         | Done   |
| BE-017 markdown clinician packet                    | `generateClinicianExportPacket` and `buildClinicianPacketMarkdown` in `src/server/services/exports.ts`; action in `src/server/actions/exports.ts`                                                                                                           | Done   |
| BE-017 packet includes requested sections           | Export markdown test checks section shape; service composes diagnoses, meds, decisions, appointments/tasks, flares, vasomotor deltas/photos, procedure summaries, timeline, and questions                                                                   | Done   |
| BE-017 uses existing services/query functions       | Export service calls timeline, diagnoses, medications, decisions, schedule, vasomotor, and procedure services                                                                                                                                               | Done   |
| BE-018 structured bulk export                       | `createBulkDataExport` in `src/server/services/exports.ts`                                                                                                                                                                                                  | Done   |
| BE-018 uploaded file manifest                       | `uploaded_file_manifest` in `BulkExport` contract and service                                                                                                                                                                                               | Done   |
| BE-018 generated packets                            | Bulk export optionally includes generated clinician packets                                                                                                                                                                                                 | Done   |
| BE-018 soft-delete behavior                         | `export_family_data(include_soft_deleted)` RPC enforces primary/caregiver for soft-deleted export requests                                                                                                                                                  | Done   |
| BE-018 zip practical fallback                       | Manifest-first implementation documented in `PHASE_3_HANDOFF.md` and `BulkExport.limitations`                                                                                                                                                               | Done   |
| BE-019 metrics API                                  | `src/server/services/metrics.ts`, `src/server/actions/metrics.ts`                                                                                                                                                                                           | Done   |
| BE-019 aggregate coverage                           | Metrics contract/service covers flares per week, recovery, pain by body region, trigger frequency, medication response summary, vasomotor deltas, upcoming appointments/tasks, open decisions                                                               | Done   |
| BE-020 historical import scaffold                   | `supabase/seed/004_historical_import.sql`                                                                                                                                                                                                                   | Done   |
| BE-020 listed report paths                          | Historical seed includes the required report paths and `records_md/generated/` collection row                                                                                                                                                               | Done   |
| BE-020 conservative/idempotent/no source mutation   | Historical seed uses deterministic UUIDs, `on conflict`, generic summaries, and does not write to source files                                                                                                                                              | Done   |
| Handoff docs                                        | `docs/backend/PHASE_3_HANDOFF.md`                                                                                                                                                                                                                           | Done   |
| Completion audit                                    | `docs/backend/PHASE_3_COMPLETION_AUDIT.md`                                                                                                                                                                                                                  | Done   |
| Tests for new behavior                              | Medication, procedure, source, metrics, export, and Phase 3 action tests under `src/server/**`                                                                                                                                                              | Done   |

## Verification Commands

Passing:

- `npm run typecheck`
- `npm run lint`
- `npm run format`
- `npm run test` (33 tests)
- `npm run build`
- `npm run db:verify:local-postgres`
- `npx supabase start`
- `npx supabase db reset`
- `npm run supabase:seed` (run twice to verify idempotency)
- `npm run supabase:verify`

## Notes

- Bulk export is manifest-first. Zip archive assembly is deferred by design
  because the Phase 3 goal allowed a documented manifest-first implementation if
  zip was not practical in this phase.
- Historical import deliberately creates source/event/evidence anchor rows
  instead of over-parsing medical records.
- Supabase multi-statement SQL files continue to run through
  `scripts/run-supabase-sql.sh`.
