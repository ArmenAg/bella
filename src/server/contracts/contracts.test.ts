import { describe, expect, it } from "vitest";
import {
  MAX_PAGE_SIZE,
  avoidContraindicationSchema,
  careTeamMemberSchema,
  caseSummaryVersionSchema,
  createEntryInputSchema,
  createUploadUrlInputSchema,
  emergencyPacketRequestSchema,
  evidenceLinkFilterSchema,
  exportPacketRequestSchema,
  flareCheckpointInputSchema,
  paginationInputSchema,
  recentFlareSummarySchema,
  softDeleteReasonSchema,
  sourceLinksSchema,
  sourceTypeSchema,
} from "@/server/contracts";

describe("shared backend contracts", () => {
  it("defaults pagination to 50 and caps it at 200", () => {
    expect(paginationInputSchema.parse({})).toEqual({ page_size: 50 });
    expect(
      paginationInputSchema.parse({ page_size: MAX_PAGE_SIZE }).page_size,
    ).toBe(200);
    expect(() => paginationInputSchema.parse({ page_size: 201 })).toThrow();
  });

  it("rejects flare entries that do not set is_flare", () => {
    expect(() =>
      createEntryInputSchema.parse({
        type: "flare",
        occurred_at: "2026-05-10T00:00:00.000Z",
        title: "Bad flare",
        is_flare: false,
      }),
    ).toThrow(/flare entries must set is_flare/);
  });

  it("allows frontend-safe entry form payloads", () => {
    const parsed = createEntryInputSchema.parse({
      type: "baseline",
      occurred_at: "2026-05-10T00:00:00.000Z",
      title: "Baseline",
      pain_current: 3,
    });

    expect(parsed.body_region_ids).toEqual([]);
    expect(parsed.symptoms).toEqual([]);
    expect(parsed.triggers).toEqual([]);
  });

  it("enforces private upload size and mime constraints", () => {
    expect(
      createUploadUrlInputSchema.parse({
        file_name: "photo.jpg",
        mime_type: "image/jpeg",
        size_bytes: 1024,
      }),
    ).toMatchObject({ mime_type: "image/jpeg" });

    expect(() =>
      createUploadUrlInputSchema.parse({
        file_name: "photo.svg",
        mime_type: "image/svg+xml",
        size_bytes: 1024,
      }),
    ).toThrow();
  });

  it("defaults export packet privacy flags conservatively", () => {
    expect(exportPacketRequestSchema.parse({})).toMatchObject({
      packet_kind: "clinician_visit",
      flares_only: false,
      include_photos: false,
      include_procedure_summaries: true,
      include_soft_deleted: false,
      clinician_questions: [],
    });
  });

  it("validates safety and care coordination contracts", () => {
    const familyId = "10000000-0000-4000-8000-000000000201";
    const userId = "10000000-0000-4000-8000-000000000202";
    const timestamp = "2026-05-10T00:00:00.000Z";

    expect(emergencyPacketRequestSchema.parse({})).toEqual({});

    expect(
      careTeamMemberSchema.parse({
        id: "10000000-0000-4000-8000-000000000203",
        family_id: familyId,
        user_id: userId,
        subject_user_id: userId,
        entered_by_user_id: userId,
        name: "Demo clinician",
        organization: null,
        specialty: "Pain medicine",
        role: null,
        portal_url: null,
        contact_notes: null,
        manages: "Pain plan",
        manages_tags: [],
        last_visit_at: null,
        next_visit_at: null,
        active: true,
        last_reviewed_at: timestamp,
        notes: null,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      }).subject_user_id,
    ).toBe(userId);

    expect(
      avoidContraindicationSchema.parse({
        id: "10000000-0000-4000-8000-000000000204",
        family_id: familyId,
        user_id: userId,
        subject_user_id: userId,
        entered_by_user_id: userId,
        category: "physical_do_not",
        severity: "critical",
        title: "No BP cuff on left arm",
        reaction_description: "Pressure can trigger a flare.",
        evidence_source: "Family observation",
        source_id: null,
        active: true,
        last_reviewed_at: timestamp,
        notes: null,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      }).category,
    ).toBe("physical_do_not");

    expect(
      caseSummaryVersionSchema.parse({
        id: "10000000-0000-4000-8000-000000000205",
        family_id: familyId,
        user_id: userId,
        subject_user_id: userId,
        entered_by_user_id: userId,
        summary_text: "Calibrated family-reviewed narrative.",
        calibration_note: null,
        status: "active",
        authored_by_text: "Family",
        reviewed_by_text: null,
        reviewed_at: timestamp,
        source_note: null,
        created_at: timestamp,
        updated_at: timestamp,
        deleted_at: null,
      }).status,
    ).toBe("active");
  });

  it("validates release follow-up contract additions", () => {
    const diagnosisId = "10000000-0000-4000-8000-000000000101";
    const sourceId = "10000000-0000-4000-8000-000000000102";
    const eventId = "10000000-0000-4000-8000-000000000103";
    const decisionId = "10000000-0000-4000-8000-000000000104";
    const evidenceId = "10000000-0000-4000-8000-000000000105";
    const familyId = "10000000-0000-4000-8000-000000000106";
    const userId = "10000000-0000-4000-8000-000000000107";
    const timestamp = "2026-05-10T00:00:00.000Z";

    expect(sourceTypeSchema.parse("visit_note")).toBe("visit_note");
    expect(softDeleteReasonSchema.parse("duplicate record")).toBe(
      "duplicate record",
    );
    expect(() => softDeleteReasonSchema.parse(" ")).toThrow();
    expect(
      evidenceLinkFilterSchema.parse({ diagnosis_id: diagnosisId }),
    ).toMatchObject({ diagnosis_id: diagnosisId, page_size: 50 });

    expect(
      sourceLinksSchema.parse({
        source_id: sourceId,
        events: [
          {
            id: eventId,
            family_id: familyId,
            user_id: userId,
            type: "procedure",
            occurred_at: timestamp,
            ended_at: null,
            title: "Linked procedure",
            summary: null,
            provider: null,
            location: null,
            source_id: sourceId,
            diagnostic_question: null,
            baseline_before: null,
            immediate_effect: null,
            effect_24h: null,
            effect_72h: null,
            effect_1w: null,
            effect_1m: null,
            new_symptoms: null,
            answered_question: null,
            repeat_recommendation: null,
            created_at: timestamp,
            updated_at: timestamp,
            deleted_at: null,
          },
        ],
        diagnoses: [
          {
            id: evidenceId,
            family_id: familyId,
            diagnosis_id: diagnosisId,
            linked_type: "source",
            linked_id: sourceId,
            direction: "supports",
            note: null,
            created_at: timestamp,
            updated_at: timestamp,
            deleted_at: null,
          },
        ],
        decisions: [
          {
            id: "10000000-0000-4000-8000-000000000108",
            family_id: familyId,
            decision_id: decisionId,
            linked_type: "source",
            linked_id: sourceId,
            note: null,
            created_at: timestamp,
            updated_at: timestamp,
            deleted_at: null,
          },
        ],
      }).source_id,
    ).toBe(sourceId);

    expect(
      flareCheckpointInputSchema.parse({
        entry_id: "10000000-0000-4000-8000-000000000109",
        checkpoint_type: "30m",
        checkpoint_at: timestamp,
        symptoms: [{ symptom_id: "10000000-0000-4000-8000-000000000110" }],
      }).symptoms,
    ).toEqual([{ symptom_id: "10000000-0000-4000-8000-000000000110" }]);
    expect(() =>
      flareCheckpointInputSchema.parse({
        entry_id: "10000000-0000-4000-8000-000000000109",
        checkpoint_type: "30m",
        checkpoint_at: timestamp,
        symptoms: [{ symptom_id: "not-a-uuid" }],
      }),
    ).toThrow();

    expect(
      recentFlareSummarySchema.parse({
        entry_id: "10000000-0000-4000-8000-000000000111",
        title: "Ended flare",
        started_at: timestamp,
        ended_at: "2026-05-10T02:00:00.000Z",
        duration_minutes: 120,
        recovery_minutes: 120,
        peak_pain: 8,
        checkpoints_count: 3,
        trigger_ids: [],
        body_region_ids: [],
        notes_summary: "Recovered after rest.",
      }).checkpoints_count,
    ).toBe(3);
  });
});
