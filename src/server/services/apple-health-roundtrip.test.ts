import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { Readable } from "node:stream";
import { describe, expect, it } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  insertSampleBatch,
  parseAppleHealthExportXmlStream,
} from "./apple-health";

type NormalizedAppleHealthSample = Parameters<
  typeof insertSampleBatch
>[0][number];

const FIXTURE_PATH = join(
  process.cwd(),
  "tests/fixtures/apple-health/export.xml",
);

/**
 * In-memory Supabase fake that emulates the upsert behavior `insertSampleBatch`
 * depends on. The real DB enforces `unique (family_id, external_key)` on
 * `apple_health_samples`; with `ignoreDuplicates: true`, conflicting rows are
 * silently skipped and `.select("id")` returns only the rows that were
 * actually inserted. The fake reproduces that contract exactly so we can
 * exercise the importer's idempotency without standing up Postgres.
 *
 * Anything beyond `apple_health_samples.upsert(...)` is intentionally not
 * supported — drive failures push us toward the real Supabase test harness.
 */
function createSampleStoreFake() {
  const rowsByKey = new Map<string, Record<string, unknown>>();

  function from(table: string) {
    if (table !== "apple_health_samples") {
      throw new Error(`unsupported table in fake: ${table}`);
    }
    return {
      upsert(
        rows: Record<string, unknown>[],
        options: { onConflict: string; ignoreDuplicates: boolean },
      ) {
        if (options.onConflict !== "family_id,external_key") {
          throw new Error(
            `unexpected onConflict: ${options.onConflict}; the importer's contract is family_id,external_key`,
          );
        }
        const inserted: { id: string }[] = [];
        for (const row of rows) {
          const key = `${row.family_id}:${row.external_key}`;
          if (rowsByKey.has(key)) {
            if (!options.ignoreDuplicates) {
              rowsByKey.set(key, row);
            }
            continue;
          }
          // Synthesize a stable-ish id so `.select("id")` can return one.
          const id = `mock-${key}`;
          rowsByKey.set(key, { ...row, id });
          inserted.push({ id });
        }
        return {
          select: () => Promise.resolve({ data: inserted, error: null }),
        };
      },
    };
  }

  return {
    client: { from } as unknown as SupabaseClient,
    rowsByKey,
  };
}

async function parseFixtureSamples(
  xml: string,
): Promise<NormalizedAppleHealthSample[]> {
  const stream = Readable.from(xml);
  const samples: NormalizedAppleHealthSample[] = [];
  await parseAppleHealthExportXmlStream(stream, async (batch) => {
    samples.push(...batch);
  });
  return samples;
}

describe("Apple Health DB round-trip (parser → upsert → repeat)", () => {
  it("inserts every parsed sample on the first import and zero on the second", async () => {
    const xml = await readFile(FIXTURE_PATH, "utf8");
    const samples = await parseFixtureSamples(xml);
    expect(samples.length).toBeGreaterThan(0);

    const fake = createSampleStoreFake();

    const firstRun = await insertSampleBatch(samples, {
      familyId: "fam-1",
      userId: "user-1",
      importId: "imp-1",
      supabase: fake.client,
    });

    expect(firstRun).toBe(samples.length);
    expect(fake.rowsByKey.size).toBe(samples.length);

    const secondRun = await insertSampleBatch(samples, {
      familyId: "fam-1",
      userId: "user-1",
      importId: "imp-2", // simulating a re-import attempt — different import id
      supabase: fake.client,
    });

    // Idempotency contract: zero newly-inserted rows on re-import.
    expect(secondRun).toBe(0);
    expect(fake.rowsByKey.size).toBe(samples.length);
  });

  it("a *different* family does NOT collide with the first family's keys", async () => {
    const xml = await readFile(FIXTURE_PATH, "utf8");
    const samples = await parseFixtureSamples(xml);
    const fake = createSampleStoreFake();

    const familyA = await insertSampleBatch(samples, {
      familyId: "fam-A",
      userId: "user-A",
      importId: "imp-A",
      supabase: fake.client,
    });
    const familyB = await insertSampleBatch(samples, {
      familyId: "fam-B",
      userId: "user-B",
      importId: "imp-B",
      supabase: fake.client,
    });

    expect(familyA).toBe(samples.length);
    expect(familyB).toBe(samples.length);
    expect(fake.rowsByKey.size).toBe(samples.length * 2);
  });

  it("carries metadata.local_date through to the row that would be persisted", async () => {
    const xml = await readFile(FIXTURE_PATH, "utf8");
    const samples = await parseFixtureSamples(xml);
    const fake = createSampleStoreFake();

    await insertSampleBatch(samples, {
      familyId: "fam-1",
      userId: "user-1",
      importId: "imp-1",
      supabase: fake.client,
    });

    // Sleep sample in the fixture starts at 23:00 PT on May 9; the parser
    // must tag local_date as 2026-05-09 so the SQL summary function can
    // group it under the local day.
    const sleepRow = Array.from(fake.rowsByKey.values()).find(
      (row) => row.normalized_type === "sleep_asleep_minutes",
    );
    expect(sleepRow).toBeTruthy();
    expect((sleepRow?.metadata as Record<string, unknown>)?.local_date).toBe(
      "2026-05-09",
    );
  });
});
