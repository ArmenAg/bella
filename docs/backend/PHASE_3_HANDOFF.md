# Backend Phase 3 Handoff

Claude-owned frontend code should import contracts from `src/server/contracts`
and call server actions from `src/server/actions/*`. Frontend code should not
query Supabase tables directly.

## Medications And Responses

Actions in `src/server/actions/medications.ts`:

- `createMedication(input: CreateMedicationInput)`
- `updateMedication(input: UpdateMedicationInput)`
- `softDeleteMedication(id: string, reason: string)`
- `listMedications(input: MedicationFilter)`
- `createMedicationResponse(input: CreateMedicationResponseInput)`
- `updateMedicationResponse(input: UpdateMedicationResponseInput)`
- `softDeleteMedicationResponse(id: string, reason: string)`
- `listMedicationResponses(input: MedicationResponseFilter)`

Example response payload:

```ts
await createMedicationResponse({
  medication_id: medicationId,
  entry_id: flareEntryId,
  taken_at: new Date().toISOString(),
  reason: "Rescue dose during flare",
  pain_before: 8,
  pain_after_30m: 7,
  pain_after_60m: 5,
  pain_after_120m: 4,
  sedation_effect: "sleepy",
  cognition_effect: "slower",
  gait_effect: "unchanged",
  side_effects: "mild drowsiness",
  helped: "helped",
});
```

Use `listMedicationResponses({ medication_id, date_from, date_to })` for a
single medication history and `listMedicationResponses({ entry_id })` for
flare-linked responses.

## Procedure/Test Events

Actions in `src/server/actions/procedures.ts`:

- `createProcedureEvent(input: CreateProcedureEventInput)`
- `updateProcedureEvent(input: UpdateProcedureEventInput)`
- `softDeleteProcedureEvent(id: string, reason: string)`
- `listProcedureEvents(input: ProcedureEventFilter)`

Example payload:

```ts
await createProcedureEvent({
  type: "procedure_test",
  occurred_at: "2026-05-06T17:00:00.000Z",
  title: "Hydrodissection impact review",
  diagnostic_question: "Did the target respond to anesthetic or steroid?",
  baseline_before: "Pain 4/10 before procedure.",
  immediate_effect: "Flare to 7/10.",
  effect_24h: "Partial improvement.",
  effect_72h: "Unclear.",
  effect_1w: "Return to baseline.",
  effect_1m: "No durable change.",
  new_symptoms: "None recorded.",
  answered_question: "partially",
  repeat_recommendation: "Discuss only if clinician agrees.",
});
```

These rows are stored in `events` and already appear in the timeline API.

## Source Library

Actions in `src/server/actions/sources.ts`:

- `createSource(input: CreateSourceInput)`
- `updateSource(input: UpdateSourceInput)`
- `softDeleteSource(id: string, reason: string)`
- `listSources(input: SourceFilter)`
- `listSourceLinks(sourceId: string)`
- `linkSourceToEvent(input: LinkSourceToEventInput)`
- `linkSourceToDiagnosis(input: LinkSourceToDiagnosisInput)`
- `linkSourceToDecision(input: LinkSourceToDecisionInput)`
- `attachFileToSource(input: AttachFileToSourceInput)`

Example source payload:

```ts
await createSource({
  title: "Visit note",
  source_type: "visit_note",
  source_date: "2026-05-08",
  provider: "Pain clinic",
  citation: "records_md/generated/example.md",
  summary: "Conservative summary for source-library display.",
  tags: ["imported", "visit"],
});
```

Files attach through the existing attachment flow, then:

```ts
await attachFileToSource({
  source_id: sourceId,
  attachment_id: attachmentId,
  label: "Original PDF",
});
```

## Export Packet

Actions in `src/server/actions/exports.ts`:

- `generateClinicianExportPacket(input: ExportPacketRequest)`
- `createBulkDataExport(input: BulkExportRequest)`

Example clinician packet payload:

```ts
await generateClinicianExportPacket({
  date_from: "2026-05-01",
  date_to: "2026-05-31",
  diagnostic_branch_id: diagnosisId,
  flares_only: false,
  include_photos: true,
  include_procedure_summaries: true,
  clinician_questions: ["What finding would confirm this branch?"],
});
```

The response is `ExportPacket` with markdown, included attachment IDs, filters,
and a generated timestamp.

## Bulk Export

`createBulkDataExport` returns a manifest-first `BulkExport`:

- `tables`: JSON table data from the family scope.
- `uploaded_file_manifest`: attachment bucket paths and metadata.
- `generated_packets`: optional clinician packets.
- `restore_notes`: restore ordering and usage notes.
- `limitations`: current archive limitations.

Zip assembly is deferred; Phase 3 produces structured data and a file manifest.
`include_soft_deleted` is accepted only for primary/caregiver roles and is served
through the `export_family_data` database helper.

## Metrics

Action in `src/server/actions/metrics.ts`:

- `getDashboardMetrics(input: MetricsFilter)`

Metrics returned:

- flares per week
- recovery time summary
- pain by body region
- trigger frequency
- medication response summary
- vasomotor deltas over time
- upcoming appointment count
- open task count
- open decision count

Example:

```ts
await getDashboardMetrics({
  date_from: "2026-05-01T00:00:00.000Z",
  date_to: "2026-05-31T23:59:59.999Z",
});
```

## Historical Import

`npm run supabase:seed` now runs:

- `supabase/seed/001_reference.sql`
- `supabase/seed/002_demo.sql`
- `supabase/seed/003_diagnostic_tree.sql`
- `supabase/seed/004_historical_import.sql`

The historical import scaffold creates conservative source/event/evidence rows
for workspace report paths such as `reports_md/FINAL_TREATMENT_PLAN_2026-05-08.md`
and `records_md/generated/`. It does not modify source records and does not
over-parse medical details.

## Known Limitations

- Bulk export is manifest-first; zip archive assembly is deferred.
- Export packets are markdown-only; PDF generation remains a frontend or later
  backend task.
- Historical import is intentionally conservative. It creates source and anchor
  event rows, not a full clinical NLP import.

## Frontend Tickets Unblocked

- FE medication inventory and response tracking.
- FE procedure impact view.
- FE source library.
- FE export packet builder.
- FE bulk export UI.
- FE dashboard/charts.
- FE historical import review.
