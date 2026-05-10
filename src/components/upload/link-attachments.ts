import { linkAttachment } from "@/server/actions/attachments";
import type { AttachmentLinkedType } from "@/server/contracts";

/**
 * Link a list of attachments to a newly-created entity. Used by forms that
 * collect attachments before the entity exists (e.g. new Pain entry).
 *
 * Resolves with the ids that succeeded so the caller can show partial-failure
 * UX without re-running the whole batch on retry.
 */
export async function linkAttachments(params: {
  attachmentIds: string[];
  linkedType: AttachmentLinkedType;
  linkedId: string;
}): Promise<{ linked: string[]; failed: string[] }> {
  const { attachmentIds, linkedType, linkedId } = params;
  const linked: string[] = [];
  const failed: string[] = [];
  for (const id of attachmentIds) {
    const result = await linkAttachment({
      attachment_id: id,
      linked_type: linkedType,
      linked_id: linkedId,
    });
    if (result.ok) {
      linked.push(id);
    } else {
      failed.push(id);
    }
  }
  return { linked, failed };
}
