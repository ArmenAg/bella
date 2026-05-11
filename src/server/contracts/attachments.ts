import { z } from "zod";
import {
  MAX_UPLOAD_SIZE_BYTES,
  SIGNED_URL_TTL_SECONDS,
  paginationInputSchema,
  utcDateTimeSchema,
  uuidSchema,
} from "./common";

export const allowedMimeTypes = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
  "text/plain",
  "text/markdown",
  "application/zip",
  "application/x-zip-compressed",
] as const;

export const attachmentLinkedTypeSchema = z.enum([
  "entry",
  "event",
  "decision",
  "diagnosis",
  "appointment",
  "source",
  "vasomotor_measurement",
  "medication_response",
]);

export const allowedMimeTypeSchema = z.enum(allowedMimeTypes);

export const createUploadUrlInputSchema = z.object({
  file_name: z.string().min(1).max(240),
  mime_type: allowedMimeTypeSchema,
  size_bytes: z.number().int().min(1).max(MAX_UPLOAD_SIZE_BYTES),
  captured_at: utcDateTimeSchema.optional(),
  capture_timezone: z.string().max(120).optional(),
  description: z.string().max(4000).optional(),
});

export const createAttachmentInputSchema = createUploadUrlInputSchema.extend({
  file_path: z.string().min(1).max(1024),
  gps_stripped: z.boolean().default(false),
  metadata: z.record(z.unknown()).default({}),
});

export const linkAttachmentInputSchema = z.object({
  attachment_id: uuidSchema,
  linked_type: attachmentLinkedTypeSchema,
  linked_id: uuidSchema,
  label: z.string().max(120).optional(),
});

export const getSignedAttachmentUrlInputSchema = z.object({
  attachment_id: uuidSchema,
  expires_in_seconds: z
    .number()
    .int()
    .min(60)
    .max(15 * 60)
    .default(SIGNED_URL_TTL_SECONDS),
});

export const attachmentFilterSchema = paginationInputSchema.extend({
  linked_type: attachmentLinkedTypeSchema.optional(),
  linked_id: uuidSchema.optional(),
  mime_type: allowedMimeTypeSchema.optional(),
});

export const attachmentDTOSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  user_id: uuidSchema,
  bucket_id: z.string(),
  file_path: z.string(),
  file_name: z.string(),
  mime_type: allowedMimeTypeSchema,
  size_bytes: z.number().int(),
  captured_at: utcDateTimeSchema.nullable(),
  capture_timezone: z.string().nullable(),
  description: z.string().nullable(),
  gps_stripped: z.boolean(),
  metadata: z.record(z.unknown()),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const attachmentLinkDTOSchema = z.object({
  id: uuidSchema,
  family_id: uuidSchema,
  attachment_id: uuidSchema,
  linked_type: attachmentLinkedTypeSchema,
  linked_id: uuidSchema,
  label: z.string().nullable(),
  created_at: utcDateTimeSchema,
  updated_at: utcDateTimeSchema,
  deleted_at: utcDateTimeSchema.nullable(),
});

export const uploadUrlDTOSchema = z.object({
  bucket_id: z.literal("bella-private-uploads"),
  file_path: z.string(),
  token: z.string(),
  signed_url: z.string().url(),
  expires_in_seconds: z.number().int(),
  required_post_upload_action: z.literal("createAttachment"),
});

export const signedAttachmentUrlDTOSchema = z.object({
  signed_url: z.string().url(),
  expires_at: utcDateTimeSchema,
});

export type CreateUploadUrlInput = z.input<typeof createUploadUrlInputSchema>;
export type CreateAttachmentInput = z.input<typeof createAttachmentInputSchema>;
export type LinkAttachmentInput = z.input<typeof linkAttachmentInputSchema>;
export type GetSignedAttachmentUrlInput = z.input<
  typeof getSignedAttachmentUrlInputSchema
>;
export type AttachmentLinkedType = z.infer<typeof attachmentLinkedTypeSchema>;
export type AttachmentFilter = z.input<typeof attachmentFilterSchema>;
export type AttachmentDTO = z.infer<typeof attachmentDTOSchema>;
export type AttachmentLinkDTO = z.infer<typeof attachmentLinkDTOSchema>;
