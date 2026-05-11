import { createHash } from "node:crypto";
import { createWriteStream } from "node:fs";
import { mkdtemp, rm, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { pipeline } from "node:stream/promises";
import { Readable, Transform } from "node:stream";
import type { SupabaseClient } from "@supabase/supabase-js";
import yauzl from "yauzl";
import { SaxesParser } from "saxes";
import {
  appleHealthDailySummaryFilterSchema,
  appleHealthDailySummarySchema,
  appleHealthImportFilterSchema,
  appleHealthImportResultSchema,
  appleHealthImportSchema,
  appleHealthSampleFilterSchema,
  appleHealthSampleSchema,
  createAppleHealthImportInputSchema,
  type AppleHealthDailySummary,
  type AppleHealthDailySummaryFilter,
  type AppleHealthImport,
  type AppleHealthImportFilter,
  type AppleHealthImportResult,
  type AppleHealthMetricType,
  type AppleHealthSample,
  type AppleHealthSampleFilter,
  type CreateAppleHealthImportInput,
} from "@/server/contracts";
import { DEFAULT_PAGE_SIZE } from "@/server/contracts/common";
import { assertCanWrite, requireCurrentProfile } from "./auth";
import { NotFoundError, UnsupportedMediaTypeError } from "./errors";

type Row = Record<string, unknown>;
type XmlAttributes = Record<string, string>;

type AttachmentRow = {
  id: string;
  family_id: string;
  user_id: string;
  bucket_id: string;
  file_path: string;
  file_name: string;
  mime_type: string;
  size_bytes: number;
};

type NormalizedAppleHealthSample = {
  external_key: string;
  apple_type: string;
  normalized_type: AppleHealthMetricType;
  sample_kind: "quantity" | "category" | "workout";
  source_name: string | null;
  source_version: string | null;
  device: string | null;
  unit: string | null;
  value_numeric: number | null;
  value_text: string | null;
  start_at: string | null;
  end_at: string | null;
  creation_at: string | null;
  duration_seconds: number | null;
  metadata: Record<string, unknown>;
};

type ParseResult = {
  scannedRecordCount: number;
  skippedRecordCount: number;
  sampleCount: number;
  minDate: string | null;
  maxDate: string | null;
};

type PaginatedAppleHealthImports = {
  items: AppleHealthImport[];
  next_cursor: string | null;
  page_size: number;
};

type PaginatedAppleHealthSamples = {
  items: AppleHealthSample[];
  next_cursor: string | null;
  page_size: number;
};

type PaginatedAppleHealthDailySummaries = {
  items: AppleHealthDailySummary[];
  next_cursor: string | null;
  page_size: number;
};

const IMPORT_BATCH_SIZE = 500;
const SUPPORTED_ZIP_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
]);

const QUANTITY_TYPE_MAP: Partial<Record<string, AppleHealthMetricType>> = {
  HKQuantityTypeIdentifierStepCount: "step_count",
  HKQuantityTypeIdentifierDistanceWalkingRunning: "distance_walking_running",
  HKQuantityTypeIdentifierFlightsClimbed: "flights_climbed",
  HKQuantityTypeIdentifierActiveEnergyBurned: "active_energy_burned",
  HKQuantityTypeIdentifierAppleExerciseTime: "apple_exercise_time",
  HKQuantityTypeIdentifierHeartRate: "heart_rate",
  HKQuantityTypeIdentifierRestingHeartRate: "resting_heart_rate",
  HKQuantityTypeIdentifierHeartRateVariabilitySDNN:
    "heart_rate_variability_sdnn",
  HKQuantityTypeIdentifierWalkingHeartRateAverage: "walking_heart_rate_average",
  HKQuantityTypeIdentifierWalkingStepLength: "walking_step_length",
  HKQuantityTypeIdentifierWalkingSpeed: "walking_speed",
  HKQuantityTypeIdentifierWalkingAsymmetryPercentage:
    "walking_asymmetry_percentage",
  HKQuantityTypeIdentifierWalkingDoubleSupportPercentage:
    "walking_double_support_percentage",
  HKQuantityTypeIdentifierStairAscentSpeed: "stair_ascent_speed",
  HKQuantityTypeIdentifierStairDescentSpeed: "stair_descent_speed",
  HKQuantityTypeIdentifierSixMinuteWalkTestDistance:
    "six_minute_walk_test_distance",
  HKQuantityTypeIdentifierAppleWalkingSteadiness: "apple_walking_steadiness",
};

