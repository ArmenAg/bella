import { z } from "zod";
import { paginationInputSchema, utcDateTimeSchema, uuidSchema } from "./common";

export const recordAttributionInputSchema = z.object({
  subject_user_id: uuidSchema.optional(),
  entered_by_user_id: uuidSchema.optional(),
});

export const recordAttributionSchema = z.object({
  subject_user_id: uuidSchema,
  entered_by_user_id: uuidSchema,
});

export const careTeamMemberMutationSchema = recordAttributionInputSchema.extend(
  {
    name: z.string().min(1).max(240),
    organization: z.string().max(240).optional(),
    specialty: z.string().max(240).optional(),
    role: z.string().max(240).optional(),
    portal_url: z.string().url().optional(),
    contact_notes: z.string().max(12000).optional(),
    manages: z.string().max(12000).optional(),
    manages_tags: z.array(z.string().min(1).max(120)).default([]),
    last_visit_at: utcDateTimeSchema.optional(),
    next_visit_at: utcDateTimeSchema.optional(),
    active: z.boolean().default(true),
    last_reviewed_at: utcDateTimeSchema.optional(),
    notes: z.string().max(12000).optional(),
  },
);

export const createCareTeamMemberInputSchema = careTeamMemberMutationSchema;
export const updateCareTeamMemberInputSchema = careTeamMemberMutationSchema
  .partial()
  .extend({ id: uuidSchema });

export const careTeamMemberFilterSchema = paginationInputSchema.extend({
  subject_user_id: uuidSchema.optional(),
  active: z.boolean().optional(),
  specialty: z.string().max(240).optional(),
  manages_tag: z.string().max(120).optional(),
});

export const careTeamMemberSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  subject_user_id: uuidSchema,
  entered_by_user_id: uuidSchema,
  name: z.string(),
  organization: z.string().nullable(),
  specialty: z.string().nullable(),
  role: z.string().nullable(),
  portal_url: z.string().nullable(),
  contact_notes: z.string().nullable(),
  manages: z.string().nullable(),
  manages_tags: z.array(z.string()),
  last_visit_at: utcDateTimeSchema.nullable(),
  next_visit_at: utcDateTimeSchema.nullable(),
  active: z.boolean(),
  last_reviewed_at: utcDateTimeSchema.nullable(),
  notes: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const avoidContraindicationCategorySchema = z.enum([
  "allergy",
  "medication_intolerance",
  "procedure_precaution",
  "physical_do_not",
  "care_context_warning",
]);

export const avoidContraindicationSeveritySchema = z.enum([
  "info",
  "low",
  "moderate",
  "high",
  "critical",
]);

export const avoidContraindicationMutationSchema =
  recordAttributionInputSchema.extend({
    category: avoidContraindicationCategorySchema,
    severity: avoidContraindicationSeveritySchema.default("moderate"),
    title: z.string().min(1).max(240),
    reaction_description: z.string().max(12000).optional(),
    evidence_source: z.string().max(12000).optional(),
    source_id: uuidSchema.optional(),
    active: z.boolean().default(true),
    last_reviewed_at: utcDateTimeSchema.optional(),
    notes: z.string().max(12000).optional(),
  });

export const createAvoidContraindicationInputSchema =
  avoidContraindicationMutationSchema;
export const updateAvoidContraindicationInputSchema =
  avoidContraindicationMutationSchema.partial().extend({ id: uuidSchema });

export const avoidContraindicationFilterSchema = paginationInputSchema.extend({
  subject_user_id: uuidSchema.optional(),
  category: avoidContraindicationCategorySchema.optional(),
  severity: avoidContraindicationSeveritySchema.optional(),
  active: z.boolean().optional(),
  source_id: uuidSchema.optional(),
});

export const avoidContraindicationSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  subject_user_id: uuidSchema,
  entered_by_user_id: uuidSchema,
  category: avoidContraindicationCategorySchema,
  severity: avoidContraindicationSeveritySchema,
  title: z.string(),
  reaction_description: z.string().nullable(),
  evidence_source: z.string().nullable(),
  source_id: uuidSchema.nullable(),
  active: z.boolean(),
  last_reviewed_at: utcDateTimeSchema.nullable(),
  notes: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const caseSummaryStatusSchema = z.enum([
  "draft",
  "active",
  "superseded",
  "retired",
]);

export const caseSummaryVersionMutationSchema =
  recordAttributionInputSchema.extend({
    summary_text: z.string().min(1).max(20000),
    calibration_note: z.string().max(12000).optional(),
    status: caseSummaryStatusSchema.default("draft"),
    authored_by_text: z.string().max(240).optional(),
    reviewed_by_text: z.string().max(240).optional(),
    reviewed_at: utcDateTimeSchema.optional(),
    source_note: z.string().max(12000).optional(),
  });

export const createCaseSummaryVersionInputSchema =
  caseSummaryVersionMutationSchema;
export const updateCaseSummaryVersionInputSchema =
  caseSummaryVersionMutationSchema.partial().extend({ id: uuidSchema });

