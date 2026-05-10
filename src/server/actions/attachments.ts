"use server";

import type {
  CreateAttachmentInput,
  CreateUploadUrlInput,
  GetSignedAttachmentUrlInput,
  LinkAttachmentInput,
} from "@/server/contracts";
import {
  createAttachment as createAttachmentService,
  createUploadUrl as createUploadUrlService,
  getSignedAttachmentUrl as getSignedAttachmentUrlService,
  linkAttachment as linkAttachmentService,
  softDeleteAttachment as softDeleteAttachmentService,
} from "@/server/services/attachments";
import { createSupabaseServerClient } from "@/server/supabase/client";
import { toActionResult } from "./result";

export async function createUploadUrl(input: CreateUploadUrlInput) {
  return toActionResult(async () =>
    createUploadUrlService(input, await createSupabaseServerClient()),
  );
}

export async function createAttachment(input: CreateAttachmentInput) {
  return toActionResult(async () =>
    createAttachmentService(input, await createSupabaseServerClient()),
  );
}

export async function linkAttachment(input: LinkAttachmentInput) {
  return toActionResult(async () =>
    linkAttachmentService(input, await createSupabaseServerClient()),
  );
}

export async function getSignedAttachmentUrl(
  input: GetSignedAttachmentUrlInput,
) {
  return toActionResult(async () =>
    getSignedAttachmentUrlService(input, await createSupabaseServerClient()),
  );
}

export async function softDeleteAttachment(id: string, reason: string) {
  return toActionResult(async () =>
    softDeleteAttachmentService(id, reason, await createSupabaseServerClient()),
  );
}