const DISTANCE_METRICS = new Set<AppleHealthMetricType>([
  "distance_walking_running",
  "walking_step_length",
  "six_minute_walk_test_distance",
  "workout_distance",
]);

const SPEED_METRICS = new Set<AppleHealthMetricType>([
  "walking_speed",
  "stair_ascent_speed",
  "stair_descent_speed",
]);

function numberFromUnknown(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value !== "string" || !value.trim()) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeAppleDate(value: string | undefined) {
  if (!value) return null;
  const trimmed = value.trim();
  const appleDate = trimmed.match(
    /^(\d{4}-\d{2}-\d{2}) (\d{2}:\d{2}:\d{2}) ([+-]\d{2})(\d{2})$/,
  );
  const normalized = appleDate
    ? `${appleDate[1]}T${appleDate[2]}${appleDate[3]}:${appleDate[4]}`
    : trimmed;
  const date = new Date(normalized);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString();
}

/**
 * Returns the *Apple local day* (`YYYY-MM-DD`) for a timestamp in the format
 * Apple Health exports use: `YYYY-MM-DD HH:mm:ss ±HHmm`. Daily summaries
 * should group by this rather than by UTC day so that sleep / activity in
 * non-UTC zones doesn't shift to the wrong day. Returns `null` for input the
 * parser can't recognize. See `apple-health-local-date.test.ts`.
 */
export function appleLocalDate(
  value: string | undefined | null,
): string | null {
  if (!value) return null;
  const match = value
    .trim()
    .match(
      /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2}) ([+-]\d{2})(\d{2})$/,
    );
  if (!match) return null;
  // The match's first three groups are already the local Y / M / D — Apple's
  // export records the timestamp *in the local zone* and the offset is just
  // provenance. Trust the source string.
  return `${match[1]}-${match[2]}-${match[3]}`;
}

function durationSeconds(startAt: string | null, endAt: string | null) {
  if (!startAt || !endAt) return null;
  const start = new Date(startAt).getTime();
  const end = new Date(endAt).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end < start) {
    return null;
  }

  return (end - start) / 1000;
}

function hashExternalKey(parts: Record<string, unknown>) {
  return createHash("sha256").update(JSON.stringify(parts)).digest("hex");
}

function canonicalizeQuantity(
  metric: AppleHealthMetricType,
  value: number | null,
  unit: string | undefined,
) {
  if (value === null) {
    return {
      value,
      unit: unit ?? null,
      originalUnit: unit ?? null,
      originalValue: value,
    };
  }

  const rawUnit = unit ?? null;
  let canonicalValue = value;
  let canonicalUnit = rawUnit;

  if (DISTANCE_METRICS.has(metric)) {
    canonicalUnit = "m";
    if (rawUnit === "km") canonicalValue = value * 1000;
    else if (rawUnit === "mi") canonicalValue = value * 1609.344;
    else if (rawUnit === "ft") canonicalValue = value * 0.3048;
    else if (rawUnit === "in") canonicalValue = value * 0.0254;
    else if (rawUnit === "cm") canonicalValue = value / 100;
  } else if (SPEED_METRICS.has(metric)) {
    canonicalUnit = "m/s";
    if (rawUnit === "km/hr") canonicalValue = value / 3.6;
    else if (rawUnit === "mi/hr") canonicalValue = value * 0.44704;
  } else if (metric === "active_energy_burned" || metric === "workout_energy") {
    canonicalUnit = "kcal";
    if (rawUnit === "kJ") canonicalValue = value / 4.184;
  } else if (metric === "apple_exercise_time") {
    canonicalUnit = "min";
  } else if (metric === "step_count" || metric === "flights_climbed") {
    canonicalUnit = "count";
  }

  return {
    value: canonicalValue,
    unit: canonicalUnit,
    originalUnit: rawUnit,
    originalValue: value,
  };
}

