import { describe, expect, it } from "vitest";
import { agentToolNameSchema } from "@/server/contracts";
import { agentToolNames } from "./agent-tools";

describe("agent tool allowlist", () => {
  it("exposes bounded read and draft-only write tools", () => {
    expect(agentToolNames()).toEqual(
      expect.arrayContaining([
        "get_case_snapshot",
        "search_records",
        "list_entries",
        "create_draft",
        "update_draft",
        "reject_draft",
      ]),
    );
  });

  it("does not expose human-only commit flows to the model", () => {
    expect(agentToolNames()).not.toContain("commitAiImportDraft");
    expect(agentToolNames()).not.toContain("commit_ai_import_draft");
    expect(agentToolNameSchema.safeParse("commitAiImportDraft").success).toBe(
      false,
    );
  });
});
