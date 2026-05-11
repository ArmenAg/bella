import { z } from "zod";
import {
  dateSchema,
  paginationInputSchema,
  utcDateTimeSchema,
  uuidSchema,
} from "./common";

export const appleHealthImportStatusSchema = z.enum([
  "processing",
  "completed",
  "failed",
]);

export const appleHealthSampleKindSchema = z.enum([
  "quantity",
  "category",
  "workout",
]);

export const appleHealthMetricTypeSchema = z.enum([
  "step_count",
  "distance_walking_running",
  "flights_climbed",
  "active_energy_burned",
  "apple_exercise_time",
  "heart_rate",
  "resting_heart_rate",
  "heart_rate_variability_sdnn",
  "walking_heart_rate_average",
  "walking_step_length",
  "walking_speed",
  "walking_asymmetry_percentage",
  "walking_double_support_percentage",
  "stair_ascent_speed",
  "stair_descent_speed",
  "six_minute_walk_test_distance",
  "apple_walking_steadiness",
  "sleep_asleep_minutes",
  "sleep_in_bed_minutes",
  "workout_minutes",
  "workout_distance",
  "workout_energy",
]);

export const createAppleHealthImportInputSchema = z.object({
  attachment_id: uuidSchema,
});

export const appleHealthImportFilterSchema = paginationInputSchema.extend({
  status: appleHealthImportStatusSchema.optional(),
});

export const appleHealthSampleFilterSchema = paginationInputSchema.extend({
  import_id: uuidSchema.optional(),
  normalized_type: appleHealthMetricTypeSchema.optional(),
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
});

export const appleHealthDailySummaryFilterSchema = paginationInputSchema.extend(
  {
    metric_type: appleHealthMetricTypeSchema.optional(),
    date_from: dateSchema.optional(),
    date_to: dateSchema.optional(),
  },
);

export const appleHealthImportSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  attachment_id: uuidSchema.nullable(),
  status: appleHealthImportStatusSchema,
  file_name: z.string().nullable(),
  file_sha256: z.string().nullable(),
  export_started_at: utcDateTimeSchema.nullable(),
  export_ended_at: utcDateTimeSchema.nullable(),
  scanned_record_count: z.number().int().min(0),
  imported_sample_count: z.number().int().min(0),
  duplicate_sample_count: z.number().int().min(0),
  skipped_record_count: z.number().int().min(0),
  daily_summary_count: z.number().int().min(0),
  error_message: z.string().nullable(),
  metadata: z.record(z.unknown()),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const appleHealthSampleSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  import_id: uuidSchema.nullable(),
  external_key: z.string(),
  apple_type: z.string(),
  normalized_type: appleHealthMetricTypeSchema,
  sample_kind: appleHealthSampleKindSchema,
  source_name: z.string().nullable(),
  source_version: z.string().nullable(),
  device: z.string().nullable(),
  unit: z.string().nullable(),
  value_numeric: z.number().nullable(),
  value_text: z.string().nullable(),
  start_at: utcDateTimeSchema.nullable(),
  end_at: utcDateTimeSchema.nullable(),
  creation_at: utcDateTimeSchema.nullable(),
  duration_seconds: z.number().nullable(),
  metadata: z.record(z.unknown()),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const appleHealthDailySummarySchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  summary_date: dateSchema,
  metric_type: appleHealthMetricTypeSchema,
  unit: z.string().nullable(),
  sample_count: z.number().int().min(0),
  value_sum: z.number().nullable(),
  value_avg: z.number().nullable(),
  value_min: z.number().nullable(),
  value_max: z.number().nullable(),
  first_sample_at: utcDateTimeSchema.nullable(),
  last_sample_at: utcDateTimeSchema.nullable(),
  metadata: z.record(z.unknown()),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const appleHealthImportResultSchema = z.object({
  import: appleHealthImportSchema,
  summary_count: z.number().int().min(0),
});

export const paginatedAppleHealthImportsSchema = z.object({
  items: z.array(appleHealthImportSchema),
  next_cursor: z.string().nullable(),
  page_size: z.number().int().min(1),
});

export const paginatedAppleHealthSamplesSchema = z.object({
  items: z.array(appleHealthSampleSchema),
  next_cursor: z.string().nullable(),
  page_size: z.number().int().min(1),
});

export const paginatedAppleHealthDailySummariesSchema = z.object({
  items: z.array(appleHealthDailySummarySchema),
  next_cursor: z.string().nullable(),
  page_size: z.number().int().min(1),
});

export type AppleHealthImportStatus = z.infer<
  typeof appleHealthImportStatusSchema
>;
export type AppleHealthSampleKind = z.infer<typeof appleHealthSampleKindSchema>;
export type AppleHealthMetricType = z.infer<typeof appleHealthMetricTypeSchema>;
export type CreateAppleHealthImportInput = z.input<
  typeof createAppleHealthImportInputSchema
>;
export type AppleHealthImportFilter = z.input<
  typeof appleHealthImportFilterSchema
>;
export type AppleHealthSampleFilter = z.input<
  typeof appleHealthSampleFilterSchema
>;
export type AppleHealthDailySummaryFilter = z.input<
  typeof appleHealthDailySummaryFilterSchema
>;
export type AppleHealthImport = z.infer<typeof appleHealthImportSchema>;
export type AppleHealthSample = z.infer<typeof appleHealthSampleSchema>;
export type AppleHealthDailySummary = z.infer<
  typeof appleHealthDailySummarySchema
>;
export type AppleHealthImportResult = z.infer<
  typeof appleHealthImportResultSchema
>;
