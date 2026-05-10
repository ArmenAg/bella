import { describe, expect, it } from "vitest";
import { computeRecoveryMinutes } from "@/server/services/flares";

describe("flare service helpers", () => {
  it("computes recovery duration in whole minutes", () => {
    expect(
      computeRecoveryMinutes(
        "2026-05-10T00:00:00.000Z",
        "2026-05-10T02:15:30.000Z",
      ),
    ).toBe(135);
  });

  it("rejects an end timestamp before the flare start", () => {
    expect(() =>
      computeRecoveryMinutes(
        "2026-05-10T02:00:00.000Z",
        "2026-05-10T01:59:59.000Z",
      ),
    ).toThrow(/ended_at must be after occurred_at/);
  });
});
