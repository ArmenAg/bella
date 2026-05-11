import { z } from "zod";
import { paginationInputSchema, utcDateTimeSchema, uuidSchema } from "./common";

export const aiImportSessionStatusSchema = z.enum([
  "drafting",
  "ready_for_review",
  "committed",
  "failed",
  "rejected",
]);

export const aiImportDraftStatusSchema = z.enum([
  "proposed",
  "committed",
  "rejected",
  "failed",
]);

export const aiImportTargetTypeSchema = z.enum([
  "entry",
  "procedure_event",
  "source",
  "medication",
  "medication_response",
  "appointment",
  "task",
  "decision",
]);

export const aiImportConfidenceSchema = z.enum(["high", "medium", "low"]);

export const aiImportEvidenceSpanSchema = z.object({
  field: z.string().min(1).max(240),
  quote: z.string().min(1).max(2000),
});

export const aiImportValidationIssueSchema = z.object({
  path: z.string(),
  message: z.string(),
});

export const aiImportDraftPayloadSchema = z.record(z.string(), z.unknown());

export const aiImportExtractedDraftSchema = z.object({
  target_type: aiImportTargetTypeSchema,
  proposed_payload: aiImportDraftPayloadSchema,
  confidence: aiImportConfidenceSchema,
  missing_fields: z.array(z.string().min(1).max(240)).default([]),
  evidence_spans: z.array(aiImportEvidenceSpanSchema).default([]),
  warnings: z.array(z.string().min(1).max(1000)).default([]),
});

export const aiImportExtractionResultSchema = z.object({
  drafts: z.array(aiImportExtractedDraftSchema).max(25),
});

export const createAiImportSessionInputSchema = z.object({
  input_text: z.string().trim().min(1).max(200000),
  input_label: z.string().trim().min(1).max(240).optional(),
  source_id: uuidSchema.optional(),
  requested_target_types: z.array(aiImportTargetTypeSchema).default([]),
});

export const analyzeAiImportSessionInputSchema = z.object({
  session_id: uuidSchema,
});

export const analyzeAiImportTextInputSchema =
  createAiImportSessionInputSchema.extend({
    model: z.string().trim().min(1).max(120).optional(),
  });

export const updateAiImportDraftInputSchema = z.object({
  id: uuidSchema,
  target_type: aiImportTargetTypeSchema.optional(),
  proposed_payload: aiImportDraftPayloadSchema.optional(),
  confidence: aiImportConfidenceSchema.optional(),
  missing_fields: z.array(z.string().min(1).max(240)).optional(),
  evidence_spans: z.array(aiImportEvidenceSpanSchema).optional(),
  warnings: z.array(z.string().min(1).max(1000)).optional(),
});

export const rejectAiImportDraftInputSchema = z.object({
  id: uuidSchema,
  reason: z.string().trim().min(1).max(2000),
});

export const commitAiImportDraftInputSchema = z.object({
  id: uuidSchema,
});

export const aiImportSessionFilterSchema = paginationInputSchema.extend({
  status: aiImportSessionStatusSchema.optional(),
  agent_thread_id: uuidSchema.optional(),
});

export const aiImportDraftFilterSchema = paginationInputSchema.extend({
  session_id: uuidSchema.optional(),
  status: aiImportDraftStatusSchema.optional(),
  target_type: aiImportTargetTypeSchema.optional(),
  agent_thread_id: uuidSchema.optional(),
});

export const aiImportSessionSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  source_id: uuidSchema.nullable(),
  agent_thread_id: uuidSchema.nullable(),
  input_label: z.string().nullable(),
  raw_text: z.string(),
  requested_target_types: z.array(aiImportTargetTypeSchema),
  status: aiImportSessionStatusSchema,
  model: z.string().nullable(),
  prompt_version: z.string(),
  error_message: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const aiImportDraftSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  session_id: uuidSchema,
  agent_thread_id: uuidSchema.nullable(),
  target_type: aiImportTargetTypeSchema,
  status: aiImportDraftStatusSchema,
  title: z.string().nullable(),
  proposed_payload: aiImportDraftPayloadSchema,
  confidence: aiImportConfidenceSchema,
  missing_fields: z.array(z.string()),
  evidence_spans: z.array(aiImportEvidenceSpanSchema),
  warnings: z.array(z.string()),
  validation_errors: z.array(aiImportValidationIssueSchema),
  committed_entity_type: aiImportTargetTypeSchema.nullable(),
  committed_entity_id: uuidSchema.nullable(),
  committed_at: utcDateTimeSchema.nullable(),
  rejected_reason: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const aiImportSessionWithDraftsSchema = z.object({
  session: aiImportSessionSchema,
  drafts: z.array(aiImportDraftSchema),
});

export const aiImportCommitResultSchema = z.object({
  draft: aiImportDraftSchema,
  committed_entity_type: aiImportTargetTypeSchema,
  committed_entity_id: uuidSchema,
});

export type AiImportSessionStatus = z.infer<typeof aiImportSessionStatusSchema>;
export type AiImportDraftStatus = z.infer<typeof aiImportDraftStatusSchema>;
export type AiImportTargetType = z.infer<typeof aiImportTargetTypeSchema>;
export type AiImportConfidence = z.infer<typeof aiImportConfidenceSchema>;
export type AiImportEvidenceSpan = z.infer<typeof aiImportEvidenceSpanSchema>;
export type AiImportValidationIssue = z.infer<
  typeof aiImportValidationIssueSchema
>;
export type AiImportExtractedDraft = z.infer<
  typeof aiImportExtractedDraftSchema
>;
export type AiImportExtractionResult = z.infer<
  typeof aiImportExtractionResultSchema
>;
export type CreateAiImportSessionInput = z.input<
  typeof createAiImportSessionInputSchema
>;
export type AnalyzeAiImportSessionInput = z.input<
  typeof analyzeAiImportSessionInputSchema
>;
export type AnalyzeAiImportTextInput = z.input<
  typeof analyzeAiImportTextInputSchema
>;
export type UpdateAiImportDraftInput = z.input<
  typeof updateAiImportDraftInputSchema
>;
export type RejectAiImportDraftInput = z.input<
  typeof rejectAiImportDraftInputSchema
>;
export type CommitAiImportDraftInput = z.input<
  typeof commitAiImportDraftInputSchema
>;
export type AiImportSessionFilter = z.input<typeof aiImportSessionFilterSchema>;
export type AiImportDraftFilter = z.input<typeof aiImportDraftFilterSchema>;
export type AiImportSession = z.infer<typeof aiImportSessionSchema>;
export type AiImportDraft = z.infer<typeof aiImportDraftSchema>;
export type AiImportSessionWithDrafts = z.infer<
  typeof aiImportSessionWithDraftsSchema
>;
export type AiImportCommitResult = z.infer<typeof aiImportCommitResultSchema>;
