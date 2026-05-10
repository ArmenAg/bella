import { describe, expect, it } from "vitest";
import {
  buildTimelinePage,
  type TimelineSourceRows,
} from "@/server/services/timeline";

const ids = {
  family: "10000000-0000-4000-8000-000000000001",
  user: "10000000-0000-4000-8000-000000000002",
  entry: "10000000-0000-4000-8000-000000000003",
  baseline: "10000000-0000-4000-8000-000000000004",
  checkpoint: "10000000-0000-4000-8000-000000000005",
  attachment: "10000000-0000-4000-8000-000000000006",
  diagnosis: "10000000-0000-4000-8000-000000000007",
  evidence: "10000000-0000-4000-8000-000000000008",
  region: "10000000-0000-4000-8000-000000000009",
  symptom: "10000000-0000-4000-8000-000000000010",
  trigger: "10000000-0000-4000-8000-000000000011",
};

const rows: TimelineSourceRows = {
  entries: [
    {
      id: ids.entry,
      type: "flare",
      occurred_at: "2026-05-10T01:00:00.000Z",
      ended_at: null,
      title: "Active flare",
      notes: "flare summary",
      is_flare: true,
      pain_current: 7,
      pain_peak: 8,
      pain_average: null,
    },
    {
      id: ids.baseline,
      type: "baseline",
      occurred_at: "2026-05-09T23:00:00.000Z",
      ended_at: null,
      title: "Baseline",
      notes: null,
      is_flare: false,
      pain_current: 3,
      pain_peak: null,
      pain_average: null,
    },
  ],
  entry_regions: [{ entry_id: ids.entry, body_region_id: ids.region }],
  entry_symptoms: [{ entry_id: ids.entry, symptom_id: ids.symptom }],
  entry_triggers: [{ entry_id: ids.entry, trigger_id: ids.trigger }],
  flare_checkpoints: [
    {
      id: ids.checkpoint,
      entry_id: ids.entry,
      checkpoint_type: "30m",
      checkpoint_at: "2026-05-10T01:30:00.000Z",
      pain_score: 8,
      notes: "checkpoint summary",
    },
  ],
  attachments: [
    {
      id: ids.attachment,
      captured_at: "2026-05-10T01:45:00.000Z",
      created_at: "2026-05-10T01:45:00.000Z",
      file_name: "comparison.jpg",
      description: "comparison photo",
      mime_type: "image/jpeg",
      size_bytes: 120,
      file_path: "family/demo/comparison.jpg",
    },
  ],
  attachment_links: [
    {
      attachment_id: ids.attachment,
      linked_type: "entry",
      linked_id: ids.entry,
    },
  ],
  diagnoses: [
    {
      id: ids.diagnosis,
      title: "CRPS / chronic cold-phase phenotype",
      summary: "diagnosis summary",
      status: "suspected",
      confidence: "low",
      parent_diagnosis_id: null,
      last_reviewed_at: "2026-05-10T02:00:00.000Z",
      updated_at: "2026-05-10T02:00:00.000Z",
    },
  ],
  evidence_links: [
    {
      id: ids.evidence,
      diagnosis_id: ids.diagnosis,
      linked_type: "entry",
      linked_id: ids.entry,
    },
  ],
};

describe("timeline service merge helpers", () => {
  it("sorts merged timeline items newest first and paginates", () => {
    const page = buildTimelinePage(rows, { page_size: 2 });

    expect(page.items.map((item) => item.source_table)).toEqual([
      "diagnoses",
      "attachments",
    ]);
    expect(page.next_cursor).toBe("2026-05-10T01:30:00.000Z");
  });

  it("filters by entry-linked body region, symptom, and trigger", () => {
    const page = buildTimelinePage(rows, {
      body_region_id: ids.region,
      symptom_id: ids.symptom,
      trigger_id: ids.trigger,
    });

    expect(page.items.map((item) => item.source_table)).toEqual([
      "flare_checkpoints",
      "entries",
    ]);
  });

  it("filters media and diagnostic branch views", () => {
    expect(
      buildTimelinePage(rows, { media_only: true }).items.map(
        (item) => item.source_table,
      ),
    ).toEqual(["attachments", "entries"]);

    expect(
      buildTimelinePage(rows, {
        diagnostic_branch_id: ids.diagnosis,
      }).items.map((item) => item.source_table),
    ).toEqual(["diagnoses", "entries"]);
  });

  it("returns metadata when source query caps are hit", () => {
    const page = buildTimelinePage(rows, {}, ["entries", "evidence_links"]);

    expect(page.metadata).toMatchObject({
      source_row_limit: 1000,
      source_caps_hit: ["entries", "evidence_links"],
      warnings: [
        {
          code: "TIMELINE_SOURCE_CAP_HIT",
          source_tables: ["entries", "evidence_links"],
        },
      ],
    });
  });
});