function sampleFromAttributes(
  attrs: XmlAttributes,
  options: {
    normalizedType: AppleHealthMetricType;
    sampleKind: "quantity" | "category" | "workout";
    valueNumeric: number | null;
    valueText: string | null;
    unit: string | null;
    appleType?: string;
    metadata?: Record<string, unknown>;
    keySuffix?: string;
  },
): NormalizedAppleHealthSample {
  const startAt = normalizeAppleDate(attrs.startDate);
  const endAt = normalizeAppleDate(attrs.endDate);
  const creationAt = normalizeAppleDate(attrs.creationDate);
  const duration = durationSeconds(startAt, endAt);
  const appleType = options.appleType ?? attrs.type ?? "Workout";

  return {
    external_key: hashExternalKey({
      apple_type: appleType,
      normalized_type: options.normalizedType,
      key_suffix: options.keySuffix ?? null,
      source_name: attrs.sourceName ?? null,
      source_version: attrs.sourceVersion ?? null,
      device: attrs.device ?? null,
      unit: options.unit,
      value_numeric: options.valueNumeric,
      value_text: options.valueText,
      start_at: startAt,
      end_at: endAt,
      creation_at: creationAt,
    }),
    apple_type: appleType,
    normalized_type: options.normalizedType,
    sample_kind: options.sampleKind,
    source_name: attrs.sourceName ?? null,
    source_version: attrs.sourceVersion ?? null,
    device: attrs.device ?? null,
    unit: options.unit,
    value_numeric: options.valueNumeric,
    value_text: options.valueText,
    start_at: startAt,
    end_at: endAt,
    creation_at: creationAt,
    duration_seconds: duration,
    metadata: {
      ...(options.metadata ?? {}),
      // Apple local day, derived from the source XML's timezone offset.
      // The SQL daily-summary function still groups by UTC date today;
      // tracking issue documented in docs/qa/MVP_INTEGRATION_QA.md. Once
      // the function is migrated, it can group on this field for honest
      // local-day reporting (e.g. sleep records crossing midnight).
      local_date: appleLocalDate(attrs.startDate),
    },
  };
}

export function normalizeAppleHealthRecord(
  attrs: XmlAttributes,
  metadataEntries: Record<string, string> = {},
): NormalizedAppleHealthSample | null {
  const appleType = attrs.type;
  if (!appleType) return null;

  if (appleType === "HKCategoryTypeIdentifierSleepAnalysis") {
    const value = attrs.value ?? null;
    const normalizedType = value?.includes("Asleep")
      ? "sleep_asleep_minutes"
      : value?.includes("InBed")
        ? "sleep_in_bed_minutes"
        : null;

    if (!normalizedType) return null;

    return sampleFromAttributes(attrs, {
      normalizedType,
      sampleKind: "category",
      valueNumeric: null,
      valueText: value,
      unit: "min",
      metadata: { metadata_entries: metadataEntries },
    });
  }

  const normalizedType = QUANTITY_TYPE_MAP[appleType];
  if (!normalizedType) return null;

  const rawValue = numberFromUnknown(attrs.value);
  const quantity = canonicalizeQuantity(normalizedType, rawValue, attrs.unit);

  return sampleFromAttributes(attrs, {
    normalizedType,
    sampleKind: "quantity",
    valueNumeric: quantity.value,
    valueText: attrs.value ?? null,
    unit: quantity.unit,
    metadata: {
      original_unit: quantity.originalUnit,
      original_value: quantity.originalValue,
      metadata_entries: metadataEntries,
    },
  });
}