export const caseSummaryVersionFilterSchema = paginationInputSchema.extend({
  subject_user_id: uuidSchema.optional(),
  status: caseSummaryStatusSchema.optional(),
});

export const caseSummaryVersionSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  subject_user_id: uuidSchema,
  entered_by_user_id: uuidSchema,
  summary_text: z.string(),
  calibration_note: z.string().nullable(),
  status: caseSummaryStatusSchema,
  authored_by_text: z.string().nullable(),
  reviewed_by_text: z.string().nullable(),
  reviewed_at: utcDateTimeSchema.nullable(),
  source_note: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const emergencyPacketReviewMutationSchema =
  recordAttributionInputSchema.extend({
    reviewed_by_user_id: uuidSchema.optional(),
    reviewed_at: utcDateTimeSchema.optional(),
    notes: z.string().max(12000).optional(),
  });

export const createEmergencyPacketReviewInputSchema =
  emergencyPacketReviewMutationSchema;
export const updateEmergencyPacketReviewInputSchema =
  emergencyPacketReviewMutationSchema.partial().extend({ id: uuidSchema });

export const emergencyPacketReviewFilterSchema = paginationInputSchema.extend({
  subject_user_id: uuidSchema.optional(),
});

export const emergencyPacketReviewSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  subject_user_id: uuidSchema,
  entered_by_user_id: uuidSchema,
  reviewed_by_user_id: uuidSchema.nullable(),
  reviewed_at: utcDateTimeSchema,
  notes: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const emergencyPacketRequestSchema = z.object({
  subject_user_id: uuidSchema.optional(),
  generated_at: utcDateTimeSchema.optional(),
});

export const emergencyPacketSectionSchema = z.enum([
  "case_summary",
  "current_medications",
  "allergies_intolerances",
  "avoid_contraindications",
  "care_team",
  "last_reviewed",
]);

export const emergencyPacketSourceMapItemSchema = z.object({
  section: emergencyPacketSectionSchema,
  source_table: z.string(),
  source_id: uuidSchema.nullable(),
  reviewed_at: utcDateTimeSchema.nullable(),
});

export const emergencyPacketMedicationSchema = z.object({
  id: uuidSchema,
  name: z.string(),
  dose: z.string().nullable(),
  route: z.string().nullable(),
  frequency: z.string().nullable(),
  prescriber: z.string().nullable(),
  status: z.string(),
  reason: z.string().nullable(),
});

export const emergencyPacketSchema = z.object({
  id: uuidSchema,
  packet_type: z.literal("emergency"),
  generated_at: utcDateTimeSchema,
  subject_user_id: uuidSchema,
  last_reviewed_at: utcDateTimeSchema.nullable(),
  markdown: z.string(),
  case_summary: caseSummaryVersionSchema.nullable(),
  current_medications: z.array(emergencyPacketMedicationSchema),
  allergies_intolerances: z.array(avoidContraindicationSchema),
  avoid_contraindications: z.array(avoidContraindicationSchema),
  care_team: z.array(careTeamMemberSchema),
  source_map: z.array(emergencyPacketSourceMapItemSchema),
});

export type RecordAttributionInput = z.input<
  typeof recordAttributionInputSchema
>;
export type RecordAttribution = z.infer<typeof recordAttributionSchema>;
export type CareTeamMember = z.infer<typeof careTeamMemberSchema>;
export type CreateCareTeamMemberInput = z.input<
  typeof createCareTeamMemberInputSchema
>;
export type UpdateCareTeamMemberInput = z.input<
  typeof updateCareTeamMemberInputSchema
>;
export type CareTeamMemberFilter = z.input<typeof careTeamMemberFilterSchema>;
export type AvoidContraindication = z.infer<typeof avoidContraindicationSchema>;
export type CreateAvoidContraindicationInput = z.input<
  typeof createAvoidContraindicationInputSchema
>;
export type UpdateAvoidContraindicationInput = z.input<
  typeof updateAvoidContraindicationInputSchema
>;
export type AvoidContraindicationFilter = z.input<
  typeof avoidContraindicationFilterSchema
>;
export type CaseSummaryVersion = z.infer<typeof caseSummaryVersionSchema>;
export type CreateCaseSummaryVersionInput = z.input<
  typeof createCaseSummaryVersionInputSchema
>;
export type UpdateCaseSummaryVersionInput = z.input<
  typeof updateCaseSummaryVersionInputSchema
>;
export type CaseSummaryVersionFilter = z.input<
  typeof caseSummaryVersionFilterSchema
>;
export type EmergencyPacketReview = z.infer<typeof emergencyPacketReviewSchema>;
export type CreateEmergencyPacketReviewInput = z.input<
  typeof createEmergencyPacketReviewInputSchema
>;
export type UpdateEmergencyPacketReviewInput = z.input<
  typeof updateEmergencyPacketReviewInputSchema
>;
export type EmergencyPacketReviewFilter = z.input<
  typeof emergencyPacketReviewFilterSchema
>;
export type EmergencyPacketRequest = z.input<
  typeof emergencyPacketRequestSchema
>;
export type EmergencyPacket = z.infer<typeof emergencyPacketSchema>;
