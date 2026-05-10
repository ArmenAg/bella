import type { SupabaseClient } from "@supabase/supabase-js";
import { softDeleteReasonSchema } from "@/server/contracts";

export async function recordSoftDeleteReason(
  entityType: string,
  entityId: string,
  reason: string,
  supabase: SupabaseClient,
) {
  const parsedReason = softDeleteReasonSchema.parse(reason);
  const { error } = await supabase.rpc("record_soft_delete_reason", {
    target_entity_type: entityType,
    target_entity_id: entityId,
    delete_reason: parsedReason,
  });

  if (error) {
    throw error;
  }
}
