import type { CreateUploadUrlInput } from "@/server/contracts";
import { allowedMimeTypes } from "@/server/contracts";

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024;

export type AttachmentMimeType = CreateUploadUrlInput["mime_type"];

const allowedSet = new Set<string>(allowedMimeTypes);

export function isAllowedMimeType(value: string): value is AttachmentMimeType {
  return allowedSet.has(value);
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function isImageMime(mime: string): boolean {
  return mime.startsWith("image/");
}

export function isVideoMime(mime: string): boolean {
  return mime.startsWith("video/");
}

export function isPdfMime(mime: string): boolean {
  return mime === "application/pdf";
}
