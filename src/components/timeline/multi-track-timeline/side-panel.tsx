"use client";

import * as React from "react";
import Link from "next/link";
import {
  Activity,
  Beaker,
  Calendar,
  CircleDashed,
  Crosshair,
  Flag,
  Pill,
  Stethoscope,
  X,
} from "lucide-react";
import { format as formatDate, parseISO, isValid } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

import type { DayEvent, TimelineSeries } from "./types";
import { dayKey, groupByDay } from "./scale";
import { dxStatusTextClass } from "./event-tracks";

export interface SidePanelProps {
  selectedIso: string | null;
  series: TimelineSeries;
  onClose: () => void;
  /** When true, render as a bottom Sheet (mobile). When false, render as a sticky right column. */
  asSheet?: boolean;
}

export function SidePanel({
  selectedIso,
  series,
  onClose,
  asSheet = false,
}: SidePanelProps) {
  const events = React.useMemo(() => {
    if (!selectedIso) return [];
    const map = groupByDay(series);
    return map.get(dayKey(selectedIso)) ?? [];
  }, [selectedIso, series]);

  const dayLabel = React.useMemo(() => {
    if (!selectedIso) return "";
    const d = parseISO(selectedIso);
    return isValid(d) ? formatDate(d, "PPPP") : "";
  }, [selectedIso]);

  const painEntry = events.find(
    (e): e is Extract<DayEvent, { kind: "pain_entry" }> =>
      e.kind === "pain_entry",
  );

  if (asSheet) {
    return (
      <Sheet
        open={selectedIso != null}
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
      >
        <SheetContent
          side="bottom"
          className="max-h-[80vh] overflow-y-auto rounded-t-lg p-0"
        >
          <SheetHeader>
            <SheetTitle>
              {dayLabel || strings.timelineSeries.sidePanel.title}
            </SheetTitle>
          </SheetHeader>
          <div className="px-4 pb-6">
            <PanelBody events={events} painEntry={painEntry} />
          </div>
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <aside
      className={cn(
        "hidden w-full shrink-0 rounded-md border border-border bg-card/60 lg:block lg:w-[300px]",
        selectedIso ? "lg:sticky lg:top-4" : null,
      )}
      aria-live="polite"
    >
      <div className="flex items-start justify-between gap-2 border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {strings.timelineSeries.sidePanel.title}
          </p>
          <p className="truncate text-sm font-semibold">
            {dayLabel || strings.timelineSeries.sidePanel.empty}
          </p>
        </div>
        {selectedIso ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7 shrink-0"
            onClick={onClose}
            aria-label={strings.timelineSeries.sidePanel.close}
          >
            <X aria-hidden="true" className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <div className="px-3 py-3">
        {selectedIso ? (
          <PanelBody events={events} painEntry={painEntry} />
        ) : (
          <p className="text-xs text-muted-foreground">
            {strings.timelineSeries.sidePanel.hint}
          </p>
        )}
      </div>
    </aside>
  );
}

function PanelBody({
  events,
  painEntry,
}: {
  events: DayEvent[];
  painEntry: Extract<DayEvent, { kind: "pain_entry" }> | undefined;
}) {
  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        {strings.timelineSeries.sidePanel.noEvents}
      </p>
    );
  }
  // De-prioritize duplicate cards: render pain block once at top, then
  // everything else.
  const otherEvents = events.filter((e) => e.kind !== "pain_entry");

  return (
    <div className="flex flex-col gap-3">
      {painEntry ? (
        <div className="rounded-md border border-border bg-background px-3 py-2">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {strings.timelineSeries.sidePanel.painSummary}
          </p>
          <div className="mt-1 grid grid-cols-3 gap-2 text-center">
            <PainStat
              label={strings.timelineSeries.pain.peak}
              value={painEntry.payload.pain_peak}
            />
            <PainStat
              label={strings.timelineSeries.pain.current}
              value={painEntry.payload.pain_current}
            />
            <PainStat
              label={strings.timelineSeries.pain.average}
              value={painEntry.payload.pain_average}
            />
          </div>
          {painEntry.payload.is_flare ? (
            <div className="mt-2">
              <Badge variant="destructive">
                {strings.timelineSeries.sidePanel.flareBadge}
              </Badge>
            </div>
          ) : null}
        </div>
      ) : null}

      <ul className="flex flex-col gap-2">
        {otherEvents.map((event) => (
          <li key={eventKey(event)}>
            <EventCard event={event} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function PainStat({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rounded-sm bg-muted/40 px-1 py-1.5">
      <p className="text-base font-semibold tabular-nums leading-tight">
        {value == null ? "—" : value.toFixed(0)}
      </p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function eventKey(event: DayEvent): string {
  switch (event.kind) {
    case "pain_entry":
      return `pain:${event.payload.entry_id}`;
    case "flare_session":
      return `flare:${event.payload.id}`;
    case "medication":
      return `med:${event.payload.id}:${event.boundary}`;
    case "procedure":
      return `proc:${event.payload.id}`;
    case "consult":
      return `consult:${event.payload.id}`;
    case "diagnostic_milestone":
      return `dx:${event.payload.id}`;
    case "decision":
      return `decision:${event.payload.id}:${event.boundary}`;
  }
}

/**
 * Map an event onto the existing detail-edit page in the app. We don't
 * import from @/server here — the URLs are stable convention.
 */
function eventDetailHref(event: DayEvent): string | null {
  switch (event.kind) {
    case "pain_entry":
      return `/pain-book/${event.payload.entry_id}/edit`;
    case "flare_session":
      // Flare sessions don't have a dedicated edit route yet; Flare Mode
      // is the live view.
      return null;
    case "medication":
      return `/medications/${event.payload.id}/edit`;
    case "procedure":
      return `/procedures/${event.payload.id}/edit`;
    case "consult":
      return `/procedures/${event.payload.id}/edit`;
    case "diagnostic_milestone":
      // Diagnostic detail page convention.
      return null;
    case "decision":
      return `/decisions/${event.payload.id}/edit`;
  }
}

function EventCard({ event }: { event: DayEvent }) {
  const href = eventDetailHref(event);
  const inner = renderEventBody(event);
  const className = cn(
    "flex flex-col gap-0.5 rounded-md border border-border bg-background px-3 py-2 text-sm",
    href ? "transition-colors hover:bg-muted/40" : null,
  );
  if (href) {
    return (
      <Link
        href={href}
        className={cn(
          className,
          "block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        )}
      >
        {inner}
      </Link>
    );
  }
  return <div className={className}>{inner}</div>;
}

function renderEventBody(event: DayEvent): React.ReactNode {
  switch (event.kind) {
    case "flare_session":
      return (
        <>
          <Header
            icon={<Activity className="h-3.5 w-3.5" aria-hidden="true" />}
            label={strings.timelineSeries.sidePanel.flareKind}
          />
          <p className="font-medium">{event.payload.title}</p>
          {event.payload.peak_pain != null ? (
            <p className="text-xs text-muted-foreground">
              {strings.timelineSeries.pain.peak}: {event.payload.peak_pain}
            </p>
          ) : null}
        </>
      );
    case "medication":
      return (
        <>
          <Header
            icon={<Pill className="h-3.5 w-3.5" aria-hidden="true" />}
            label={
              event.boundary === "start"
                ? strings.timelineSeries.sidePanel.medStarted
                : strings.timelineSeries.sidePanel.medEnded
            }
          />
          <p className="font-medium">
            {event.payload.name}
            {event.payload.dose ? (
              <span className="ml-1 text-muted-foreground">
                {event.payload.dose}
              </span>
            ) : null}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {event.payload.status}
          </p>
        </>
      );
    case "procedure":
      return (
        <>
          <Header
            icon={iconForProcedureKind(event.payload.kind)}
            label={
              strings.timeline.itemTypes[event.payload.kind] ??
              strings.timelineSeries.tracks.procedures
            }
          />
          <p className="font-medium">{event.payload.title}</p>
          {event.payload.summary ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {event.payload.summary}
            </p>
          ) : null}
        </>
      );
    case "consult":
      return (
        <>
          <Header
            icon={<Stethoscope className="h-3.5 w-3.5" aria-hidden="true" />}
            label={strings.timelineSeries.tracks.consults}
          />
          <p className="font-medium">{event.payload.purpose}</p>
          <p className="text-xs text-muted-foreground">
            {[event.payload.provider, event.payload.specialty]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </>
      );
    case "diagnostic_milestone":
      return (
        <>
          <Header
            icon={<CircleDashed className="h-3.5 w-3.5" aria-hidden="true" />}
            label={strings.timelineSeries.tracks.diagnosticMilestones}
          />
          <p
            className={cn(
              "font-medium",
              dxStatusTextClass(event.payload.status_to),
            )}
          >
            {event.payload.diagnosis_name}
          </p>
          <p className="text-xs text-muted-foreground capitalize">
            {strings.diagnoses.statuses[event.payload.status_to]}
          </p>
          {event.payload.notes ? (
            <p className="line-clamp-2 text-xs text-muted-foreground">
              {event.payload.notes}
            </p>
          ) : null}
        </>
      );
    case "decision":
      return (
        <>
          <Header
            icon={<Flag className="h-3.5 w-3.5" aria-hidden="true" />}
            label={
              event.boundary === "decided"
                ? strings.timelineSeries.sidePanel.decisionDecided
                : strings.timelineSeries.sidePanel.decisionTarget
            }
          />
          <p className="font-medium">{event.payload.title}</p>
          <p className="text-xs text-muted-foreground capitalize">
            {event.payload.status}
          </p>
        </>
      );
    case "pain_entry":
      // Pain entries are summarized at the top of the panel; if multiple
      // entries land on a single day, render the additional ones as cards.
      return (
        <>
          <Header
            icon={<Crosshair className="h-3.5 w-3.5" aria-hidden="true" />}
            label={strings.timeline.itemTypes.pain_entry}
          />
          <p className="text-xs text-muted-foreground">
            {strings.timelineSeries.pain.peak}: {event.payload.pain_peak ?? "—"}{" "}
            · {strings.timelineSeries.pain.current}:{" "}
            {event.payload.pain_current ?? "—"}
          </p>
        </>
      );
  }
}

function Header({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wider text-muted-foreground">
      <span aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </div>
  );
}

function iconForProcedureKind(kind: string): React.ReactNode {
  switch (kind) {
    case "imaging":
      return <Calendar className="h-3.5 w-3.5" aria-hidden="true" />;
    case "test_lab":
      return <Beaker className="h-3.5 w-3.5" aria-hidden="true" />;
    case "injury":
      return <Crosshair className="h-3.5 w-3.5" aria-hidden="true" />;
    case "medication_change":
      return <Pill className="h-3.5 w-3.5" aria-hidden="true" />;
    case "procedure":
    default:
      return <Activity className="h-3.5 w-3.5" aria-hidden="true" />;
  }
}
