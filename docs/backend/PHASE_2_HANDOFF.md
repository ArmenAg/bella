# Backend Phase 2 Handoff

Claude-owned frontend code should import DTO/input types from
`src/server/contracts` and call server actions from `src/server/actions/*`.
Frontend code should not call Supabase tables directly.

## Flare Sessions

Actions in `src/server/actions/flares.ts`:

- `startFlare(input: StartFlareInput)`
- `addFlareCheckpoint(input: FlareCheckpointInput)`
- `updateFlare(input: UpdateFlareInput)`
- `endFlare(input: EndFlareInput)`
- `getActiveFlare()`

Example start payload:

```ts
await startFlare({
  occurred_at: new Date().toISOString(),
  title: "Pressure-triggered flare",
  pain_current: 7,
  pain_peak: 8,
  body_region_ids: [bodyRegionId],
  symptoms: [{ symptom_id: burningPainId, severity: 7 }],
  triggers: [{ trigger_id: blanketTriggerId }],
  notes: "Started after pressure.",
});
```

Example checkpoint payload:

```ts
await addFlareCheckpoint({
  entry_id: activeFlare.entry.id,
  checkpoint_type: "30m",
  checkpoint_at: new Date().toISOString(),
  pain_score: 8,
  symptoms: [{ slug: "temperature_asymmetry", severity: 6 }],
});
```

## Vasomotor Measurements

Actions in `src/server/actions/vasomotor.ts`:

- `createVasomotorMeasurement(input: CreateVasomotorMeasurementInput)`
- `updateVasomotorMeasurement(input: UpdateVasomotorMeasurementInput)`
- `softDeleteVasomotorMeasurement(id: string, reason: string)`
- `listVasomotorMeasurements(input: VasomotorFilter)`

Example payload:

```ts
await createVasomotorMeasurement({
  entry_id: activeFlare.entry.id,
  measured_at: new Date().toISOString(),
  site: "knees",
  left_temp_c: 30.4,
  right_temp_c: 33.1,
  left_color: "pale",
  right_color: "pink",
  context: "active_flare",
  left_attachment_id: leftPhotoId,
  right_attachment_id: rightPhotoId,
});
```

The service returns `delta_c` as right-minus-left, rounded to two decimals, and
links left/right attachments back to the measurement.

## Timeline

Action in `src/server/actions/timeline.ts`:

- `listTimelineItems(input: TimelineFilter)`

Example payload:

```ts
await listTimelineItems({
  date_from: "2026-05-01T00:00:00.000Z",
  date_to: "2026-05-31T23:59:59.999Z",
  page_size: 50,
  flare_only: true,
});
```

The response is normalized `TimelineItem[]` with `source_table`, `source_id`,
`item_type`, linked body/symptom/trigger IDs where available, attachment IDs,
evidence counts, and preview metadata.

Each source-table query is capped at 1000 rows as a safety guard for staging.
The response includes `metadata.source_row_limit`,
`metadata.source_caps_hit`, and `metadata.warnings`; if any source table hits
the cap, the frontend can display or log that the timeline may be incomplete.

## Diagnostic Tree And Evidence

Actions in `src/server/actions/diagnoses.ts`:

- `createDiagnosis(input: CreateDiagnosisInput)`
- `updateDiagnosis(input: UpdateDiagnosisInput)`
- `softDeleteDiagnosis(id: string, reason: string)`
- `listDiagnoses(input: DiagnosisFilter)`
- `createEvidenceLink(input: CreateEvidenceLinkInput)`
- `listEvidenceLinks(input: EvidenceLinkFilter)`
- `updateEvidenceLink(input: UpdateEvidenceLinkInput)`
- `removeEvidenceLink(id: string)`
- `mergeDiagnosisNodes(input: MergeDiagnosisNodesInput)`
- `splitDiagnosisNode(input: SplitDiagnosisNodeInput)`

Example evidence payload:

```ts
await createEvidenceLink({
  diagnosis_id: crpsBranchId,
  linked_type: "vasomotor_measurement",
  linked_id: measurementId,
  direction: "supports",
  note: "Temperature delta captured during flare.",
});
```

Merge and split actions write explicit diagnostic audit records through the
database helper `record_diagnostic_action`.

## Decisions

Actions in `src/server/actions/decisions.ts`:

- `createDecision(input: CreateDecisionInput)`
- `updateDecision(input: UpdateDecisionInput)`
- `softDeleteDecision(id: string, reason: string)`
- `listDecisions(input: DecisionFilter)`
- `linkDecisionEvidence(input: LinkDecisionEvidenceInput)`

Example payload:

```ts
await createDecision({
  title: "Next diagnostic step",
  status: "open",
  question: "Should we prioritize flare documentation or localization testing?",
  options: [{ label: "Prepare flare packet" }],
  what_would_change: "Clinician-observed flare signs or decisive test result.",
  target_date: "2026-05-21",
});
```

`listDecisions({ open_only: true })` returns open, waiting, and revisiting
decisions.

## Schedule

Actions in `src/server/actions/schedule.ts`:

- `createAppointment(input: CreateAppointmentInput)`
- `updateAppointment(input: UpdateAppointmentInput)`
- `softDeleteAppointment(id: string, reason: string)`
- `listAppointments(input: AppointmentFilter)`
- `createTask(input: CreateTaskInput)`
- `updateTask(input: UpdateTaskInput)`
- `softDeleteTask(id: string, reason: string)`
- `listTasks(input: TaskFilter)`

Example task payload:

```ts
await createTask({
  title: "Attach comparison photos to visit packet",
  priority: "high",
  due_at: "2026-05-19T16:00:00.000Z",
  appointment_id: appointmentId,
  decision_id: decisionId,
  source_id: sourceId,
});
```

`listAppointments({ upcoming: true })` returns future appointments.
`listTasks({ open_only: true })` returns open, in-progress, and blocked tasks.

## Seeds

`npm run supabase:seed` now runs:

- `supabase/seed/001_reference.sql`
- `supabase/seed/002_demo.sql`
- `supabase/seed/003_diagnostic_tree.sql`

The diagnostic-tree seed is idempotent and intentionally imports only
planning-level branch names, summaries, and open questions already present in
the project docs.
