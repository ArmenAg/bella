import { describe, expect, it } from "vitest";
import {
  appointmentFilterSchema,
  decisionEvidenceLinkSchema,
  decisionFilterSchema,
  taskFilterSchema,
} from "@/server/contracts";

describe("phase two backend contracts", () => {
  it("supports open/upcoming query filters for decisions and schedule", () => {
    expect(decisionFilterSchema.parse({ open_only: true })).toMatchObject({
      open_only: true,
      page_size: 50,
    });
    expect(appointmentFilterSchema.parse({ upcoming: true })).toMatchObject({
      upcoming: true,
      page_size: 50,
    });
    expect(taskFilterSchema.parse({ open_only: true })).toMatchObject({
      open_only: true,
      page_size: 50,
    });
  });

  it("defines decision-level evidence link results", () => {
    expect(
      decisionEvidenceLinkSchema.parse({
        id: "10000000-0000-4000-8000-000000000001",
        family_id: "10000000-0000-4000-8000-000000000002",
        decision_id: "10000000-0000-4000-8000-000000000003",
        linked_type: "vasomotor_measurement",
        linked_id: "10000000-0000-4000-8000-000000000004",
        note: null,
        created_at: "2026-05-10T00:00:00.000Z",
        updated_at: "2026-05-10T00:00:00.000Z",
        deleted_at: null,
      }),
    ).toMatchObject({
      linked_type: "vasomotor_measurement",
    });
  });
});
