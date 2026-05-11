import { randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { PRIVATE_UPLOAD_BUCKET } from "@/server/supabase/config";
import {
  SIGNED_URL_TTL_SECONDS,
  allowedMimeTypes,
  attachmentDTOSchema,
  attachmentLinkDTOSchema,
  createAttachmentInputSchema,
  createUploadUrlInputSchema,
  getSignedAttachmentUrlInputSchema,
  linkAttachmentInputSchema,
  signedAttachmentUrlDTOSchema,
  uploadUrlDTOSchema,
  type AttachmentDTO,
  type CreateAttachmentInput,
  type CreateUploadUrlInput,
  type GetSignedAttachmentUrlInput,
  type LinkAttachmentInput,
} from "@/server/contracts";
import { recordSoftDeleteReason } from "./audit";
import { assertCanWrite, requireCurrentProfile } from "./auth";
import { NotFoundError, UnsupportedMediaTypeError } from "./errors";

const ALLOWED_MIME_SET = new Set<string>(allowedMimeTypes);
const asciiDecoder = new TextDecoder("ascii");
const utf8LossyDecoder = new TextDecoder("utf-8", { fatal: false });

function sanitizeFileName(fileName: string) {
  return fileName
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^\.+/, "")
    .slice(0, 180);
}

function assertSafeStoragePath(path: string) {
  if (path.includes("..") || path.startsWith("/") || path.includes("\\")) {
    throw new Error("Invalid attachment storage path");
  }
}

function bytesStartWith(bytes: Uint8Array, signature: number[]) {
  if (bytes.length < signature.length) return false;
  for (let i = 0; i < signature.length; i += 1) {
    if (bytes[i] !== signature[i]) return false;
  }
  return true;
}

export function sniffMimeFromBytes(bytes: Uint8Array): string | null {
  if (bytesStartWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg";
  }

  if (bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png";
  }

  if (
    bytes.length >= 12 &&
    asciiDecoder.decode(bytes.slice(0, 4)) === "RIFF" &&
    asciiDecoder.decode(bytes.slice(8, 12)) === "WEBP"
  ) {
    return "image/webp";
  }

  if (bytes.length >= 5 && asciiDecoder.decode(bytes.slice(0, 5)) === "%PDF-") {
    return "application/pdf";
  }

  if (bytesStartWith(bytes, [0x50, 0x4b, 0x03, 0x04])) {
    return "application/zip";
  }

  if (bytes.length >= 12 && asciiDecoder.decode(bytes.slice(4, 8)) === "ftyp") {
    const brand = asciiDecoder.decode(bytes.slice(8, 12));
    return brand.includes("qt") ? "video/quicktime" : "video/mp4";
  }

  const textSample = utf8LossyDecoder.decode(bytes.slice(0, 512));

  if (!textSample.includes("\u0000")) {
    return "text/plain";
  }

  return null;
}

export function assertAllowedMimeType(mimeType: string) {
  if (!ALLOWED_MIME_SET.has(mimeType)) {
    throw new UnsupportedMediaTypeError(
      `Unsupported attachment mime type: ${mimeType}`,
    );
  }
}

export async function createUploadUrl(
  input: CreateUploadUrlInput,
  supabase: SupabaseClient,
) {
  const parsed = createUploadUrlInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  assertAllowedMimeType(parsed.mime_type);

  const safeName = sanitizeFileName(parsed.file_name);
  const filePath = `${profile.family_id}/${profile.id}/${randomUUID()}-${safeName}`;
  assertSafeStoragePath(filePath);

  const { data, error } = await supabase.storage
    .from(PRIVATE_UPLOAD_BUCKET)
    .createSignedUploadUrl(filePath);

  if (error) {
    throw error;
  }

  return uploadUrlDTOSchema.parse({
    bucket_id: PRIVATE_UPLOAD_BUCKET,
    file_path: filePath,
    token: data.token,
    signed_url: data.signedUrl,
    expires_in_seconds: SIGNED_URL_TTL_SECONDS,
    required_post_upload_action: "createAttachment",
  });
}

export async function createAttachment(
  input: CreateAttachmentInput,
  supabase: SupabaseClient,
): Promise<AttachmentDTO> {
  const parsed = createAttachmentInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);
  assertAllowedMimeType(parsed.mime_type);
  assertSafeStoragePath(parsed.file_path);

  if (!parsed.file_path.startsWith(`${profile.family_id}/`)) {
    throw new Error("Attachment path must be scoped to current family");
  }

  const { data, error } = await supabase
    .from("attachments")
    .insert({
      family_id: profile.family_id,
      user_id: profile.id,
      bucket_id: PRIVATE_UPLOAD_BUCKET,
      ...parsed,
    })
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return attachmentDTOSchema.parse(data);
}

export async function linkAttachment(
  input: LinkAttachmentInput,
  supabase: SupabaseClient,
) {
  const parsed = linkAttachmentInputSchema.parse(input);
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("attachment_links")
    .upsert(
      {
        family_id: profile.family_id,
        ...parsed,
        deleted_at: null,
      },
      { onConflict: "attachment_id,linked_type,linked_id" },
    )
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  return attachmentLinkDTOSchema.parse(data);
}

export async function getSignedAttachmentUrl(
  input: GetSignedAttachmentUrlInput,
  supabase: SupabaseClient,
) {
  const parsed = getSignedAttachmentUrlInputSchema.parse(input);

  const { data: attachment, error: attachmentError } = await supabase
    .from("attachments")
    .select("file_path,bucket_id")
    .eq("id", parsed.attachment_id)
    .is("deleted_at", null)
    .single();

  if (attachmentError) {
    throw attachmentError;
  }

  if (!attachment) {
    throw new NotFoundError("Attachment not found");
  }

  const row = attachment as { file_path: string; bucket_id: string };
  const { data, error } = await supabase.storage
    .from(row.bucket_id)
    .createSignedUrl(row.file_path, parsed.expires_in_seconds);

  if (error) {
    throw error;
  }

  return signedAttachmentUrlDTOSchema.parse({
    signed_url: data.signedUrl,
    expires_at: new Date(
      Date.now() + parsed.expires_in_seconds * 1000,
    ).toISOString(),
  });
}

export async function softDeleteAttachment(
  id: string,
  reason: string,
  supabase: SupabaseClient,
): Promise<AttachmentDTO> {
  const profile = await requireCurrentProfile(supabase);
  assertCanWrite(profile);

  const { data, error } = await supabase
    .from("attachments")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .select("*")
    .single();

  if (error) {
    throw error;
  }

  await recordSoftDeleteReason("attachments", id, reason, supabase);

  return attachmentDTOSchema.parse(data);
}
