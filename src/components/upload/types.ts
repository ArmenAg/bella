import type { AttachmentDTO, CreateUploadUrlInput } from "@/server/contracts";

export type AttachmentMimeType = CreateUploadUrlInput["mime_type"];

/** Pending = local file mid-upload. Ready = createAttachment succeeded. */
export type AttachmentItem =
  | {
      kind: "pending";
      localId: string;
      file: File;
      progress: number;
      description: string;
    }
  | {
      kind: "ready";
      localId: string;
      attachment: AttachmentDTO;
      previewUrl?: string;
      description: string;
    }
  | {
      kind: "error";
      localId: string;
      file: File;
      message: string;
      description: string;
    };

export interface AttachmentUploaderHandle {
  /** Returns ids of all successfully created attachments. */
  getReadyAttachmentIds: () => string[];
  /** Whether any uploads are still in flight. */
  hasPendingUploads: () => boolean;
}
