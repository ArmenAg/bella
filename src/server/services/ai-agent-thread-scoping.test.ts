import { describe, expect, it } from "vitest";
import {
  aiImportDraftFilterSchema,
  aiImportDraftSchema,
  aiImportSessionFilterSchema,
  aiImportSessionSchema,
} from "@/server/contracts";

/**
 * Regression for the integration-QA finding that the agent rail listed every
 * family draft instead of drafts scoped to the active thread. The fix added
 * `agent_thread_id` to the ai-import contracts and to the list filter; the
 * agent workspace now calls
 *   listAiImportDrafts({ page_size, agent_thread_id: threadId })
 * on thread load. If a future refactor drops either field, this test fails
 * before the UI regresses.
 */
describe("ai-import thread scoping", () => {
  it("exposes agent_thread_id on the draft DTO", () => {
    const sample = {
      id: "00000000-0000-0000-0000-000000000001",
      family_id: "00000000-0000-0000-0000-000000000002",
      user_id: "00000000-0000-0000-0000-000000000003",
      session_id: "00000000-0000-0000-0000-000000000004",
      agent_thread_id: "00000000-0000-0000-0000-000000000005",
      target_type: "entry",
      status: "proposed",
      title: null,
      proposed_payload: {},
      confidence: "low",
      missing_fields: [],
      evidence_spans: [],
      warnings: [],
      validation_errors: [],
      committed_entity_type: null,
      committed_entity_id: null,
      committed_at: null,
      rejected_reason: null,
      created_at: "2026-05-10T00:00:00.000Z",
      updated_at: "2026-05-10T00:00:00.000Z",
      deleted_at: null,
    };
    const parsed = aiImportDraftSchema.parse(sample);
    expect(parsed.agent_thread_id).toBe("00000000-0000-0000-0000-000000000005");
  });

  it("accepts a null agent_thread_id on the draft DTO", () => {
    const sample = {
      id: "00000000-0000-0000-0000-000000000001",
      family_id: "00000000-0000-0000-0000-000000000002",
      user_id: "00000000-0000-0000-0000-000000000003",
      session_id: "00000000-0000-0000-0000-000000000004",
      agent_thread_id: null,
      target_type: "entry",
      status: "proposed",
      title: null,
      proposed_payload: {},
      confidence: "low",
      missing_fields: [],
      evidence_spans: [],
      warnings: [],
      validation_errors: [],
      committed_entity_type: null,
      committed_entity_id: null,
      committed_at: null,
      rejected_reason: null,
      created_at: "2026-05-10T00:00:00.000Z",
      updated_at: "2026-05-10T00:00:00.000Z",
      deleted_at: null,
    };
    expect(() => aiImportDraftSchema.parse(sample)).not.toThrow();
  });

  it("exposes agent_thread_id on the draft filter so list calls can scope", () => {
    const parsed = aiImportDraftFilterSchema.parse({
      page_size: 50,
      agent_thread_id: "00000000-0000-0000-0000-000000000005",
    });
    expect(parsed.agent_thread_id).toBe("00000000-0000-0000-0000-000000000005");
  });

  it("exposes agent_thread_id on the session DTO and filter", () => {
    expect("agent_thread_id" in aiImportSessionSchema.shape).toBe(true);
    const parsedFilter = aiImportSessionFilterSchema.parse({
      agent_thread_id: "00000000-0000-0000-0000-000000000005",
    });
    expect(parsedFilter.agent_thread_id).toBe(
      "00000000-0000-0000-0000-000000000005",
    );
  });
});
