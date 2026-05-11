import { z } from "zod";
import { dateSchema, utcDateTimeSchema, uuidSchema } from "./common";

export const exportPacketKindSchema = z.enum(["clinician_visit", "emergency"]);

export const exportPacketRequestSchema = z.object({
  packet_kind: exportPacketKindSchema.default("clinician_visit"),
  subject_user_id: uuidSchema.optional(),
  date_from: dateSchema.optional(),
  date_to: dateSchema.optional(),
  diagnostic_branch_id: uuidSchema.optional(),
  body_region_id: uuidSchema.optional(),
  care_team_member_id: uuidSchema.optional(),
  flares_only: z.boolean().default(false),
  include_photos: z.boolean().default(false),
  include_procedure_summaries: z.boolean().default(true),
  include_soft_deleted: z.boolean().default(false),
  clinician_questions: z.array(z.string().min(1).max(400)).default([]),
});

export const bulkExportRequestSchema = z.object({
  format: z.enum(["json", "csv"]).default("json"),
  include_uploaded_files: z.boolean().default(true),
  include_generated_export_packets: z.boolean().default(true),
  include_soft_deleted: z.boolean().default(false),
  requested_at: utcDateTimeSchema.optional(),
});

export const exportPacketSchema = z.object({
  id: uuidSchema,
  packet_kind: exportPacketKindSchema.default("clinician_visit"),
  generated_at: utcDateTimeSchema,
  markdown: z.string(),
  included_attachment_ids: z.array(uuidSchema),
  filters: exportPacketRequestSchema,
});

export const exportFileManifestItemSchema = z.object({
  attachment_id: uuidSchema,
  bucket_id: z.string(),
  file_path: z.string(),
  file_name: z.string(),
  mime_type: z.string(),
  size_bytes: z.number().int(),
  captured_at: utcDateTimeSchema.nullable(),
  description: z.string().nullable(),
});

export const bulkExportSchema = z.object({
  id: uuidSchema,
  generated_at: utcDateTimeSchema,
  request: bulkExportRequestSchema,
  format: z.enum(["json", "csv"]),
  manifest_version: z.literal(1),
  tables: z.record(z.array(z.record(z.unknown()))),
  csv_tables: z.record(z.string()),
  uploaded_file_manifest: z.array(exportFileManifestItemSchema),
  generated_packets: z.array(exportPacketSchema),
  restore_notes: z.array(z.string()),
  limitations: z.array(z.string()),
});

export type ExportPacketRequest = z.input<typeof exportPacketRequestSchema>;
export type BulkExportRequest = z.input<typeof bulkExportRequestSchema>;
export type ExportPacket = z.infer<typeof exportPacketSchema>;
export type ExportFileManifestItem = z.infer<
  typeof exportFileManifestItemSchema
>;
export type BulkExport = z.infer<typeof bulkExportSchema>;
