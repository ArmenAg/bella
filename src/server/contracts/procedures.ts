import { z } from "zod";
import { paginationInputSchema, utcDateTimeSchema, uuidSchema } from "./common";

export const procedureEventTypeSchema = z.enum([
  "procedure",
  "imaging",
  "test_lab",
  "consult",
  "procedure_test",
]);

export const procedureAnsweredQuestionSchema = z.enum([
  "yes",
  "no",
  "partially",
  "unclear",
]);

export const procedureEventMutationSchema = z.object({
  type: procedureEventTypeSchema.default("procedure_test"),
  occurred_at: utcDateTimeSchema,
  ended_at: utcDateTimeSchema.optional(),
  title: z.string().min(1).max(240),
  summary: z.string().max(12000).optional(),
  provider: z.string().max(240).optional(),
  location: z.string().max(400).optional(),
  source_id: uuidSchema.optional(),
  diagnostic_question: z.string().max(12000).optional(),
  baseline_before: z.string().max(12000).optional(),
  immediate_effect: z.string().max(12000).optional(),
  effect_24h: z.string().max(12000).optional(),
  effect_72h: z.string().max(12000).optional(),
  effect_1w: z.string().max(12000).optional(),
  effect_1m: z.string().max(12000).optional(),
  new_symptoms: z.string().max(12000).optional(),
  answered_question: procedureAnsweredQuestionSchema.optional(),
  repeat_recommendation: z.string().max(12000).optional(),
});

export const createProcedureEventInputSchema = procedureEventMutationSchema;
export const updateProcedureEventInputSchema = procedureEventMutationSchema
  .partial()
  .extend({
    id: uuidSchema,
  });

export const procedureEventFilterSchema = paginationInputSchema.extend({
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
  type: procedureEventTypeSchema.optional(),
  source_id: uuidSchema.optional(),
});

export const procedureEventSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  type: procedureEventTypeSchema,
  occurred_at: utcDateTimeSchema,
  ended_at: utcDateTimeSchema.nullable(),
  title: z.string(),
  summary: z.string().nullable(),
  provider: z.string().nullable(),
  location: z.string().nullable(),
  source_id: uuidSchema.nullable(),
  diagnostic_question: z.string().nullable(),
  baseline_before: z.string().nullable(),
  immediate_effect: z.string().nullable(),
  effect_24h: z.string().nullable(),
  effect_72h: z.string().nullable(),
  effect_1w: z.string().nullable(),
  effect_1m: z.string().nullable(),
  new_symptoms: z.string().nullable(),
  answered_question: procedureAnsweredQuestionSchema.nullable(),
  repeat_recommendation: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export type ProcedureEvent = z.infer<typeof procedureEventSchema>;
export type CreateProcedureEventInput = z.input<
  typeof createProcedureEventInputSchema
>;
export type UpdateProcedureEventInput = z.input<
  typeof updateProcedureEventInputSchema
>;
export type ProcedureEventFilter = z.input<typeof procedureEventFilterSchema>;
