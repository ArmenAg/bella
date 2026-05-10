import { z } from "zod";
import {
  painScoreSchema,
  paginationInputSchema,
  utcDateTimeSchema,
  uuidSchema,
} from "./common";
import {
  entryDTOSchema,
  entrySymptomInputSchema,
  entryTriggerInputSchema,
} from "./entries";

export const flareCheckpointTypeSchema = z.enum([
  "start",
  "30m",
  "60m",
  "120m",
  "6h",
  "12h",
  "24h",
  "48h",
  "custom",
]);

export const startFlareInputSchema = z.object({
  occurred_at: utcDateTimeSchema,
  title: z.string().min(1).max(240).default("Flare"),
  pain_current: painScoreSchema.optional(),
  pain_peak: painScoreSchema.optional(),
  primary_trigger_id: uuidSchema.optional(),
  body_region_ids: z.array(uuidSchema).default([]),
  symptoms: z.array(entrySymptomInputSchema).default([]),
  triggers: z.array(entryTriggerInputSchema).default([]),
  notes: z.string().max(20000).optional(),
  client_recorded_at: utcDateTimeSchema.optional(),
});

export const flareCheckpointInputSchema = z.object({
  entry_id: uuidSchema,
  checkpoint_type: flareCheckpointTypeSchema,
  checkpoint_at: utcDateTimeSchema,
  pain_score: painScoreSchema.optional(),
  symptoms: z.array(entrySymptomInputSchema).default([]),
  notes: z.string().max(12000).optional(),
});

export const updateFlareInputSchema = z.object({
  entry_id: uuidSchema,
  title: z.string().min(1).max(240).optional(),
  pain_current: painScoreSchema.optional(),
  pain_peak: painScoreSchema.optional(),
  notes: z.string().max(20000).optional(),
  body_region_ids: z.array(uuidSchema).optional(),
  symptoms: z.array(entrySymptomInputSchema).optional(),
  triggers: z.array(entryTriggerInputSchema).optional(),
});

export const endFlareInputSchema = z.object({
  entry_id: uuidSchema,
  ended_at: utcDateTimeSchema,
  pain_current: painScoreSchema.optional(),
  recovery_minutes: z.number().int().min(0).optional(),
  response: z.string().max(4000).optional(),
  notes: z.string().max(20000).optional(),
});

export const flareCheckpointDTOSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  entry_id: uuidSchema,
  checkpoint_type: flareCheckpointTypeSchema,
  checkpoint_at: utcDateTimeSchema,
  pain_score: painScoreSchema.nullable(),
  symptoms: z.array(entrySymptomInputSchema),
  notes: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const flareSessionDTOSchema = z.object({
  entry: entryDTOSchema,
  checkpoints: z.array(flareCheckpointDTOSchema),
});

export const activeFlareResultSchema = flareSessionDTOSchema.nullable();

export const recentFlareSummaryFilterSchema = paginationInputSchema.extend({
  include_active: z.boolean().default(false),
});

export const recentFlareSummarySchema = z.object({
  entry_id: uuidSchema,
  title: z.string(),
  started_at: utcDateTimeSchema,
  ended_at: utcDateTimeSchema.nullable(),
  duration_minutes: z.number().int().min(0).nullable(),
  recovery_minutes: z.number().int().min(0).nullable(),
  peak_pain: painScoreSchema.nullable(),
  checkpoints_count: z.number().int().min(0),
  trigger_ids: z.array(uuidSchema),
  body_region_ids: z.array(uuidSchema),
  notes_summary: z.string().nullable(),
});

export type StartFlareInput = z.input<typeof startFlareInputSchema>;
export type FlareCheckpointInput = z.input<typeof flareCheckpointInputSchema>;
export type UpdateFlareInput = z.input<typeof updateFlareInputSchema>;
export type EndFlareInput = z.input<typeof endFlareInputSchema>;
export type FlareCheckpointDTO = z.infer<typeof flareCheckpointDTOSchema>;
export type FlareSessionDTO = z.infer<typeof flareSessionDTOSchema>;
export type ActiveFlareResult = z.infer<typeof activeFlareResultSchema>;
export type RecentFlareSummaryFilter = z.input<
  typeof recentFlareSummaryFilterSchema
>;
export type RecentFlareSummary = z.infer<typeof recentFlareSummarySchema>;
