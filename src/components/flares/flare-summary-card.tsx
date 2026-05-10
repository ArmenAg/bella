"use client";

import * as React from "react";
import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  formatDateTime,
  formatDurationMinutes,
  formatRelative,
  formatTime,
} from "@/lib/format";
import { strings } from "@/lib/strings";
import type {
  BodyRegionDTO,
  FlareSessionDTO,
  SymptomDTO,
  TriggerDTO,
} from "@/server/contracts";

export interface FlareSummaryCardProps {
  session: FlareSessionDTO;
  bodyRegions: BodyRegionDTO[];
  symptoms: SymptomDTO[];
  triggers: TriggerDTO[];
}

function lookupName<T extends { id: string; name: string }>(
  items: ReadonlyArray<T>,
  id: string,
): string | undefined {
  return items.find((item) => item.id === id)?.name;
}

export function FlareSummaryCard({
  session,
  bodyRegions,
  symptoms,
  triggers,
}: FlareSummaryCardProps) {
  const summary = strings.flare.summary;
  const checkpointTypeLabels = strings.flare.checkpoint.checkpointTypes;
  const entry = session.entry;
  const ended = entry.ended_at;

  const sortedCheckpoints = React.useMemo(
    () =>
      [...session.checkpoints].sort(
        (a, b) => Date.parse(a.checkpoint_at) - Date.parse(b.checkpoint_at),
      ),
    [session.checkpoints],
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity aria-hidden="true" className="h-4 w-4 text-destructive" />
          {summary.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm text-muted-foreground">{summary.subtitle}</p>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              {summary.started}
            </dt>
            <dd className="text-sm">{formatDateTime(entry.occurred_at)}</dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              {summary.ended}
            </dt>
            <dd className="text-sm">
              {ended ? formatDateTime(ended) : summary.ongoing}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              {summary.duration}
            </dt>
            <dd className="text-sm">
              {ended
                ? formatDurationMinutes(
                    Math.max(
                      0,
                      Math.round(
                        (Date.parse(ended) - Date.parse(entry.occurred_at)) /
                          60000,
                      ),
                    ),
                  )
                : formatRelative(entry.occurred_at)}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              {summary.recovery}
            </dt>
            <dd className="text-sm">
              {formatDurationMinutes(entry.recovery_minutes)}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              {summary.peak}
            </dt>
            <dd className="text-sm">
              {entry.pain_peak == null ? strings.common.none : entry.pain_peak}
            </dd>
          </div>
          <div className="flex flex-col gap-0.5">
            <dt className="text-xs uppercase tracking-wider text-muted-foreground">
              {summary.current}
            </dt>
            <dd className="text-sm">
              {entry.pain_current == null
                ? strings.common.none
                : entry.pain_current}
            </dd>
          </div>
        </dl>

        {entry.body_region_ids.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {summary.regions}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {entry.body_region_ids.map((id) => {
                const name = lookupName(bodyRegions, id);
                if (!name) return null;
                return (
                  <Badge key={id} variant="muted">
                    {name}
                  </Badge>
                );
              })}
            </div>
          </div>
        ) : null}

        {entry.symptom_ids.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {strings.flare.start.symptoms}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {entry.symptom_ids.map((id) => {
                const name = lookupName(symptoms, id);
                if (!name) return null;
                return (
                  <Badge key={id} variant="muted">
                    {name}
                  </Badge>
                );
              })}
            </div>
          </div>
        ) : null}

        {entry.trigger_ids.length > 0 ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {summary.triggers}
            </p>
            <div className="flex flex-wrap gap-1.5">
              {entry.trigger_ids.map((id) => {
                const name = lookupName(triggers, id);
                if (!name) return null;
                const isPrimary = id === entry.primary_trigger_id;
                return (
                  <Badge key={id} variant={isPrimary ? "primary" : "muted"}>
                    {name}
                  </Badge>
                );
              })}
            </div>
          </div>
        ) : null}

        {entry.response ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {summary.responseTitle}
            </p>
            <p className="text-sm leading-6">{entry.response}</p>
          </div>
        ) : null}

        {entry.notes ? (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {summary.notesTitle}
            </p>
            <p className="text-sm leading-6 whitespace-pre-wrap">
              {entry.notes}
            </p>
          </div>
        ) : null}

        <div className="flex flex-col gap-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {summary.checkpointsTitle} ({sortedCheckpoints.length})
          </p>
          {sortedCheckpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {strings.flare.active.noCheckpoints}
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {sortedCheckpoints.map((cp) => (
                <li
                  key={cp.id}
                  className="flex items-baseline gap-2 rounded-md bg-muted/30 px-2.5 py-1.5 text-sm"
                >
                  <Badge variant="outline">
                    {checkpointTypeLabels[cp.checkpoint_type]}
                  </Badge>
                  <span className="text-xs text-muted-foreground">
                    {formatTime(cp.checkpoint_at)}
                  </span>
                  {cp.pain_score != null ? (
                    <Badge variant="muted">{cp.pain_score}</Badge>
                  ) : null}
                  {cp.notes ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {cp.notes}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
