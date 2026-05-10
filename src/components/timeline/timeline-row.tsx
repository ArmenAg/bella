import * as React from "react";
import Link from "next/link";
import { Paperclip } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { strings, format as formatString } from "@/lib/strings";
import { formatDateTime, formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";

import type { TimelineItem } from "@/server/contracts";

function detailHrefFor(item: TimelineItem): string | null {
  switch (item.item_type) {
    case "pain_entry": {
      const isFreeform = item.metadata?.entry_type === "freeform";
      return isFreeform
        ? `/log-book/${item.source_id}/edit`
        : `/pain-book/${item.source_id}/edit`;
    }
    case "log_entry":
      return `/log-book/${item.source_id}/edit`;
    case "flare":
      // Flares may be modeled as entries with type=flare or as flare_sessions.
      // The pain-book edit route handles entry-backed flares; flare_sessions
      // do not have a public detail page yet (Flare Mode is the live view).
      if (item.source_table === "entries") {
        return `/pain-book/${item.source_id}/edit`;
      }
      return null;
    case "vasomotor_measurement":
      return `/vasomotor/${item.source_id}/edit`;
    case "decision":
      return `/decisions/${item.source_id}/edit`;
    case "appointment":
      return `/schedule/${item.source_id}/edit`;
    case "procedure":
    case "imaging":
    case "test_lab":
    case "consult":
    case "injury":
      return `/procedures/${item.source_id}/edit`;
    case "medication_change":
      // Could be a medications row or a medication_responses row. The
      // medications detail route is owned by another agent — link
      // conservatively only when the source_table is medications.
      if (item.source_table === "medications") {
        return `/medications/${item.source_id}/edit`;
      }
      return null;
    default:
      // source / diagnosis_update / uploaded_media / export_packet etc. —
      // no dedicated detail page yet, render text only.
      return null;
  }
}

export interface TimelineRowProps {
  item: TimelineItem;
}

function pluralLabel(
  count: number,
  singularTemplate: string,
  pluralTemplate: string,
): string {
  return formatString(count === 1 ? singularTemplate : pluralTemplate, {
    count,
  });
}

function timelineDate(iso: string): string {
  const ageMs = Date.now() - new Date(iso).getTime();
  const days = ageMs / 86_400_000;
  return days <= 14 ? formatRelative(iso) : formatDateTime(iso);
}

export function TimelineRow({ item }: TimelineRowProps) {
  const typeLabel =
    strings.timeline.itemTypes[
      item.item_type as keyof typeof strings.timeline.itemTypes
    ] ?? item.item_type;

  const href = detailHrefFor(item);
  const regionCount = item.body_region_ids?.length ?? 0;
  const symptomCount = item.symptom_ids?.length ?? 0;
  const triggerCount = item.trigger_ids?.length ?? 0;
  const attachmentCount = item.attachment_ids?.length ?? 0;
  const evidenceCount = item.evidence_count ?? 0;

  const summarySegments: string[] = [];
  if (regionCount > 0) {
    summarySegments.push(
      pluralLabel(
        regionCount,
        strings.timeline.row.regionsSingular,
        strings.timeline.row.regions,
      ),
    );
  }
  if (symptomCount > 0) {
    summarySegments.push(
      pluralLabel(
        symptomCount,
        strings.timeline.row.symptomsSingular,
        strings.timeline.row.symptoms,
      ),
    );
  }
  if (triggerCount > 0) {
    summarySegments.push(
      pluralLabel(
        triggerCount,
        strings.timeline.row.triggersSingular,
        strings.timeline.row.triggers,
      ),
    );
  }

  const inner = (
    <div
      className={cn(
        "flex flex-col gap-1.5 px-3 py-3 sm:px-4",
        href ? "transition-colors hover:bg-muted/40" : null,
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-baseline sm:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-muted-foreground">
          <Badge variant="muted">{typeLabel}</Badge>
          <span>{timelineDate(item.occurred_at)}</span>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          {summarySegments.length > 0 ? (
            <span className="text-xs text-muted-foreground">
              {summarySegments.join(" · ")}
            </span>
          ) : null}
          {evidenceCount > 0 ? (
            <Badge variant="primary">
              {formatString(strings.timeline.evidenceCount, {
                count: evidenceCount,
              })}
            </Badge>
          ) : null}
          {attachmentCount > 0 ? (
            <span
              className="inline-flex items-center text-muted-foreground"
              aria-label={strings.timeline.row.attachmentsLabel}
              title={strings.timeline.row.attachmentsLabel}
            >
              <Paperclip aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
      </div>
      <p className="truncate text-sm font-semibold text-foreground">
        {item.title}
      </p>
      {item.summary ? (
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {item.summary}
        </p>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          "block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
        )}
      >
        {inner}
      </Link>
    );
  }
  return inner;
}
