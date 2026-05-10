import { describe, expect, it } from "vitest";
import {
  buildClinicianPacketMarkdown,
  buildCsvTables,
} from "@/server/services/exports";

describe("export packet service helpers", () => {
  it("builds clinician-readable markdown sections", () => {
    const markdown = buildClinicianPacketMarkdown({
      generatedAt: "2026-05-10T00:00:00.000Z",
      filters: {
        flares_only: false,
        include_photos: true,
        include_procedure_summaries: true,
        include_soft_deleted: false,
        clinician_questions: ["What would confirm the working branch?"],
      },
      timelineItems: [
        {
          id: "entries:10000000-0000-4000-8000-000000000051",
          source_table: "entries",
          source_id: "10000000-0000-4000-8000-000000000051",
          item_type: "flare",
          occurred_at: "2026-05-04T02:00:00.000Z",
          ended_at: null,
          title: "Demo flare",
          summary: "summary",
          body_region_ids: [],
          symptom_ids: [],
          trigger_ids: [],
          diagnosis_ids: [],
          attachment_ids: [],
          evidence_count: 0,
          metadata: { recovery_minutes: 315 },
        },
      ],
      diagnoses: [
        {
          title: "CRPS / chronic cold-phase phenotype",
          status: "suspected",
          confidence: "low",
          summary: "Tracks objective signs.",
          tests_needed: "Clinician-observed criteria.",
          evidence_for: null,
          evidence_against: null,
        },
      ],
      medications: [
        { name: "Demo medication", dose: "demo dose", status: "active" },
      ],
      decisions: [
        {
          title: "Next diagnostic step",
          status: "open",
          question: "What should be prioritized?",
        },
      ],
      appointments: [
        {
          date_time: "2026-05-21T17:00:00.000Z",
          purpose: "Review packet",
          provider: "Demo clinician",
        },
      ],
      tasks: [{ title: "Upload photos", due_at: null, priority: "high" }],
      vasomotor: [
        {
          measured_at: "2026-05-04T03:05:00.000Z",
          site: "knees",
          delta_c: 2.7,
          left_attachment_id: null,
          right_attachment_id: null,
        },
      ],
      procedures: [
        {
          title: "Demo procedure",
          occurred_at: "2026-05-06T17:00:00.000Z",
          diagnostic_question: "Did it clarify the generator?",
          baseline_before: null,
          immediate_effect: "flare",
          effect_24h: "partial improvement",
          effect_72h: "unclear",
          effect_1w: "baseline",
          effect_1m: "no durable change",
          answered_question: "partially",
          repeat_recommendation: "review first",
        },
      ],
      clinicianQuestions: ["What would confirm the working branch?"],
    });

    expect(markdown).toContain("# Bella Care Tracker Clinician Packet");
    expect(markdown).toContain("## Working Diagnosis");
    expect(markdown).toContain("## Procedure Impact Summaries");
    expect(markdown).toContain("What would confirm the working branch?");
  });

  it("builds CSV table output for bulk export requests", () => {
    expect(
      buildCsvTables({
        sources: [
          {
            id: "source-1",
            title: "Report, with comma",
            tags: ["imported", "workspace"],
          },
        ],
      }).sources,
    ).toBe(
      'id,title,tags\nsource-1,"Report, with comma","[""imported"",""workspace""]"',
    );
  });
});