export function normalizeAppleHealthWorkout(
  attrs: XmlAttributes,
): NormalizedAppleHealthSample[] {
  const duration = numberFromUnknown(attrs.duration);
  const durationUnit = attrs.durationUnit ?? "min";
  const durationMinutes =
    duration === null
      ? null
      : durationUnit === "sec"
        ? duration / 60
        : durationUnit === "hr"
          ? duration * 60
          : duration;
  const baseMetadata = {
    workout_activity_type: attrs.workoutActivityType ?? null,
  };
  const samples: NormalizedAppleHealthSample[] = [];

  samples.push(
    sampleFromAttributes(attrs, {
      normalizedType: "workout_minutes",
      sampleKind: "workout",
      valueNumeric: durationMinutes,
      valueText: attrs.duration ?? null,
      unit: "min",
      appleType: "Workout",
      metadata: {
        ...baseMetadata,
        original_duration: duration,
        original_duration_unit: durationUnit,
      },
      keySuffix: "duration",
    }),
  );

  const distance = canonicalizeQuantity(
    "workout_distance",
    numberFromUnknown(attrs.totalDistance),
    attrs.totalDistanceUnit,
  );
  if (distance.value !== null) {
    samples.push(
      sampleFromAttributes(attrs, {
        normalizedType: "workout_distance",
        sampleKind: "workout",
        valueNumeric: distance.value,
        valueText: attrs.totalDistance ?? null,
        unit: distance.unit,
        appleType: "Workout",
        metadata: {
          ...baseMetadata,
          original_unit: distance.originalUnit,
          original_value: distance.originalValue,
        },
        keySuffix: "distance",
      }),
    );
  }

  const energy = canonicalizeQuantity(
    "workout_energy",
    numberFromUnknown(attrs.totalEnergyBurned),
    attrs.totalEnergyBurnedUnit,
  );
  if (energy.value !== null) {
    samples.push(
      sampleFromAttributes(attrs, {
        normalizedType: "workout_energy",
        sampleKind: "workout",
        valueNumeric: energy.value,
        valueText: attrs.totalEnergyBurned ?? null,
        unit: energy.unit,
        appleType: "Workout",
        metadata: {
          ...baseMetadata,
          original_unit: energy.originalUnit,
          original_value: energy.originalValue,
        },
        keySuffix: "energy",
      }),
    );
  }

  return samples.filter(
    (sample) =>
      sample.normalized_type !== "workout_minutes" ||
      sample.value_numeric !== null,
  );
}

function attrsFromSaxes(attrs: Record<string, unknown>): XmlAttributes {
  const normalized: XmlAttributes = {};

  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === "string") {
      normalized[key] = value;
    } else if (
      value &&
      typeof value === "object" &&
      "value" in value &&
      typeof value.value === "string"
    ) {
      normalized[key] = value.value;
    }
  }

  return normalized;
}

