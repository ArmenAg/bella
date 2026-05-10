import { describe, expect, it } from "vitest";
import {
  computeDeltaC,
  normalizeVasomotorRow,
} from "@/server/services/vasomotor";

const baseRow = {
  id: "11111111-1111-4111-8111-111111111111",
  family_id: "22222222-2222-4222-8222-222222222222",
  user_id: "33333333-3333-4333-8333-333333333333",
  entry_id: null,
  measured_at: "2026-05-10T00:00:00.000Z",
  site: "knees",
  left_color: null,
  right_color: null,
  lighting_notes: null,
  context: "active_flare",
  notes: null,
  left_attachment_id: null,
  right_attachment_id: null,
  created_at: "2026-05-10T00:00:00.000Z",
  updated_at: "2026-05-10T00:00:00.000Z",
  deleted_at: null,
};

describe("vasomotor service helpers", () => {
  it("computes right-minus-left temperature delta consistently", () => {
    expect(computeDeltaC(30.41, 33.08)).toBe(2.67);
    expect(computeDeltaC(undefined, 33.08)).toBeNull();
    expect(computeDeltaC(30.41, null)).toBeNull();
  });

  it("normalizes numeric database strings and fills generated delta fallback", () => {
    expect(
      normalizeVasomotorRow({
        ...baseRow,
        left_temp_c: "30.40",
        right_temp_c: "33.10",
        delta_c: null,
      }),
    ).toMatchObject({
      left_temp_c: 30.4,
      right_temp_c: 33.1,
      delta_c: 2.7,
    });
  });
});
