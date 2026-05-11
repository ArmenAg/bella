# Apple Health Export Import

The Apple Health importer handles manual `export.zip` files from the iPhone
Health app. It is designed for repeat imports: the same export can be uploaded
again without duplicating samples.

## User Flow

1. On iPhone, open Health.
2. Tap the profile picture or initials.
3. Tap `Export All Health Data`.
4. Upload the generated `export.zip` through the existing private attachment
   flow.
5. Call `importAppleHealthExport({ attachment_id })`.

The attachment bucket accepts Apple Health zip files up to 500 MB.

## Backend Contract

Server actions:

```text
src/server/actions/apple-health.ts
```

Contracts:

```text
src/server/contracts/apple-health.ts
```

Tables:

```text
public.apple_health_imports
public.apple_health_samples
public.apple_health_daily_summaries
```

## Data Model

`apple_health_imports` stores provenance:

- attachment id
- status
- file name
- file SHA-256
- export date range
- scanned/imported/duplicate/skipped counts
- daily summary count
- error message, if processing fails

`apple_health_samples` stores normalized samples with deterministic
`external_key` values. The key is derived from the Apple type, source, dates,
unit, value, and normalized metric. This makes repeat imports idempotent.

`apple_health_daily_summaries` stores chart-ready daily aggregates. The refresh
function recomputes summaries for the imported date range from all stored
samples in that family.

Raw sample rows are RLS-protected but are not individually audit-triggered to
avoid unbounded audit-log growth on large exports. Import rows and daily
summary rows are audited.

## Supported Metrics

Quantity records:

- steps
- walking/running distance
- flights climbed
- active energy
- exercise minutes
- heart rate
- resting heart rate
- HRV SDNN
- walking heart rate average
- walking step length
- walking speed
- walking asymmetry
- walking double-support percentage
- stair ascent/descent speed
- six-minute walk distance
- Apple walking steadiness

Category records:

- sleep asleep minutes
- sleep in-bed minutes

Workout records:

- workout minutes
- workout distance
- workout energy

Unsupported Apple record types are skipped and counted.

## Safety And Privacy

- The importer reads only files uploaded by the current family.
- RLS is enabled on all Apple Health tables.
- The data is included in bulk family export.
- Soft delete is supported through the shared soft-delete helper.
- The importer does not infer pain events or diagnoses from Apple Health data.
  It only stores objective Health samples and daily summaries.

## Frontend Handoff

Build an Apple Health import page or settings panel with:

- Upload control restricted to `.zip`.
- Import button calling `importAppleHealthExport`.
- Import history from `listAppleHealthImports`.
- Summary charts from `listAppleHealthDailySummaries`.
- Optional raw sample table from `listAppleHealthSamples`.
- Clear copy that repeat uploads are safe and deduped.
