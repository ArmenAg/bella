import { z } from "zod";
import {
  dateSchema,
  paginationInputSchema,
  utcDateTimeSchema,
  uuidSchema,
} from "./common";

export const decisionStatusSchema = z.enum([
  "open",
  "waiting_on_test",
  "waiting_on_clinician",
  "decided",
  "rejected",
  "revisiting",
]);

export const decisionOptionSchema = z.object({
  label: z.string().min(1).max(240),
  notes: z.string().max(4000).optional(),
});

export const decisionMutationSchema = z.object({
  title: z.string().min(1).max(240),
  status: decisionStatusSchema,
  question: z.string().min(1).max(4000),
  options: z.array(decisionOptionSchema).default([]),
  evidence_for: z.string().max(12000).optional(),
  evidence_against: z.string().max(12000).optional(),
  risks: z.string().max(12000).optional(),
  what_would_change: z.string().max(12000).optional(),
  owner: z.string().max(240).optional(),
  target_date: dateSchema.optional(),
  final_decision: z.string().max(12000).optional(),
  rationale: z.string().max(12000).optional(),
});

export const createDecisionInputSchema = decisionMutationSchema;

export const updateDecisionInputSchema = decisionMutationSchema
  .partial()
  .extend({
    id: uuidSchema,
  });

export const linkDecisionEvidenceInputSchema = z.object({
  decision_id: uuidSchema,
  linked_type: z.enum([
    "entry",
    "event",
    "attachment",
    "source",
    "diagnosis",
    "vasomotor_measurement",
  ]),
  linked_id: uuidSchema,
  note: z.string().max(12000).optional(),
});

export const decisionFilterSchema = paginationInputSchema.extend({
  status: decisionStatusSchema.optional(),
  open_only: z.boolean().optional(),
  target_date_from: dateSchema.optional(),
  target_date_to: dateSchema.optional(),
});

export const decisionSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  title: z.string(),
  status: decisionStatusSchema,
  question: z.string(),
  options: z.array(decisionOptionSchema),
  evidence_for: z.string().nullable(),
  evidence_against: z.string().nullable(),
  risks: z.string().nullable(),
  what_would_change: z.string().nullable(),
  owner: z.string().nullable(),
  target_date: dateSchema.nullable(),
  final_decision: z.string().nullable(),
  rationale: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const decisionEvidenceLinkSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  decision_id: uuidSchema,
  linked_type: linkDecisionEvidenceInputSchema.shape.linked_type,
  linked_id: uuidSchema,
  note: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export type Decision = z.infer<typeof decisionSchema>;
export type DecisionEvidenceLink = z.infer<typeof decisionEvidenceLinkSchema>;
export type CreateDecisionInput = z.input<typeof createDecisionInputSchema>;
export type UpdateDecisionInput = z.input<typeof updateDecisionInputSchema>;
export type DecisionFilter = z.input<typeof decisionFilterSchema>;
export type LinkDecisionEvidenceInput = z.input<
  typeof linkDecisionEvidenceInputSchema
>;
