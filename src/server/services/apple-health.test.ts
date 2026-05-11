import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import {
  normalizeAppleHealthRecord,
  normalizeAppleHealthWorkout,
  parseAppleHealthExportXmlStream,
} from "./apple-health";

describe("Apple Health import helpers", () => {
  it("normalizes selected quantity records with canonical units", () => {
    const sample = normalizeAppleHealthRecord({
      type: "HKQuantityTypeIdentifierDistanceWalkingRunning",
      sourceName: "Bella's iPhone",
      unit: "mi",
      value: "1.5",
      startDate: "2026-05-09 08:00:00 -0700",
      endDate: "2026-05-09 09:00:00 -0700",
      creationDate: "2026-05-09 09:01:00 -0700",
    });

    expect(sample).toMatchObject({
      normalized_type: "distance_walking_running",
      sample_kind: "quantity",
      unit: "m",
      start_at: "2026-05-09T15:00:00.000Z",
      duration_seconds: 3600,
    });
    expect(sample?.value_numeric).toBeCloseTo(2414.016);
    expect(sample?.metadata).toMatchObject({
      original_unit: "mi",
      original_value: 1.5,
    });
  });

  it("normalizes sleep categories into duration metrics", () => {
    const asleep = normalizeAppleHealthRecord({
      type: "HKCategoryTypeIdentifierSleepAnalysis",
      value: "HKCategoryValueSleepAnalysisAsleepCore",
      startDate: "2026-05-09 23:00:00 -0700",
      endDate: "2026-05-10 06:00:00 -0700",
    });
    const awake = normalizeAppleHealthRecord({
      type: "HKCategoryTypeIdentifierSleepAnalysis",
      value: "HKCategoryValueSleepAnalysisAwake",
      startDate: "2026-05-10 02:00:00 -0700",
      endDate: "2026-05-10 02:10:00 -0700",
    });

    expect(asleep).toMatchObject({
      normalized_type: "sleep_asleep_minutes",
      unit: "min",
      duration_seconds: 25200,
    });
    expect(awake).toBeNull();
  });

  it("normalizes workout duration, distance, and energy", () => {
    const samples = normalizeAppleHealthWorkout({
      workoutActivityType: "HKWorkoutActivityTypeWalking",
      duration: "30",
      durationUnit: "min",
      totalDistance: "2",
      totalDistanceUnit: "km",
      totalEnergyBurned: "100",
      totalEnergyBurnedUnit: "kcal",
      startDate: "2026-05-09 10:00:00 -0700",
      endDate: "2026-05-09 10:30:00 -0700",
    });

    expect(samples.map((sample) => sample.normalized_type)).toEqual([
      "workout_minutes",
      "workout_distance",
      "workout_energy",
    ]);
    expect(samples[1]).toMatchObject({ value_numeric: 2000, unit: "m" });
  });

  it("stream-parses Apple export XML into supported samples", async () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
      <HealthData locale="en_US">
        <Record type="HKQuantityTypeIdentifierStepCount" sourceName="Watch" unit="count" value="120" startDate="2026-05-09 08:00:00 -0700" endDate="2026-05-09 08:10:00 -0700">
          <MetadataEntry key="HKWasUserEntered" value="0"/>
        </Record>
        <Record type="HKQuantityTypeIdentifierBodyMass" sourceName="Scale" unit="lb" value="100" startDate="2026-05-09 08:00:00 -0700" endDate="2026-05-09 08:00:00 -0700"/>
        <Workout workoutActivityType="HKWorkoutActivityTypeWalking" duration="10" durationUnit="min" startDate="2026-05-10 08:00:00 -0700" endDate="2026-05-10 08:10:00 -0700"/>
      </HealthData>`;
    const samples: unknown[] = [];

    const result = await parseAppleHealthExportXmlStream(
      Readable.from([xml]),
      async (batch) => {
        samples.push(...batch);
      },
    );

    expect(result).toMatchObject({
      scannedRecordCount: 3,
      skippedRecordCount: 1,
      sampleCount: 2,
      minDate: "2026-05-09T15:00:00.000Z",
      maxDate: "2026-05-10T15:00:00.000Z",
    });
    expect(samples).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ normalized_type: "step_count" }),
        expect.objectContaining({ normalized_type: "workout_minutes" }),
      ]),
    );
  });
});
