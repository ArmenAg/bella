"use server";

import { getTimelineSeries as getTimelineSeriesService } from "@/server/services/timeline-series";
import { createSupabaseServerClient } from "@/server/supabase/client";
import type { TimelineSeries, TimelineSeriesFilter } from "@/server/contracts";
import { toActionResult, type ActionResult } from "./result";

export async function getTimelineSeries(
  input: TimelineSeriesFilter,
): Promise<ActionResult<TimelineSeries>> {
  return toActionResult(async () =>
    getTimelineSeriesService(input, await createSupabaseServerClient()),
  );
}
