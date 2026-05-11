# Test fixtures

Small, deterministic, **fully synthetic** files used by Vitest and Playwright
tests. **No real medical data, no real Bella records, no real PHI may ever
land in this directory.** Treat that as a non-negotiable contract.

## Contents

- `apple-health/export.xml` — minimal HealthData XML with three Record samples
  and one Workout. Built around `2026-05-09` Pacific to exercise local-day
  grouping cases (a sleep record that crosses midnight in PT).
- `apple-health/export.zip` — the same XML packaged as an Apple Health export.
  The Apple Health importer reads any zip whose archive contains a path ending
  in `export.xml`.
- `apple-health/build/build-export-zip.mjs` — script that rebuilds
  `export.zip` from `export.xml`. Run it after editing the XML. The zip is
  committed (and reproducible) so tests don't need a network or shell.
- `import/unstructured-note.txt` — short synthetic clinical-style note used to
  drive the AI import / agent draft flow when an OpenAI mock is wired up.

## Rules

1. No real names, MRNs, addresses, phone numbers, providers, or diagnoses.
   Where placeholder names appear, use obviously synthetic strings (`Test`,
   `Smith Family`, `2026-05-09`).
2. Keep files small. The Apple Health export is ≤ 5 KB. The unstructured
   note is one paragraph.
3. Fixtures must be deterministic — same bytes every commit. The build
   script for `export.zip` writes a fixed mtime so the binary doesn't churn.
4. If you need a _bigger_ fixture (e.g. to test pagination), generate it at
   test runtime and don't commit it.

If a test demands behavior that only real data can simulate, mark the test
`it.skip(...)` and document the gap in `docs/qa/TESTING_STRATEGY.md`.
