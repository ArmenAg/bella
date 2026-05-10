import { describe, expect, it } from "vitest";
import {
  normalizeMedicationResponseRow,
  normalizeMedicationRow,
} from "@/server/services/medications";

const timestamps = {
  created_at: "2026-05-10T00:00:00.000Z",
  updated_at: "2026-05-10T00:00:00.000Z",
  deleted_at: null,
};

describe("medication service helpers", () => {
  it("normalizes medication inventory rows", () => {
    expect(
      normalizeMedicationRow({
        id: "10000000-0000-4000-8000-000000000001",
        family_id: "10000000-0000-4000-8000-000000000002",
        user_id: "10000000-0000-4000-8000-000000000003",
        name: "Demo medication",
        status: "active",
        ...timestamps,
      }),
    ).toMatchObject({
      name: "Demo medication",
      dose: null,
      status: "active",
    });
  });

  it("preserves 30/60/120 minute response checkpoints", () => {
    expect(
      normalizeMedicationResponseRow({
        id: "10000000-0000-4000-8000-000000000011",
        family_id: "10000000-0000-4000-8000-000000000012",
        user_id: "10000000-0000-4000-8000-000000000013",
        medication_id: "10000000-0000-4000-8000-000000000014",
        entry_id: "10000000-0000-4000-8000-000000000015",
        taken_at: "2026-05-10T02:00:00.000Z",
        pain_before: 8,
        pain_after_30m: 7,
        pain_after_60m: 5,
        pain_after_120m: 4,
        helped: "helped",
        ...timestamps,
      }),
    ).toMatchObject({
      pain_before: 8,
      pain_after_30m: 7,
      pain_after_60m: 5,
      pain_after_120m: 4,
      helped: "helped",
    });
  });
});
