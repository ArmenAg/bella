"use client";

import * as React from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ErrorState } from "@/components/feedback/error-state";
import { TimelineRow } from "./timeline-row";
import {
  TimelineMonthHeader,
  monthKeyFor,
  monthLabelFor,
} from "./timeline-month-header";

import { listTimelineItems } from "@/server/actions/timeline";
import type {
  TimelineFilter,
  TimelineItem,
  TimelinePage,
} from "@/server/contracts";
import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";

export interface TimelineListProps {
  initialItems: TimelineItem[];
  initialCursor: string | null;
  initialMetadata: TimelinePage["metadata"];
  pageSize: number;
  filter: TimelineFilter;
}

export function TimelineList({
  initialItems,
  initialCursor,
  initialMetadata,
  pageSize,
  filter,
}: TimelineListProps) {
  const [items, setItems] = React.useState<TimelineItem[]>(initialItems);
  const [cursor, setCursor] = React.useState<string | null>(initialCursor);
  const [metadata, setMetadata] =
    React.useState<TimelinePage["metadata"]>(initialMetadata);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  // When the filter changes (parent re-renders with new initial props), reset
  // pagination state so we don't accumulate items across filter switches.
  React.useEffect(() => {
    setItems(initialItems);
    setCursor(initialCursor);
    setMetadata(initialMetadata);
    setError(null);
  }, [initialItems, initialCursor, initialMetadata]);

  const loadMore = async () => {
    if (!cursor || loading) return;
    setLoading(true);
    setError(null);
    try {
      const result = await listTimelineItems({
        ...filter,
        cursor,
        page_size: pageSize,
      });
      if (!result.ok) {
        setError(userFacingErrorMessage(result.error));
        return;
      }
      setItems((prev) => [...prev, ...result.data.items]);
      setCursor(result.data.next_cursor);
      setMetadata(result.data.metadata);
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.errors.generic);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {metadata.source_caps_hit.length > 0 ? (
        <Alert variant="warning">
          <AlertDescription>
            {strings.timeline.list.capWarning}
          </AlertDescription>
        </Alert>
      ) : null}

      {(() => {
        const groups: { key: string; label: string; items: TimelineItem[] }[] =
          [];
        for (const item of items) {
          const key = monthKeyFor(item.occurred_at);
          const last = groups[groups.length - 1];
          if (!last || last.key !== key) {
            groups.push({
              key,
              label: monthLabelFor(item.occurred_at),
              items: [item],
            });
          } else {
            last.items.push(item);
          }
        }
        return groups.map((group) => (
          <div key={group.key} className="mb-2">
            <TimelineMonthHeader label={group.label} />
            <ul className="flex flex-col divide-y divide-border rounded-md border border-border bg-card">
              {group.items.map((item) => (
                <li key={`${item.source_table}:${item.id}`}>
                  <TimelineRow item={item} />
                </li>
              ))}
            </ul>
          </div>
        ));
      })()}

      {error ? <ErrorState message={error} onRetry={loadMore} /> : null}

      {cursor ? (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={loadMore}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                {strings.timeline.list.loadingMore}
              </>
            ) : (
              strings.timeline.list.loadMore
            )}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
