import { z } from "zod";
import {
  dateSchema,
  paginationInputSchema,
  uuidSchema,
  utcDateTimeSchema,
} from "./common";
import { decisionEvidenceLinkSchema } from "./decisions";
import { evidenceLinkSchema } from "./diagnoses";
import { procedureEventSchema } from "./procedures";

export const sourceTypeSchema = z.enum([
  "visit_note",
  "imaging_report",
  "lab_report",
  "generated_report",
  "literature",
  "upload",
  "other",
]);

export const sourceMutationSchema = z.object({
  title: z.string().min(1).max(240),
  source_type: sourceTypeSchema,
  source_date: dateSchema.optional(),
  provider: z.string().max(240).optional(),
  citation: z.string().max(12000).optional(),
  summary: z.string().max(12000).optional(),
  tags: z.array(z.string().min(1).max(120)).default([]),
  url: z.string().url().optional(),
});

export const createSourceInputSchema = sourceMutationSchema;
export const updateSourceInputSchema = sourceMutationSchema.partial().extend({
  id: uuidSchema,
});

export const sourceFilterSchema = paginationInputSchema.extend({
  source_type: sourceTypeSchema.optional(),
  tag: z.string().max(120).optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
});

export const sourceSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  title: z.string(),
  source_type: sourceTypeSchema,
  source_date: dateSchema.nullable(),
  provider: z.string().nullable(),
  citation: z.string().nullable(),
  summary: z.string().nullable(),
  tags: z.array(z.string()),
  url: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const linkSourceToEventInputSchema = z.object({
  source_id: uuidSchema,
  event_id: uuidSchema,
});

export const linkSourceToDiagnosisInputSchema = z.object({
  source_id: uuidSchema,
  diagnosis_id: uuidSchema,
  direction: z.enum(["supports", "weakens", "neutral", "pending"]),
  note: z.string().max(12000).optional(),
});

export const linkSourceToDecisionInputSchema = z.object({
  source_id: uuidSchema,
  decision_id: uuidSchema,
  note: z.string().max(12000).optional(),
});

export const attachFileToSourceInputSchema = z.object({
  source_id: uuidSchema,
  attachment_id: uuidSchema,
  label: z.string().max(120).optional(),
});

export const sourceLinksSchema = z.object({
  source_id: uuidSchema,
  events: z.array(procedureEventSchema),
  diagnoses: z.array(evidenceLinkSchema),
  decisions: z.array(decisionEvidenceLinkSchema),
});

export type Source = z.infer<typeof sourceSchema>;
export type SourceType = z.infer<typeof sourceTypeSchema>;
export type SourceLinks = z.infer<typeof sourceLinksSchema>;
export type CreateSourceInput = z.input<typeof createSourceInputSchema>;
export type UpdateSourceInput = z.input<typeof updateSourceInputSchema>;
export type SourceFilter = z.input<typeof sourceFilterSchema>;
export type LinkSourceToEventInput = z.input<
  typeof linkSourceToEventInputSchema
>;
export type LinkSourceToDiagnosisInput = z.input<
  typeof linkSourceToDiagnosisInputSchema
>;
export type LinkSourceToDecisionInput = z.input<
  typeof linkSourceToDecisionInputSchema
>;
export type AttachFileToSourceInput = z.input<
  typeof attachFileToSourceInputSchema
>;