export async function parseAppleHealthExportXmlStream(
  stream: NodeJS.ReadableStream,
  onSamples: (samples: NormalizedAppleHealthSample[]) => Promise<void>,
): Promise<ParseResult> {
  const parser = new SaxesParser({ xmlns: false });
  const emittedSamples: NormalizedAppleHealthSample[] = [];
  let currentRecord: XmlAttributes | null = null;
  let currentMetadata: Record<string, string> = {};
  let scannedRecordCount = 0;
  let skippedRecordCount = 0;
  let sampleCount = 0;
  let minDate: string | null = null;
  let maxDate: string | null = null;

  function observeDate(sample: NormalizedAppleHealthSample) {
    if (!sample.start_at) return;
    if (!minDate || sample.start_at < minDate) minDate = sample.start_at;
    if (!maxDate || sample.start_at > maxDate) maxDate = sample.start_at;
  }

  function emitSamples(samples: NormalizedAppleHealthSample[]) {
    if (samples.length === 0) {
      skippedRecordCount += 1;
      return;
    }

    sampleCount += samples.length;
    samples.forEach(observeDate);
    emittedSamples.push(...samples);
  }

  async function flushEmittedSamples() {
    if (emittedSamples.length === 0) return;
    const batch = emittedSamples.splice(0, emittedSamples.length);
    await onSamples(batch);
  }

  parser.on("opentag", (node) => {
    if (node.name === "Record") {
      scannedRecordCount += 1;
      currentRecord = attrsFromSaxes(node.attributes);
      currentMetadata = {};
      return;
    }

    if (node.name === "MetadataEntry" && currentRecord) {
      const attrs = attrsFromSaxes(node.attributes);
      if (attrs.key) {
        currentMetadata[attrs.key] = attrs.value ?? "";
      }
      return;
    }

    if (node.name === "Workout") {
      scannedRecordCount += 1;
      emitSamples(normalizeAppleHealthWorkout(attrsFromSaxes(node.attributes)));
    }
  });

  parser.on("closetag", (tag) => {
    if (tag.name !== "Record" || !currentRecord) {
      return;
    }

    const sample = normalizeAppleHealthRecord(currentRecord, currentMetadata);
    emitSamples(sample ? [sample] : []);
    currentRecord = null;
    currentMetadata = {};
  });

  if ("setEncoding" in stream && typeof stream.setEncoding === "function") {
    stream.setEncoding("utf8");
  }

  parser.on("error", (error) => {
    throw error;
  });

  for await (const chunk of stream as AsyncIterable<string | Buffer>) {
    parser.write(String(chunk));
    if (emittedSamples.length >= IMPORT_BATCH_SIZE) {
      await flushEmittedSamples();
    }
  }

  parser.close();
  await flushEmittedSamples();

  return {
    scannedRecordCount,
    skippedRecordCount,
    sampleCount,
    minDate,
    maxDate,
  };
}

function openZip(path: string) {
  return new Promise<yauzl.ZipFile>((resolve, reject) => {
    yauzl.open(path, { lazyEntries: true }, (error, zipFile) => {
      if (error) reject(error);
      else if (!zipFile)
        reject(new Error("Could not open Apple Health export zip"));
      else resolve(zipFile);
    });
  });
}

function openZipReadStream(zipFile: yauzl.ZipFile, entry: yauzl.Entry) {
  return new Promise<Readable>((resolve, reject) => {
    zipFile.openReadStream(entry, (error, stream) => {
      if (error) reject(error);
      else if (!stream) reject(new Error("Could not read export.xml from zip"));
      else resolve(stream);
    });
  });
}

async function findExportXmlStream(path: string) {
  const zipFile = await openZip(path);

  return new Promise<{ zipFile: yauzl.ZipFile; stream: Readable }>(
    (resolve, reject) => {
      zipFile.once("error", reject);
      zipFile.on("entry", async (entry) => {
        if (/(\b|\/)export\.xml$/i.test(entry.fileName)) {
          try {
            resolve({
              zipFile,
              stream: await openZipReadStream(zipFile, entry),
            });
          } catch (error) {
            reject(error);
          }
          return;
        }

        zipFile.readEntry();
      });
      zipFile.once("end", () => {
        reject(new Error("Apple Health export zip did not contain export.xml"));
      });
      zipFile.readEntry();
    },
  );
}

async function downloadAttachmentToTempFile(
  attachment: AttachmentRow,
  supabase: SupabaseClient,
) {
  const tempDir = await mkdtemp(join(tmpdir(), "bella-apple-health-"));
  const tempPath = join(tempDir, basename(attachment.file_path));
  const hash = createHash("sha256");
  const { data, error } = await supabase.storage
    .from(attachment.bucket_id)
    .createSignedUrl(attachment.file_path, 60);

  if (error) throw error;

  const response = await fetch(data.signedUrl);
  if (!response.ok || !response.body) {
    throw new Error(
      `Could not download Apple Health export: ${response.status}`,
    );
  }

  const hashStream = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      hash.update(chunk);
      callback(null, chunk);
    },
  });

  await pipeline(
    Readable.fromWeb(
      response.body as unknown as Parameters<typeof Readable.fromWeb>[0],
    ),
    hashStream,
    createWriteStream(tempPath),
  );

  return {
    tempDir,
    tempPath,
    sha256: hash.digest("hex"),
  };
}

