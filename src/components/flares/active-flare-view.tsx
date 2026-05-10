"use client";

import * as React from "react";
import { Pencil } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

import { FlareCheckpointForm } from "./flare-checkpoint-form";
import { EndFlareDialog } from "./end-flare-dialog";
import { FlareEditSheet } from "./flare-edit-sheet";
import { FlareVasomotorSheet } from "./flare-vasomotor-sheet";

import { formatDateTime, formatRelative, formatTime } from "@/lib/format";
import { strings } from "@/lib/strings";
import type {
  BodyRegionDTO,
  FlareCheckpointDTO,
  FlareSessionDTO,
  SymptomDTO,
  TriggerDTO,
} from "@/server/contracts";

export interface ActiveFlareViewProps {
  session: FlareSessionDTO;
  bodyRegions: BodyRegionDTO[];
  symptoms: SymptomDTO[];
  triggers: TriggerDTO[];
  canWrite: boolean;
  /** Called with the resulting session right after End flare succeeds. */
  onEnded?: (ended: FlareSessionDTO) => void;
}

function lookupName<T extends { id: string; name: string }>(
  items: ReadonlyArray<T>,
  id: string,
): string | undefined {
  return items.find((item) => item.id === id)?.name;
}

function CheckpointRow({ checkpoint }: { checkpoint: FlareCheckpointDTO }) {
  const labels = strings.flare.checkpoint.checkpointTypes;
  return (
    <li className="flex flex-col gap-1 rounded-md border border-border bg-card px-3 py-2.5">
      <div className="flex items-center gap-2 text-xs">
        <Badge variant="outline">{labels[checkpoint.checkpoint_type]}</Badge>
        <span className="text-muted-foreground">
          {formatTime(checkpoint.checkpoint_at)}
        </span>
        <span className="text-muted-foreground">·</span>
        <span className="text-muted-foreground">
          {formatRelative(checkpoint.checkpoint_at)}
        </span>
        {checkpoint.pain_score != null ? (
          <Badge variant="muted">Pain {checkpoint.pain_score}</Badge>
        ) : null}
      </div>
      {checkpoint.notes ? (
        <p className="whitespace-pre-wrap text-sm leading-6">
          {checkpoint.notes}
        </p>
      ) : null}
    </li>
  );
}

export function ActiveFlareView({
  session,
  bodyRegions,
  symptoms,
  triggers,
  canWrite,
  onEnded,
}: ActiveFlareViewProps) {
  const [editOpen, setEditOpen] = React.useState(false);
  const [endOpen, setEndOpen] = React.useState(false);
  const [photoSheetOpen, setPhotoSheetOpen] = React.useState(false);

  const entry = session.entry;
  const activeStrings = strings.flare.active;

  const sortedCheckpoints = React.useMemo(
    () =>
      [...session.checkpoints].sort(
        (a, b) => Date.parse(b.checkpoint_at) - Date.parse(a.checkpoint_at),
      ),
    [session.checkpoints],
  );

  return (
    <div className="flex flex-col gap-5">
      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            <CardTitle>{entry.title || activeStrings.summaryTitle}</CardTitle>
            <p className="text-xs text-muted-foreground">
              {activeStrings.startedAt} {formatDateTime(entry.occurred_at)} ·{" "}
              {formatRelative(entry.occurred_at)}
            </p>
          </div>
          {canWrite ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setEditOpen(true)}
              aria-label={activeStrings.edit}
            >
              <Pencil aria-hidden="true" className="h-4 w-4" />
              {activeStrings.edit}
            </Button>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap gap-1.5">
            {entry.pain_peak != null ? (
              <Badge variant="destructive">
                {activeStrings.peak} {entry.pain_peak}
              </Badge>
            ) : null}
            {entry.pain_current != null ? (
              <Badge variant="primary">
                {activeStrings.now} {entry.pain_current}
              </Badge>
            ) : null}
          </div>

          {entry.body_region_ids.length > 0 ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {activeStrings.regions}
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

          {entry.trigger_ids.length > 0 ? (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {activeStrings.triggers}
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

          {entry.notes ? (
            <p className="whitespace-pre-wrap text-sm leading-6 text-foreground">
              {entry.notes}
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{activeStrings.checkpointsTitle}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {canWrite ? (
            <>
              <FlareCheckpointForm session={session} />
              <Button
                type="button"
                variant="outline"
                onClick={() => setPhotoSheetOpen(true)}
                className="self-start"
              >
                {activeStrings.vasomotorAdd}
              </Button>
              <Separator />
            </>
          ) : null}
          {sortedCheckpoints.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {activeStrings.noCheckpoints}
            </p>
          ) : (
            <ul className="flex flex-col gap-2">
              {sortedCheckpoints.map((checkpoint) => (
                <CheckpointRow key={checkpoint.id} checkpoint={checkpoint} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {canWrite ? (
        <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="destructive"
            onClick={() => setEndOpen(true)}
          >
            {activeStrings.endFlare}
          </Button>
        </div>
      ) : null}

      {canWrite ? (
        <>
          <FlareEditSheet
            open={editOpen}
            onOpenChange={setEditOpen}
            session={session}
            bodyRegions={bodyRegions}
            symptoms={symptoms}
            triggers={triggers}
          />
          <EndFlareDialog
            open={endOpen}
            onOpenChange={setEndOpen}
            session={session}
            onEnded={(ended) => onEnded?.(ended)}
          />
          <FlareVasomotorSheet
            open={photoSheetOpen}
            onOpenChange={setPhotoSheetOpen}
            flareEntryId={entry.id}
          />
        </>
      ) : null}
    </div>
  );
}
