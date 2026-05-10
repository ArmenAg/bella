"use server";

import { listTimelineItems as listTimelineItemsService } from "@/server/services/timeline";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type { TimelineFilter, TimelinePage } from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function listTimelineItems(
  input: TimelineFilter,
): Promise<ActionResult<TimelinePage>> {
  return toActionResult(async () =>
    listTimelineItemsService(input, await createSupabaseServerClient()),
  );
}
