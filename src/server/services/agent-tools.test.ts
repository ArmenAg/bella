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

  it("does not expose any direct domain-record write tools to the model", () => {
    const forbidden = [
      // Direct entity creates — only draft-only writes allowed.
      "createEntry",
      "create_entry",
      "createProcedureEvent",
      "create_procedure_event",
      "createMedication",
      "create_medication",
      "createDecision",
      "create_decision",
      "createSource",
      "create_source",
      "createDiagnosis",
      "create_diagnosis",
      "createVasomotorMeasurement",
      "create_vasomotor_measurement",
      "createAppointment",
      "create_appointment",
      "createTask",
      "create_task",
      // Updates and destructive actions.
      "updateEntry",
      "softDeleteEntry",
      "soft_delete_record",
      // Storage / signed URL surface.
      "createUploadUrl",
      "createAttachment",
      "getSignedAttachmentUrl",
      // Bulk export and packet generation are human-triggered only.
      "generateClinicianExportPacket",
      "createBulkDataExport",
    ];
    const exposed = new Set<string>(agentToolNames());
    for (const name of forbidden) {
      expect(exposed.has(name)).toBe(false);
      expect(agentToolNameSchema.safeParse(name).success).toBe(false);
    }
  });
});
