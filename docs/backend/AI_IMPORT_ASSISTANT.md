# AI Import Assistant Backend

The AI import assistant turns unstructured text into reviewable drafts. It does not auto-write medical records.

## Backend Contract

Server actions live in:

```text
src/server/actions/ai-import.ts
```

Contracts live in:

```text
src/server/contracts/ai-import.ts
```

Tables live in:

```text
public.ai_import_sessions
public.ai_import_drafts
```

## Main Flow

1. `analyzeAiImportText(input)`
   - Creates an `ai_import_sessions` row.
   - Calls OpenAI structured extraction.
   - Stores one or more `ai_import_drafts`.
   - Returns `{ session, drafts }`.

2. `updateAiImportDraft(input)`
   - Lets the frontend edit target type, payload, confidence, missing fields, evidence spans, and warnings.
   - Revalidates the proposed payload against the target domain contract.

3. `commitAiImportDraft({ id })`
   - Only works for `status: "proposed"` drafts.
   - Blocks invalid payloads.
   - Routes the payload through the existing backend services:
     - `entry` -> `createEntry`
     - `procedure_event` -> `createProcedureEvent`
     - `source` -> `createSource`
     - `medication` -> `createMedication`
     - `medication_response` -> `createMedicationResponse`
     - `appointment` -> `createAppointment`
     - `task` -> `createTask`
     - `decision` -> `createDecision`

4. `rejectAiImportDraft({ id, reason })`
   - Marks the draft rejected and preserves why.

## Environment

Required for real extraction:

```text
OPENAI_API_KEY=...
AI_IMPORT_MODEL=gpt-5.4-mini
```

If `AI_IMPORT_MODEL` is not set, the backend falls back to `OPENAI_MODEL`, then `gpt-5.4-mini`.

## Safety Rules

- Raw pasted text is preserved in `ai_import_sessions.raw_text`.
- AI output is stored as a draft only.
- Commit requires a separate server action.
- Every draft stores `evidence_spans`, `missing_fields`, `warnings`, and `validation_errors`.
- The model prompt tells the extractor not to invent dates, scores, providers, UUIDs, or diagnoses.
- If a source context is provided, procedure-event and task commits auto-link that `source_id`; decision commits create a decision evidence link to the source.

## Frontend Handoff

Build `/import` around these actions:

- `analyzeAiImportText`
- `listAiImportSessions`
- `listAiImportDrafts`
- `updateAiImportDraft`
- `commitAiImportDraft`
- `rejectAiImportDraft`

Recommended UI:

- Paste textarea with optional target-type checkboxes.
- Analyze button with loading state.
- Draft cards grouped by target type.
- Show confidence, warnings, missing fields, and validation errors.
- Show evidence quotes beside extracted fields.
- Reuse existing domain forms for draft editing where possible.
- Disable commit until `validation_errors.length === 0`.
- Never auto-commit after analysis.
