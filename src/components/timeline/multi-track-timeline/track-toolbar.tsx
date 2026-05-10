"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

import type { TrackVisibility, ZoomKey } from "./types";

export interface TrackToolbarProps {
  zoom: ZoomKey;
  onZoomChange: (zoom: ZoomKey) => void;
  visibility: TrackVisibility;
  onVisibilityChange: (next: TrackVisibility) => void;
}

const ZOOM_ORDER: ZoomKey[] = ["all", "5y", "1y", "6mo", "3mo"];

const ZOOM_LABEL: Record<ZoomKey, keyof typeof strings.timelineSeries.zoom> = {
  all: "all",
  "5y": "fiveYears",
  "1y": "oneYear",
  "6mo": "sixMonths",
  "3mo": "threeMonths",
};

interface VisibilityRow {
  id: keyof TrackVisibility;
  label: string;
  /** Pain track is mandatory; we still render the checkbox but disabled. */
  locked?: boolean;
}

export function TrackToolbar({
  zoom,
  onZoomChange,
  visibility,
  onVisibilityChange,
}: TrackToolbarProps) {
  const visibilityRows: VisibilityRow[] = [
    { id: "pain", label: strings.timelineSeries.tracks.pain, locked: true },
    {
      id: "medications",
      label: strings.timelineSeries.tracks.medications,
    },
    { id: "procedures", label: strings.timelineSeries.tracks.procedures },
    { id: "consults", label: strings.timelineSeries.tracks.consults },
    {
      id: "diagnostic_milestones",
      label: strings.timelineSeries.tracks.diagnosticMilestones,
    },
    { id: "decisions", label: strings.timelineSeries.tracks.decisions },
    {
      id: "flare_bands",
      label: strings.timelineSeries.tracks.flareBands,
    },
  ];

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card/40 px-3 py-2 sm:flex-row sm:items-center sm:justify-between">
      <div
        role="group"
        aria-label={strings.timelineSeries.zoom.groupLabel}
        className="flex flex-wrap items-center gap-1"
      >
        {ZOOM_ORDER.map((key) => {
          const active = zoom === key;
          return (
            <Button
              key={key}
              type="button"
              size="sm"
              variant={active ? "default" : "outline"}
              aria-pressed={active}
              onClick={() => onZoomChange(key)}
              className={cn(
                "h-7 px-2 text-xs",
                active ? "shadow-sm" : "border-border",
              )}
            >
              {strings.timelineSeries.zoom[ZOOM_LABEL[key]]}
            </Button>
          );
        })}
      </div>

      <fieldset
        aria-label={strings.timelineSeries.tracks.showLabel}
        className="flex flex-wrap items-center gap-x-3 gap-y-1.5"
      >
        <legend className="sr-only">
          {strings.timelineSeries.tracks.showLabel}
        </legend>
        <span className="text-xs uppercase tracking-wider text-muted-foreground">
          {strings.timelineSeries.tracks.showLabel}
        </span>
        {visibilityRows.map((row) => {
          const checked =
            row.id === "pain" ? true : Boolean(visibility[row.id]);
          return (
            <label
              key={row.id}
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 text-xs text-foreground",
                row.locked ? "cursor-not-allowed opacity-70" : null,
              )}
            >
              <Checkbox
                checked={checked}
                disabled={row.locked}
                onCheckedChange={(v) => {
                  if (row.locked) return;
                  if (row.id === "pain") return;
                  onVisibilityChange({
                    ...visibility,
                    [row.id]: Boolean(v),
                  });
                }}
                aria-label={row.label}
              />
              <span>{row.label}</span>
            </label>
          );
        })}
      </fieldset>
    </div>
  );
}