export function normalizeAppleHealthImportRow(row: Row): AppleHealthImport {
  return appleHealthImportSchema.parse({
    ...row,
    attachment_id: row.attachment_id ?? null,
    file_name: row.file_name ?? null,
    file_sha256: row.file_sha256 ?? null,
    export_started_at: row.export_started_at ?? null,
    export_ended_at: row.export_ended_at ?? null,
    error_message: row.error_message ?? null,
    metadata:
      row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    deleted_at: row.deleted_at ?? null,
  });
}

export function normalizeAppleHealthSampleRow(row: Row): AppleHealthSample {
  return appleHealthSampleSchema.parse({
    ...row,
    import_id: row.import_id ?? null,
    source_name: row.source_name ?? null,
    source_version: row.source_version ?? null,
    device: row.device ?? null,
    unit: row.unit ?? null,
    value_numeric: numberFromUnknown(row.value_numeric),
    value_text: row.value_text ?? null,
    start_at: row.start_at ?? null,
    end_at: row.end_at ?? null,
    creation_at: row.creation_at ?? null,
    duration_seconds: numberFromUnknown(row.duration_seconds),
    metadata:
      row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    deleted_at: row.deleted_at ?? null,
  });
}

export function normalizeAppleHealthDailySummaryRow(
  row: Row,
): AppleHealthDailySummary {
  return appleHealthDailySummarySchema.parse({
    ...row,
    unit: row.unit ?? null,
    value_sum: numberFromUnknown(row.value_sum),
    value_avg: numberFromUnknown(row.value_avg),
    value_min: numberFromUnknown(row.value_min),
    value_max: numberFromUnknown(row.value_max),
    first_sample_at: row.first_sample_at ?? null,
    last_sample_at: row.last_sample_at ?? null,
    metadata:
      row.metadata && typeof row.metadata === "object" ? row.metadata : {},
    deleted_at: row.deleted_at ?? null,
  });
}

/**
 * After a successful import, remove the raw export from storage and soft-delete
 * the attachment row. The raw Apple Health zip is much broader than the
 * normalized samples we keep, so we don't want it lingering in private storage
 * or surfacing in bulk-export manifests. Provenance stays on the import row's
 * `attachment_id` (FK is `on delete set null`).
 *
 * Best-effort: cleanup errors are recorded on the import row's metadata but
 * never fail the import itself.
 */
async function cleanupImportAttachment(
  attachment: AttachmentRow,
  importId: string,
  supabase: SupabaseClient,
): Promise<void> {
  try {
    const { error: storageError } = await supabase.storage
      .from(attachment.bucket_id)
      .remove([attachment.file_path]);
    if (storageError) throw storageError;

    const { error: updateError } = await supabase
      .from("attachments")
      .update({ deleted_at: new Date().toISOString() })
      .eq("id", attachment.id);
    if (updateError) throw updateError;
  } catch (error) {
    const message = error instanceof Error ? error.message : "cleanup failed";
    await supabase
      .from("apple_health_imports")
      .update({
        metadata: { raw_attachment_cleanup_error: message },
      })
      .eq("id", importId)
      .then(
        () => undefined,
        () => undefined,
      );
  }
}

async function getAttachmentForImport(
  attachmentId: string,
  supabase: SupabaseClient,
): Promise<AttachmentRow> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("attachments")
    .select(
      "id,family_id,user_id,bucket_id,file_path,file_name,mime_type,size_bytes",
    )
    .eq("id", attachmentId)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError("Attachment not found");

  const attachment = data as AttachmentRow;
  if (
    !SUPPORTED_ZIP_MIME_TYPES.has(attachment.mime_type) &&
    !attachment.file_name.toLowerCase().endsWith(".zip")
  ) {
    throw new UnsupportedMediaTypeError(
      "Apple Health import requires an export.zip attachment",
    );
  }

  return attachment;
}

