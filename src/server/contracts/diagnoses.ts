import { z } from "zod";
import { paginationInputSchema, utcDateTimeSchema, uuidSchema } from "./common";

export const diagnosisStatusSchema = z.enum([
  "unreviewed",
  "suspected",
  "supported",
  "weakened",
  "ruled_out",
  "confirmed",
  "monitoring",
]);

export const diagnosisConfidenceSchema = z.enum([
  "unknown",
  "low",
  "moderate",
  "high",
]);

export const evidenceDirectionSchema = z.enum([
  "supports",
  "weakens",
  "neutral",
  "pending",
]);

export const evidenceLinkedTypeSchema = z.enum([
  "entry",
  "event",
  "attachment",
  "source",
  "decision",
  "vasomotor_measurement",
  "medication_response",
  "diagnosis",
]);

export const diagnosisMutationSchema = z.object({
  parent_diagnosis_id: uuidSchema.optional(),
  title: z.string().min(1).max(240),
  status: diagnosisStatusSchema,
  confidence: diagnosisConfidenceSchema,
  summary: z.string().max(12000).optional(),
  why_considered: z.string().max(12000).optional(),
  evidence_for: z.string().max(12000).optional(),
  evidence_against: z.string().max(12000).optional(),
  tests_needed: z.string().max(12000).optional(),
  treatment_implications: z.string().max(12000).optional(),
  open_questions: z.array(z.string().min(1).max(400)).default([]),
  last_reviewed_at: utcDateTimeSchema.optional(),
});

export const createDiagnosisInputSchema = diagnosisMutationSchema;

export const updateDiagnosisInputSchema = diagnosisMutationSchema
  .partial()
  .extend({
    id: uuidSchema,
  });

export const diagnosisFilterSchema = paginationInputSchema.extend({
  status: diagnosisStatusSchema.optional(),
  confidence: diagnosisConfidenceSchema.optional(),
  parent_diagnosis_id: uuidSchema.optional(),
});

export const evidenceLinkMutationSchema = z.object({
  diagnosis_id: uuidSchema,
  linked_type: evidenceLinkedTypeSchema,
  linked_id: uuidSchema,
  direction: evidenceDirectionSchema,
  note: z.string().max(12000).optional(),
});

export const createEvidenceLinkInputSchema = evidenceLinkMutationSchema;

export const updateEvidenceLinkInputSchema = evidenceLinkMutationSchema
  .partial()
  .extend({
    id: uuidSchema,
  });

export const evidenceLinkFilterSchema = paginationInputSchema.extend({
  diagnosis_id: uuidSchema,
});

export const mergeDiagnosisNodesInputSchema = z.object({
  source_diagnosis_ids: z.array(uuidSchema).min(1),
  target_diagnosis_id: uuidSchema,
  rationale: z.string().min(1).max(12000),
});

export const splitDiagnosisNodeInputSchema = z.object({
  source_diagnosis_id: uuidSchema,
  new_nodes: z.array(diagnosisMutationSchema).min(1),
  rationale: z.string().min(1).max(12000),
});

export const diagnosisNodeSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  parent_diagnosis_id: uuidSchema.nullable(),
  title: z.string(),
  status: diagnosisStatusSchema,
  confidence: diagnosisConfidenceSchema,
  summary: z.string().nullable(),
  why_considered: z.string().nullable(),
  evidence_for: z.string().nullable(),
  evidence_against: z.string().nullable(),
  tests_needed: z.string().nullable(),
  treatment_implications: z.string().nullable(),
  open_questions: z.array(z.string()),
  last_reviewed_at: utcDateTimeSchema.nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const evidenceLinkSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  diagnosis_id: uuidSchema,
  linked_type: evidenceLinkedTypeSchema,
  linked_id: uuidSchema,
  direction: evidenceDirectionSchema,
  note: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const diagnosisMergeResultSchema = z.object({
  target: diagnosisNodeSchema,
  merged_sources: z.array(diagnosisNodeSchema),
  evidence_links_moved: z.number().int().min(0),
});

export const diagnosisSplitResultSchema = z.object({
  source: diagnosisNodeSchema,
  created_nodes: z.array(diagnosisNodeSchema),
});

export type DiagnosisNode = z.infer<typeof diagnosisNodeSchema>;
export type EvidenceLink = z.infer<typeof evidenceLinkSchema>;
export type CreateDiagnosisInput = z.input<typeof createDiagnosisInputSchema>;
export type UpdateDiagnosisInput = z.input<typeof updateDiagnosisInputSchema>;
export type DiagnosisFilter = z.input<typeof diagnosisFilterSchema>;
export type CreateEvidenceLinkInput = z.input<
  typeof createEvidenceLinkInputSchema
>;
export type UpdateEvidenceLinkInput = z.input<
  typeof updateEvidenceLinkInputSchema
>;
export type EvidenceLinkFilter = z.input<typeof evidenceLinkFilterSchema>;
export type MergeDiagnosisNodesInput = z.input<
  typeof mergeDiagnosisNodesInputSchema
>;
export type SplitDiagnosisNodeInput = z.input<
  typeof splitDiagnosisNodeInputSchema
>;
export type DiagnosisMergeResult = z.infer<typeof diagnosisMergeResultSchema>;
export type DiagnosisSplitResult = z.infer<typeof diagnosisSplitResultSchema>;
