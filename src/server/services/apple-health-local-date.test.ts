import { describe, expect, it } from "vitest";
import { appleLocalDate, normalizeAppleHealthRecord } from "./apple-health";

/**
 * Apple Health daily summaries should group samples by the *Apple local day*
 * recorded in the source XML, not by UTC day. A sleep record that starts at
 * 23:00 Pacific belongs to that day, not the UTC day (06:00 the next day).
 *
 * This is the prerequisite for the SQL summary function to group by local
 * day; the parser exposes the local date for downstream consumers. See
 * `docs/qa/MVP_INTEGRATION_QA.md` follow-up notes.
 */
describe("appleLocalDate", () => {
  it("returns the local day in -0700 (Pacific) for a 23:00 start", () => {
    expect(appleLocalDate("2026-05-09 23:00:00 -0700")).toBe("2026-05-09");
  });

  it("returns the local day for an early-morning -0700 timestamp", () => {
    expect(appleLocalDate("2026-05-10 06:30:00 -0700")).toBe("2026-05-10");
  });

  it("returns the local day in +0530 (India) where it differs from UTC", () => {
    // 2026-05-09 23:30 +0530 → 2026-05-09 18:00 UTC. Local day is the 9th.
    expect(appleLocalDate("2026-05-09 23:30:00 +0530")).toBe("2026-05-09");
  });

  it("handles UTC (no offset surprises)", () => {
    expect(appleLocalDate("2026-05-09 12:00:00 +0000")).toBe("2026-05-09");
  });

  it("returns null for unparseable input", () => {
    expect(appleLocalDate("not a date")).toBeNull();
    expect(appleLocalDate(undefined)).toBeNull();
    expect(appleLocalDate("")).toBeNull();
  });
});

/**
 * Round-trip: the parser writes `metadata.local_date` so a future migration
 * of the daily-summary SQL function can group by it without a re-import.
 */
describe("normalizeAppleHealthRecord local_date metadata", () => {
  it("tags a 23:00 Pacific sleep sample with the local Apple day (May 9)", () => {
    const sample = normalizeAppleHealthRecord({
      type: "HKCategoryTypeIdentifierSleepAnalysis",
      sourceName: "Test Watch",
      value: "HKCategoryValueSleepAnalysisAsleepUnspecified",
      startDate: "2026-05-09 23:00:00 -0700",
      endDate: "2026-05-10 06:30:00 -0700",
      creationDate: "2026-05-10 06:30:30 -0700",
    });
    expect(sample?.metadata).toMatchObject({
      local_date: "2026-05-09",
    });
    // start_at remains UTC (canonical timeline storage).
    expect(sample?.start_at).toBe("2026-05-10T06:00:00.000Z");
  });

  it("tags a UTC sample correctly", () => {
    const sample = normalizeAppleHealthRecord({
      type: "HKQuantityTypeIdentifierStepCount",
      sourceName: "Test iPhone",
      unit: "count",
      value: "500",
      startDate: "2026-05-09 12:00:00 +0000",
      endDate: "2026-05-09 12:10:00 +0000",
      creationDate: "2026-05-09 12:10:01 +0000",
    });
    expect(sample?.metadata).toMatchObject({ local_date: "2026-05-09" });
  });
});