async function createImportRow(
  attachment: AttachmentRow,
  supabase: SupabaseClient,
) {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("apple_health_imports")
    .insert({
      family_id: profile.family_id,
      user_id: profile.id,
      attachment_id: attachment.id,
      status: "processing",
      file_name: attachment.file_name,
      metadata: {
        attachment_size_bytes: attachment.size_bytes,
        attachment_mime_type: attachment.mime_type,
      },
    })
    .select("*")
    .single();

  if (error) throw error;
  return normalizeAppleHealthImportRow(data as Row);
}

async function updateImportRow(
  importId: string,
  patch: Record<string, unknown>,
  supabase: SupabaseClient,
) {
  const { data, error } = await supabase
    .from("apple_health_imports")
    .update(patch)
    .eq("id", importId)
    .select("*")
    .single();

  if (error) throw error;
  return normalizeAppleHealthImportRow(data as Row);
}

// Exported for tests: this is the literal idempotency contract for repeat
// imports. The unique constraint on (family_id, external_key) combined with
// `ignoreDuplicates: true` means a re-import returns 0 newly-inserted rows
// while leaving the existing rows in place.
export async function insertSampleBatch(
  samples: NormalizedAppleHealthSample[],
  context: {
    familyId: string;
    userId: string;
    importId: string;
    supabase: SupabaseClient;
  },
) {
  if (samples.length === 0) return 0;

  const rows = samples.map((sample) => ({
    family_id: context.familyId,
    user_id: context.userId,
    import_id: context.importId,
    ...sample,
  }));
  const { data, error } = await context.supabase
    .from("apple_health_samples")
    .upsert(rows, {
      onConflict: "family_id,external_key",
      ignoreDuplicates: true,
    })
    .select("id");

  if (error) throw error;
  return data?.length ?? 0;
}

async function refreshDailySummaries(
  minDate: string | null,
  maxDate: string | null,
  supabase: SupabaseClient,
) {
  if (!minDate || !maxDate) return 0;

  const { data, error } = await supabase.rpc(
    "refresh_apple_health_daily_summaries",
    {
      start_date: minDate.slice(0, 10),
      end_date: maxDate.slice(0, 10),
    },
  );

  if (error) throw error;
  return numberFromUnknown(data) ?? 0;
}

export async function importAppleHealthExport(
  input: CreateAppleHealthImportInput,
  supabase: SupabaseClient,
): Promise<AppleHealthImportResult> {
  const parsed = createAppleHealthImportInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  const attachment = await getAttachmentForImport(
    parsed.attachment_id,
    supabase,
  );
  const importRow = await createImportRow(attachment, supabase);
  let tempDir: string | null = null;
  let insertedSampleCount = 0;

  try {
    const downloaded = await downloadAttachmentToTempFile(attachment, supabase);
    tempDir = downloaded.tempDir;
    const { zipFile, stream } = await findExportXmlStream(downloaded.tempPath);
    const bufferedSamples: NormalizedAppleHealthSample[] = [];

    const flush = async () => {
      if (bufferedSamples.length === 0) return;
      const batch = bufferedSamples.splice(0, bufferedSamples.length);
      insertedSampleCount += await insertSampleBatch(batch, {
        familyId: profile.family_id,
        userId: profile.id,
        importId: importRow.id,
        supabase,
      });
    };

    const parseResult = await parseAppleHealthExportXmlStream(
      stream,
      async (samples) => {
        bufferedSamples.push(...samples);
        if (bufferedSamples.length >= IMPORT_BATCH_SIZE) {
          await flush();
        }
      },
    );

    await flush();
    zipFile.close();
    await unlink(downloaded.tempPath).catch(() => null);

    const summaryCount = await refreshDailySummaries(
      parseResult.minDate,
      parseResult.maxDate,
      supabase,
    );
    const completed = await updateImportRow(
      importRow.id,
      {
        status: "completed",
        file_sha256: downloaded.sha256,
        export_started_at: parseResult.minDate,
        export_ended_at: parseResult.maxDate,
        scanned_record_count: parseResult.scannedRecordCount,
        imported_sample_count: insertedSampleCount,
        duplicate_sample_count: Math.max(
          0,
          parseResult.sampleCount - insertedSampleCount,
        ),
        skipped_record_count: parseResult.skippedRecordCount,
        daily_summary_count: summaryCount,
        error_message: null,
      },
      supabase,
    );

    await cleanupImportAttachment(attachment, importRow.id, supabase);

    return appleHealthImportResultSchema.parse({
      import: completed,
      summary_count: summaryCount,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Apple Health import failed";
    await updateImportRow(
      importRow.id,
      {
        status: "failed",
        error_message: message,
      },
      supabase,
    ).catch(() => null);
    throw error;
  } finally {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true }).catch(() => null);
    }
  }
}

