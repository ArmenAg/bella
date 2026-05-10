import { ListChecks } from "lucide-react";

import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { MultiTrackTimeline } from "@/components/timeline/multi-track-timeline";
import { TimelineFilters } from "@/components/timeline/timeline-filters";
import type { TimelineItemTypeKey } from "@/components/timeline/timeline-filters";
import { TimelineList } from "@/components/timeline/timeline-list";
import { TimelineViewToggle } from "@/components/timeline/timeline-view-toggle";
import type { TimelineView } from "@/components/timeline/timeline-view-toggle";

import { listDiagnoses } from "@/server/actions/diagnoses";
import { listReferenceData } from "@/server/actions/reference";
import { listTimelineItems } from "@/server/actions/timeline";
import { getTimelineSeries } from "@/server/actions/timeline-series";
import type { TimelineFilter, TimelineSeriesFilter } from "@/server/contracts";

import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

const ITEM_TYPE_KEYS: ReadonlySet<string> = new Set([
  "injury",
  "procedure",
  "imaging",
  "test_lab",
  "consult",
  "medication_change",
  "flare",
  "pain_entry",
  "log_entry",
  "uploaded_media",
  "decision",
  "appointment",
  "diagnosis_update",
  "source",
  "export_packet",
  "vasomotor_measurement",
]);

const PAGE_SIZE = 50;

interface TimelinePageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickString(
  params: Record<string, string | string[] | undefined>,
  key: string,
): string | null {
  const raw = params[key];
  if (Array.isArray(raw)) return raw[0] ?? null;
  return typeof raw === "string" && raw.length > 0 ? raw : null;
}

function pickBool(
  params: Record<string, string | string[] | undefined>,
  key: string,
): boolean {
  const value = pickString(params, key);
  return value === "1" || value === "true";
}

function pickItemType(
  params: Record<string, string | string[] | undefined>,
): TimelineItemTypeKey | null {
  const value = pickString(params, "item_type");
  if (value && ITEM_TYPE_KEYS.has(value)) {
    return value as TimelineItemTypeKey;
  }
  return null;
}

function pickView(
  params: Record<string, string | string[] | undefined>,
): TimelineView {
  const value = pickString(params, "view");
  return value === "feed" ? "feed" : "timeline";
}

export default async function TimelinePage({
  searchParams,
}: TimelinePageProps) {
  const params = await searchParams;

  const view = pickView(params);
  const dateFrom = pickString(params, "date_from");
  const dateTo = pickString(params, "date_to");

  if (view === "timeline") {
    const seriesFilter: TimelineSeriesFilter = {
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
    };
    const seriesResult = await getTimelineSeries(seriesFilter);

    return (
      <div className="flex flex-col gap-6">
        <PageHeader
          title={strings.timeline.title}
          description={strings.timeline.subtitleTimeline}
        />

        <TimelineViewToggle current="timeline" />

        {!seriesResult.ok ? (
          <ErrorState message={seriesResult.error.message} />
        ) : isSeriesEmpty(seriesResult.data) ? (
          <EmptyState
            icon={ListChecks}
            title={strings.timeline.list.empty.title}
            description={strings.timeline.list.empty.body}
          />
        ) : (
          <MultiTrackTimeline series={seriesResult.data} />
        )}
      </div>
    );
  }

  // Feed view — preserves the existing behavior unchanged.
  const itemType = pickItemType(params);
  const bodyRegionId = pickString(params, "body_region_id");
  const symptomId = pickString(params, "symptom_id");
  const triggerId = pickString(params, "trigger_id");
  const branchId = pickString(params, "diagnostic_branch_id");
  const flareOnly = pickBool(params, "flare_only");
  const mediaOnly = pickBool(params, "media_only");

  const filter: TimelineFilter = {
    page_size: PAGE_SIZE,
    ...(dateFrom ? { date_from: dateFrom } : {}),
    ...(dateTo ? { date_to: dateTo } : {}),
    ...(itemType ? { item_type: itemType } : {}),
    ...(bodyRegionId ? { body_region_id: bodyRegionId } : {}),
    ...(symptomId ? { symptom_id: symptomId } : {}),
    ...(triggerId ? { trigger_id: triggerId } : {}),
    ...(branchId ? { diagnostic_branch_id: branchId } : {}),
    ...(flareOnly ? { flare_only: true } : {}),
    ...(mediaOnly ? { media_only: true } : {}),
  };

  const [timelineResult, referenceResult, branchesResult] = await Promise.all([
    listTimelineItems(filter),
    listReferenceData(),
    listDiagnoses({ page_size: 200 }),
  ]);

  const branches = branchesResult.ok ? branchesResult.data.items : [];
  const referenceData = referenceResult.ok
    ? referenceResult.data
    : { body_regions: [], symptoms: [], triggers: [] };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.timeline.title}
        description={strings.timeline.subtitleFeed}
      />

      <TimelineViewToggle current="feed" />

      <TimelineFilters
        bodyRegions={referenceData.body_regions}
        symptoms={referenceData.symptoms}
        triggers={referenceData.triggers}
        branches={branches}
        initial={{
          date_from: dateFrom,
          date_to: dateTo,
          item_type: itemType,
          body_region_id: bodyRegionId,
          symptom_id: symptomId,
          trigger_id: triggerId,
          diagnostic_branch_id: branchId,
          flare_only: flareOnly,
          media_only: mediaOnly,
        }}
      />

      {!timelineResult.ok ? (
        <ErrorState message={timelineResult.error.message} />
      ) : timelineResult.data.items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={strings.timeline.list.empty.title}
          description={strings.timeline.list.empty.body}
        />
      ) : (
        <TimelineList
          initialItems={timelineResult.data.items}
          initialCursor={timelineResult.data.next_cursor}
          initialMetadata={timelineResult.data.metadata}
          pageSize={timelineResult.data.page_size}
          filter={filter}
        />
      )}
    </div>
  );
}

function isSeriesEmpty(series: {
  pain_points: unknown[];
  medications: unknown[];
  procedures: unknown[];
  consults: unknown[];
  decisions: unknown[];
  diagnostic_milestones: unknown[];
  flare_sessions: unknown[];
}): boolean {
  return (
    series.pain_points.length === 0 &&
    series.medications.length === 0 &&
    series.procedures.length === 0 &&
    series.consults.length === 0 &&
    series.decisions.length === 0 &&
    series.diagnostic_milestones.length === 0 &&
    series.flare_sessions.length === 0
  );
}
