import { z } from "zod";
import { paginationInputSchema, utcDateTimeSchema, uuidSchema } from "./common";

export const timelineItemTypeSchema = z.enum([
  "injury",
  "procedure",
  "imaging",
  "test_lab",
  "consult",
  "medication_change",
  "flare",
  "pain_entry",
  "log_entry",
  "uploaded_media",
  "decision",
  "appointment",
  "diagnosis_update",
  "source",
  "export_packet",
  "vasomotor_measurement",
]);

export const timelineFilterSchema = paginationInputSchema.extend({
  date_from: utcDateTimeSchema.optional(),
  date_to: utcDateTimeSchema.optional(),
  item_type: timelineItemTypeSchema.optional(),
  body_region_id: uuidSchema.optional(),
  symptom_id: uuidSchema.optional(),
  trigger_id: uuidSchema.optional(),
  diagnostic_branch_id: uuidSchema.optional(),
  flare_only: z.boolean().optional(),
  media_only: z.boolean().optional(),
});

export const timelineItemSourceTableSchema = z.enum([
  "entries",
  "events",
  "appointments",
  "medications",
  "medication_responses",
  "decisions",
  "sources",
  "diagnoses",
  "attachments",
  "flare_checkpoints",
  "vasomotor_measurements",
]);

export const timelineSourceTableSchema = z.enum([
  ...timelineItemSourceTableSchema.options,
  "entry_regions",
  "entry_symptoms",
  "entry_triggers",
  "attachment_links",
  "evidence_links",
  "decision_evidence_links",
]);

export const timelineItemSchema = z.object({
  id: z.string(),
  source_table: timelineItemSourceTableSchema,
  source_id: uuidSchema,
  item_type: timelineItemTypeSchema,
  occurred_at: utcDateTimeSchema,
  ended_at: utcDateTimeSchema.nullable(),
  title: z.string(),
  summary: z.string().nullable(),
  body_region_ids: z.array(uuidSchema).default([]),
  symptom_ids: z.array(uuidSchema).default([]),
  trigger_ids: z.array(uuidSchema).default([]),
  diagnosis_ids: z.array(uuidSchema).default([]),
  attachment_ids: z.array(uuidSchema).default([]),
  evidence_count: z.number().int().min(0).default(0),
  metadata: z.record(z.unknown()).default({}),
});

export const timelineCapWarningSchema = z.object({
  code: z.literal("TIMELINE_SOURCE_CAP_HIT"),
  message: z.string(),
  source_tables: z.array(timelineSourceTableSchema),
});

export const timelineMetadataSchema = z.object({
  source_row_limit: z.number().int().min(1),
  source_caps_hit: z.array(timelineSourceTableSchema),
  warnings: z.array(timelineCapWarningSchema),
});

export const timelinePageSchema = z.object({
  items: z.array(timelineItemSchema),
  next_cursor: z.string().nullable(),
  page_size: z.number().int().min(1),
  metadata: timelineMetadataSchema,
});

export type TimelineItem = z.infer<typeof timelineItemSchema>;
export type TimelineFilter = z.input<typeof timelineFilterSchema>;
export type TimelineItemSourceTable = z.infer<
  typeof timelineItemSourceTableSchema
>;
export type TimelineSourceTable = z.infer<typeof timelineSourceTableSchema>;
export type TimelinePage = z.infer<typeof timelinePageSchema>;
