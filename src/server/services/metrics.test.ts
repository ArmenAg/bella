import { describe, expect, it } from "vitest";
import { buildDashboardMetrics } from "@/server/services/metrics";

const entryA = "10000000-0000-4000-8000-000000000041";
const entryB = "10000000-0000-4000-8000-000000000042";
const region = "10000000-0000-4000-8000-000000000043";
const trigger = "10000000-0000-4000-8000-000000000044";
const medication = "10000000-0000-4000-8000-000000000045";

describe("metrics service aggregations", () => {
  it("builds dashboard aggregates from demo-style rows", () => {
    const metrics = buildDashboardMetrics(
      {
        entries: [
          {
            id: entryA,
            type: "flare",
            occurred_at: "2026-05-04T02:00:00.000Z",
            is_flare: true,
            recovery_minutes: 315,
            pain_peak: 9,
            pain_current: 2,
          },
          {
            id: entryB,
            type: "baseline",
            occurred_at: "2026-05-05T02:00:00.000Z",
            is_flare: false,
            pain_peak: 4,
            pain_current: 3,
          },
        ],
        entry_regions: [
          { entry_id: entryA, body_region_id: region },
          { entry_id: entryB, body_region_id: region },
        ],
        entry_triggers: [{ entry_id: entryA, trigger_id: trigger }],
        medication_responses: [
          {
            medication_id: medication,
            taken_at: "2026-05-04T03:00:00.000Z",
            pain_before: 8,
            pain_after_120m: 4,
            helped: "helped",
          },
        ],
        vasomotor_measurements: [
          {
            measured_at: "2026-05-04T03:05:00.000Z",
            site: "knees",
            delta_c: "2.70",
            context: "active_flare",
          },
        ],
        appointments: [
          {
            date_time: "2026-05-21T17:00:00.000Z",
            status: "scheduled",
            deleted_at: null,
          },
        ],
        tasks: [{ status: "open" }],
        decisions: [{ status: "waiting_on_clinician" }],
      },
      {},
      "2026-05-10T00:00:00.000Z",
    );

    expect(metrics).toMatchObject({
      recovery: {
        flare_count: 1,
        average_recovery_minutes: 315,
      },
      upcoming_appointments_count: 1,
      open_tasks_count: 1,
      open_decisions_count: 1,
    });
    expect(metrics.flares_per_week).toEqual([
      { week_start: "2026-05-04", flare_count: 1 },
    ]);
    expect(metrics.pain_by_body_region[0]).toMatchObject({
      body_region_id: region,
      average_pain_peak: 6.5,
    });
    expect(metrics.medication_response_summary[0]).toMatchObject({
      medication_id: medication,
      helped_count: 1,
      average_pain_delta_120m: -4,
    });
  });
});
