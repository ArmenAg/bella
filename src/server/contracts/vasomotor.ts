import { z } from "zod";
import {
  painScoreSchema,
  paginationInputSchema,
  utcDateTimeSchema,
  uuidSchema,
} from "./common";

export const vasomotorContextSchema = z.enum([
  "baseline",
  "active_flare",
  "recovery",
  "after_pressure_trigger",
  "after_medication",
  "after_procedure",
  "custom",
]);

export const vasomotorMeasurementMutationSchema = z.object({
  entry_id: uuidSchema.optional(),
  measured_at: utcDateTimeSchema,
  site: z.string().min(1).max(160),
  left_temp_c: z.number().min(0).max(60).optional(),
  right_temp_c: z.number().min(0).max(60).optional(),
  left_color: z.string().max(120).optional(),
  right_color: z.string().max(120).optional(),
  lighting_notes: z.string().max(4000).optional(),
  context: vasomotorContextSchema,
  notes: z.string().max(12000).optional(),
  left_attachment_id: uuidSchema.optional(),
  right_attachment_id: uuidSchema.optional(),
  subject_user_id: uuidSchema.optional(),
  entered_by_user_id: uuidSchema.optional(),
});

export const createVasomotorMeasurementInputSchema =
  vasomotorMeasurementMutationSchema;

export const updateVasomotorMeasurementInputSchema =
  vasomotorMeasurementMutationSchema.partial().extend({
    id: uuidSchema,
  });

export const vasomotorFilterSchema = paginationInputSchema.extend({
  entry_id: uuidSchema.optional(),
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
  site: z.string().max(160).optional(),
  context: vasomotorContextSchema.optional(),
});

export const vasomotorMeasurementDTOSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  subject_user_id: uuidSchema.nullable().optional(),
  entered_by_user_id: uuidSchema.nullable().optional(),
  entry_id: uuidSchema.nullable(),
  measured_at: utcDateTimeSchema,
  site: z.string(),
  left_temp_c: z.number().nullable(),
  right_temp_c: z.number().nullable(),
  delta_c: z.number().nullable(),
  left_color: z.string().nullable(),
  right_color: z.string().nullable(),
  lighting_notes: z.string().nullable(),
  context: vasomotorContextSchema,
  notes: z.string().nullable(),
  left_attachment_id: uuidSchema.nullable(),
  right_attachment_id: uuidSchema.nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const vasomotorCheckpointSummarySchema = z.object({
  measured_at: utcDateTimeSchema,
  site: z.string(),
  delta_c: z.number().nullable(),
  pain_score: painScoreSchema.nullable().optional(),
});

export type CreateVasomotorMeasurementInput = z.input<
  typeof createVasomotorMeasurementInputSchema
>;
export type UpdateVasomotorMeasurementInput = z.input<
  typeof updateVasomotorMeasurementInputSchema
>;
export type VasomotorMeasurementDTO = z.infer<
  typeof vasomotorMeasurementDTOSchema
>;
export type VasomotorFilter = z.input<typeof vasomotorFilterSchema>;
