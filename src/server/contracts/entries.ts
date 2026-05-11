import { z } from "zod";
import {
  painScoreSchema,
  paginationInputSchema,
  utcDateTimeSchema,
  uuidSchema,
} from "./common";

export const entryTypeSchema = z.enum([
  "baseline",
  "flare",
  "recovery",
  "procedure_related",
  "medication_related",
  "freeform",
  "vasomotor",
]);

export const flareStatusSchema = z.enum(["active", "ended", "cancelled"]);

export const entrySymptomInputSchema = z.object({
  symptom_id: uuidSchema,
  severity: painScoreSchema.optional(),
  notes: z.string().max(4000).optional(),
});

export const entryTriggerInputSchema = z.object({
  trigger_id: uuidSchema,
  notes: z.string().max(4000).optional(),
});

export const entryBaseMutationSchema = z.object({
  type: entryTypeSchema,
  occurred_at: utcDateTimeSchema,
  ended_at: utcDateTimeSchema.optional(),
  title: z.string().min(1).max(240),
  pain_current: painScoreSchema.optional(),
  pain_peak: painScoreSchema.optional(),
  pain_average: painScoreSchema.optional(),
  primary_trigger_id: uuidSchema.optional(),
  notes: z.string().max(20000).optional(),
  function_impact: z.array(z.string().min(1).max(120)).default([]),
  interventions_tried: z.array(z.string().min(1).max(120)).default([]),
  response: z.string().max(4000).optional(),
  is_flare: z.boolean().default(false),
  flare_status: flareStatusSchema.optional(),
  recovery_minutes: z.number().int().min(0).optional(),
  client_recorded_at: utcDateTimeSchema.optional(),
  subject_user_id: uuidSchema.optional(),
  entered_by_user_id: uuidSchema.optional(),
  body_region_ids: z.array(uuidSchema).default([]),
  symptoms: z.array(entrySymptomInputSchema).default([]),
  triggers: z.array(entryTriggerInputSchema).default([]),
});

export const createEntryInputSchema = entryBaseMutationSchema.superRefine(
  (input, ctx) => {
    if (input.ended_at && input.ended_at < input.occurred_at) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ended_at must be after occurred_at",
        path: ["ended_at"],
      });
    }

    if (input.type === "flare" && !input.is_flare) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "flare entries must set is_flare",
        path: ["is_flare"],
      });
    }
  },
);

export const updateEntryInputSchema = entryBaseMutationSchema
  .partial()
  .extend({
    id: uuidSchema,
  })
  .superRefine((input, ctx) => {
    if (
      input.ended_at &&
      input.occurred_at &&
      input.ended_at < input.occurred_at
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "ended_at must be after occurred_at",
        path: ["ended_at"],
      });
    }
  });

export const entryFilterSchema = paginationInputSchema.extend({
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
  type: entryTypeSchema.optional(),
  flare_only: z.boolean().optional(),
  body_region_id: uuidSchema.optional(),
  symptom_id: uuidSchema.optional(),
  trigger_id: uuidSchema.optional(),
});

export const entryDTOSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  created_by: uuidSchema.nullable(),
  subject_user_id: uuidSchema.nullable().optional(),
  entered_by_user_id: uuidSchema.nullable().optional(),
  type: entryTypeSchema,
  occurred_at: utcDateTimeSchema,
  ended_at: utcDateTimeSchema.nullable(),
  title: z.string(),
  pain_current: painScoreSchema.nullable(),
  pain_peak: painScoreSchema.nullable(),
  pain_average: painScoreSchema.nullable(),
  primary_trigger_id: uuidSchema.nullable(),
  notes: z.string().nullable(),
  function_impact: z.array(z.string()),
  interventions_tried: z.array(z.string()),
  response: z.string().nullable(),
  is_flare: z.boolean(),
  flare_status: flareStatusSchema.nullable(),
  recovery_minutes: z.number().int().min(0).nullable(),
  client_recorded_at: utcDateTimeSchema.nullable(),
  body_region_ids: z.array(uuidSchema).default([]),
  symptom_ids: z.array(uuidSchema).default([]),
  trigger_ids: z.array(uuidSchema).default([]),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export type EntryType = z.infer<typeof entryTypeSchema>;
export type EntryDTO = z.infer<typeof entryDTOSchema>;
export type CreateEntryInput = z.input<typeof createEntryInputSchema>;
export type UpdateEntryInput = z.input<typeof updateEntryInputSchema>;
export type EntryFilter = z.input<typeof entryFilterSchema>;