export async function getAppleHealthImport(
  id: string,
  supabase: SupabaseClient,
): Promise<AppleHealthImport> {
  await requireCurrentProfile(supabase);

  const { data, error } = await supabase
    .from("apple_health_imports")
    .select("*")
    .eq("id", id)
    .is("deleted_at", null)
    .single();

  if (error) throw error;
  if (!data) throw new NotFoundError("Apple Health import not found");
  return normalizeAppleHealthImportRow(data as Row);
}

export async function listAppleHealthImports(
  input: AppleHealthImportFilter,
  supabase: SupabaseClient,
): Promise<PaginatedAppleHealthImports> {
  const parsed = appleHealthImportFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;
  await requireCurrentProfile(supabase);

  let query = supabase
    .from("apple_health_imports")
    .select("*")
    .is("deleted_at", null)
    .order("created_at", { ascending: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) query = query.lt("created_at", parsed.cursor);
  if (parsed.status) query = query.eq("status", parsed.status);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(normalizeAppleHealthImportRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.created_at : null,
    page_size: pageSize,
  };
}

export async function listAppleHealthSamples(
  input: AppleHealthSampleFilter,
  supabase: SupabaseClient,
): Promise<PaginatedAppleHealthSamples> {
  const parsed = appleHealthSampleFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;
  await requireCurrentProfile(supabase);

  let query = supabase
    .from("apple_health_samples")
    .select("*")
    .is("deleted_at", null)
    .order("start_at", { ascending: false, nullsFirst: false })
    .order("id", { ascending: false })
    .limit(pageSize + 1);

  if (parsed.cursor) query = query.lt("start_at", parsed.cursor);
  if (parsed.import_id) query = query.eq("import_id", parsed.import_id);
  if (parsed.normalized_type)
    query = query.eq("normalized_type", parsed.normalized_type);
  if (parsed.date_from) query = query.gte("start_at", parsed.date_from);
  if (parsed.date_to) query = query.lte("start_at", parsed.date_to);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(normalizeAppleHealthSampleRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.start_at : null,
    page_size: pageSize,
  };
}

export async function listAppleHealthDailySummaries(
  input: AppleHealthDailySummaryFilter,
  supabase: SupabaseClient,
): Promise<PaginatedAppleHealthDailySummaries> {
  const parsed = appleHealthDailySummaryFilterSchema.parse(input);
  const pageSize = parsed.page_size ?? DEFAULT_PAGE_SIZE;
  await requireCurrentProfile(supabase);

  let query = supabase
    .from("apple_health_daily_summaries")
    .select("*")
    .is("deleted_at", null)
    .order("summary_date", { ascending: false })
    .order("metric_type", { ascending: true })
    .limit(pageSize + 1);

  if (parsed.cursor) query = query.lt("summary_date", parsed.cursor);
  if (parsed.metric_type) query = query.eq("metric_type", parsed.metric_type);
  if (parsed.date_from) query = query.gte("summary_date", parsed.date_from);
  if (parsed.date_to) query = query.lte("summary_date", parsed.date_to);

  const { data, error } = await query;
  if (error) throw error;

  const rows = ((data ?? []) as Row[]).map(normalizeAppleHealthDailySummaryRow);
  const items = rows.slice(0, pageSize);
  const overflow = rows[pageSize];

  return {
    items,
    next_cursor: overflow ? overflow.summary_date : null,
    page_size: pageSize,
  };
}
