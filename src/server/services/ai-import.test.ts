import { describe, expect, it } from "vitest";
import {
  aiImportExtractionResultSchema,
  aiImportSessionWithDraftsSchema,
} from "@/server/contracts";
import {
  normalizeAiImportDraftRow,
  normalizeAiImportSessionRow,
  validateAiImportDraftPayload,
} from "@/server/services/ai-import";

const timestamp = "2026-05-10T12:00:00.000Z";

describe("AI import backend helpers", () => {
  it("validates extracted procedure drafts against existing contracts", () => {
    const valid = validateAiImportDraftPayload("procedure_event", {
      type: "procedure_test",
      occurred_at: timestamp,
      title: "Scar injection flare follow-up",
      summary: "Reported worsening after scar injection.",
      answered_question: "partially",
    });

    expect(valid.ok).toBe(true);

    const invalid = validateAiImportDraftPayload("procedure_event", {
      type: "procedure_test",
      title: "Missing date",
    });

    expect(invalid.ok).toBe(false);
    expect(invalid.validation_errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "occurred_at",
        }),
      ]),
    );
  });

  it("normalizes AI import rows with nullable database fields", () => {
    const session = normalizeAiImportSessionRow({
      id: "10000000-0000-4000-8000-000000000201",
      family_id: "10000000-0000-4000-8000-000000000202",
      user_id: "10000000-0000-4000-8000-000000000203",
      raw_text: "Pain went to 9/10 after the procedure.",
      requested_target_types: ["entry"],
      status: "ready_for_review",
      prompt_version: "ai-import-v1",
      created_at: timestamp,
      updated_at: timestamp,
    });
    const draft = normalizeAiImportDraftRow({
      id: "10000000-0000-4000-8000-000000000204",
      family_id: session.family_id,
      user_id: session.user_id,
      session_id: session.id,
      target_type: "entry",
      status: "proposed",
      proposed_payload: {
        type: "procedure_related",
        occurred_at: timestamp,
        title: "Procedure flare",
      },
      confidence: "medium",
      created_at: timestamp,
      updated_at: timestamp,
    });

    expect(
      aiImportSessionWithDraftsSchema.parse({ session, drafts: [draft] }),
    ).toMatchObject({
      session: {
        source_id: null,
        model: null,
      },
      drafts: [
        {
          title: null,
          validation_errors: [],
          committed_entity_id: null,
        },
      ],
    });
  });

  it("parses structured extraction output with evidence spans", () => {
    expect(
      aiImportExtractionResultSchema.parse({
        drafts: [
          {
            target_type: "entry",
            confidence: "high",
            proposed_payload: {
              type: "flare",
              occurred_at: timestamp,
              title: "Severe bilateral knee flare",
              pain_peak: 9,
              is_flare: true,
            },
            missing_fields: [],
            evidence_spans: [
              {
                field: "pain_peak",
                quote: "pain peaked at 9/10",
              },
            ],
            warnings: [],
          },
        ],
      }),
    ).toMatchObject({
      drafts: [
        {
          target_type: "entry",
          confidence: "high",
        },
      ],
    });
  });
});
