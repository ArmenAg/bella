import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import { parseAppleHealthExportXmlStream } from "./apple-health";
import type { AppleHealthMetricType } from "@/server/contracts";

const FIXTURE_PATH = join(
  process.cwd(),
  "tests/fixtures/apple-health/export.xml",
);

interface NormalizedSample {
  external_key: string;
  normalized_type: AppleHealthMetricType;
  start_at: string | null;
}

async function parseFixtureOnce(xml: string): Promise<NormalizedSample[]> {
  const stream = Readable.from(xml);
  const seen: NormalizedSample[] = [];
  await parseAppleHealthExportXmlStream(stream, async (batch) => {
    for (const sample of batch) {
      seen.push({
        external_key: sample.external_key,
        normalized_type: sample.normalized_type,
        start_at: sample.start_at,
      });
    }
  });
  return seen;
}

/**
 * Persistence-level integration test for Apple Health idempotency.
 *
 * The DB has `unique (family_id, external_key)` on `apple_health_samples`. As
 * long as the parser derives the *same* external_key for the same input on
 * every run, a repeat import is naturally deduped by the unique constraint
 * and the importer's `duplicate_sample_count` reflects that.
 *
 * This test runs the parser twice against the synthetic fixture and asserts
 * the set of external_keys is identical. If a future change introduces
 * nondeterminism (e.g. random salt, current time, floating-point churn), this
 * test fails before the importer silently double-counts samples in
 * production.
 */
describe("Apple Health idempotency (external_key stability)", () => {
  it("derives identical external_keys for the same fixture across runs", async () => {
    const xml = await readFile(FIXTURE_PATH, "utf8");

    const first = await parseFixtureOnce(xml);
    const second = await parseFixtureOnce(xml);

    expect(first.length).toBeGreaterThan(0);
    expect(second.length).toBe(first.length);

    const firstKeys = first.map((s) => s.external_key).sort();
    const secondKeys = second.map((s) => s.external_key).sort();
    expect(secondKeys).toEqual(firstKeys);

    // Every key is unique within a single run — duplicates would mean the
    // parser collapsed distinct samples.
    expect(new Set(firstKeys).size).toBe(firstKeys.length);
  });

  it("covers the four supported metric kinds in the fixture", async () => {
    const xml = await readFile(FIXTURE_PATH, "utf8");
    const samples = await parseFixtureOnce(xml);
    const types = new Set(samples.map((s) => s.normalized_type));

    // Step + heart rate + sleep + at least one workout-derived sample.
    expect(types.has("step_count")).toBe(true);
    expect(types.has("heart_rate")).toBe(true);
    expect(types.has("sleep_asleep_minutes")).toBe(true);
    // A walking workout produces workout_minutes / workout_distance /
    // workout_energy depending on attrs; assert at least one of them is
    // present.
    expect(
      types.has("workout_minutes") ||
        types.has("workout_distance") ||
        types.has("workout_energy"),
    ).toBe(true);
  });
});
