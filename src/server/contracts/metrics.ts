import { z } from "zod";
import {
  dateSchema,
  paginationInputSchema,
  utcDateTimeSchema,
  uuidSchema,
} from "./common";

export const metricsFilterSchema = paginationInputSchema.extend({
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
});

export const weeklyFlareMetricSchema = z.object({
  week_start: dateSchema,
  flare_count: z.number().int().min(0),
});

export const recoveryMetricSchema = z.object({
  flare_count: z.number().int().min(0),
  average_recovery_minutes: z.number().nullable(),
  median_recovery_minutes: z.number().nullable(),
});

export const painByBodyRegionMetricSchema = z.object({
  body_region_id: uuidSchema,
  entry_count: z.number().int().min(0),
  average_pain_peak: z.number().nullable(),
  average_pain_current: z.number().nullable(),
});

export const triggerFrequencyMetricSchema = z.object({
  trigger_id: uuidSchema,
  entry_count: z.number().int().min(0),
});

export const medicationResponseSummarySchema = z.object({
  medication_id: uuidSchema.nullable(),
  response_count: z.number().int().min(0),
  helped_count: z.number().int().min(0),
  unclear_count: z.number().int().min(0),
  worsened_count: z.number().int().min(0),
  average_pain_delta_120m: z.number().nullable(),
});

export const vasomotorDeltaMetricSchema = z.object({
  measured_at: utcDateTimeSchema,
  site: z.string(),
  delta_c: z.number().nullable(),
  context: z.string(),
});

export const dashboardMetricsSchema = z.object({
  generated_at: utcDateTimeSchema,
  flares_per_week: z.array(weeklyFlareMetricSchema),
  recovery: recoveryMetricSchema,
  pain_by_body_region: z.array(painByBodyRegionMetricSchema),
  trigger_frequency: z.array(triggerFrequencyMetricSchema),
  medication_response_summary: z.array(medicationResponseSummarySchema),
  vasomotor_deltas_over_time: z.array(vasomotorDeltaMetricSchema),
  upcoming_appointments_count: z.number().int().min(0),
  open_tasks_count: z.number().int().min(0),
  open_decisions_count: z.number().int().min(0),
});

export type MetricsFilter = z.input<typeof metricsFilterSchema>;
export type DashboardMetrics = z.infer<typeof dashboardMetricsSchema>;
export type WeeklyFlareMetric = z.infer<typeof weeklyFlareMetricSchema>;
export type RecoveryMetric = z.infer<typeof recoveryMetricSchema>;
export type PainByBodyRegionMetric = z.infer<
  typeof painByBodyRegionMetricSchema
>;
export type TriggerFrequencyMetric = z.infer<
  typeof triggerFrequencyMetricSchema
>;
export type MedicationResponseSummary = z.infer<
  typeof medicationResponseSummarySchema
>;
export type VasomotorDeltaMetric = z.infer<typeof vasomotorDeltaMetricSchema>;
