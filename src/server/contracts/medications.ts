import { z } from "zod";
import {
  dateSchema,
  painScoreSchema,
  paginationInputSchema,
  utcDateTimeSchema,
  uuidSchema,
} from "./common";

export const medicationStatusSchema = z.enum([
  "active",
  "paused",
  "stopped",
  "planned",
]);
export const medicationHelpedSchema = z.enum(["helped", "unclear", "worsened"]);

export const medicationMutationSchema = z.object({
  name: z.string().min(1).max(240),
  dose: z.string().max(240).optional(),
  route: z.string().max(120).optional(),
  frequency: z.string().max(240).optional(),
  start_date: dateSchema.optional(),
  stop_date: dateSchema.optional(),
  prescriber: z.string().max(240).optional(),
  reason: z.string().max(4000).optional(),
  status: medicationStatusSchema.default("active"),
  helped_pain: z.boolean().optional(),
  helped_sleep: z.boolean().optional(),
  helped_anxiety: z.boolean().optional(),
  helped_function: z.boolean().optional(),
  side_effects: z.string().max(12000).optional(),
  notes: z.string().max(12000).optional(),
});

export const createMedicationInputSchema = medicationMutationSchema;
export const updateMedicationInputSchema = medicationMutationSchema
  .partial()
  .extend({
    id: uuidSchema,
  });

export const medicationResponseMutationSchema = z.object({
  medication_id: uuidSchema.optional(),
  entry_id: uuidSchema.optional(),
  taken_at: utcDateTimeSchema,
  reason: z.string().max(4000).optional(),
  pain_before: painScoreSchema.optional(),
  pain_after_30m: painScoreSchema.optional(),
  pain_after_60m: painScoreSchema.optional(),
  pain_after_120m: painScoreSchema.optional(),
  sedation_effect: z.string().max(4000).optional(),
  cognition_effect: z.string().max(4000).optional(),
  gait_effect: z.string().max(4000).optional(),
  side_effects: z.string().max(12000).optional(),
  helped: medicationHelpedSchema.optional(),
  notes: z.string().max(12000).optional(),
});

export const createMedicationResponseInputSchema =
  medicationResponseMutationSchema;
export const updateMedicationResponseInputSchema =
  medicationResponseMutationSchema.partial().extend({
    id: uuidSchema,
  });

export const medicationFilterSchema = paginationInputSchema.extend({
  status: medicationStatusSchema.optional(),
});

export const medicationResponseFilterSchema = paginationInputSchema.extend({
  medication_id: uuidSchema.optional(),
  entry_id: uuidSchema.optional(),
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
});

export const medicationSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  name: z.string(),
  dose: z.string().nullable(),
  route: z.string().nullable(),
  frequency: z.string().nullable(),
  start_date: dateSchema.nullable(),
  stop_date: dateSchema.nullable(),
  prescriber: z.string().nullable(),
  reason: z.string().nullable(),
  status: medicationStatusSchema,
  helped_pain: z.boolean().nullable(),
  helped_sleep: z.boolean().nullable(),
  helped_anxiety: z.boolean().nullable(),
  helped_function: z.boolean().nullable(),
  side_effects: z.string().nullable(),
  notes: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const medicationResponseSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  medication_id: uuidSchema.nullable(),
  entry_id: uuidSchema.nullable(),
  taken_at: utcDateTimeSchema,
  reason: z.string().nullable(),
  pain_before: painScoreSchema.nullable(),
  pain_after_30m: painScoreSchema.nullable(),
  pain_after_60m: painScoreSchema.nullable(),
  pain_after_120m: painScoreSchema.nullable(),
  sedation_effect: z.string().nullable(),
  cognition_effect: z.string().nullable(),
  gait_effect: z.string().nullable(),
  side_effects: z.string().nullable(),
  helped: medicationHelpedSchema.nullable(),
  notes: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export type Medication = z.infer<typeof medicationSchema>;
export type MedicationResponse = z.infer<typeof medicationResponseSchema>;
export type CreateMedicationInput = z.input<typeof createMedicationInputSchema>;
export type UpdateMedicationInput = z.input<typeof updateMedicationInputSchema>;
export type MedicationFilter = z.input<typeof medicationFilterSchema>;
export type CreateMedicationResponseInput = z.input<
  typeof createMedicationResponseInputSchema
>;
export type UpdateMedicationResponseInput = z.input<
  typeof updateMedicationResponseInputSchema
>;
export type MedicationResponseFilter = z.input<
  typeof medicationResponseFilterSchema
>;
