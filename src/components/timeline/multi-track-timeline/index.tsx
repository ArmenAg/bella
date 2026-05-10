"use client";

import * as React from "react";
import { addDays, parseISO, isValid, formatISO } from "date-fns";

import { cn } from "@/lib/utils";

import { TrackToolbar } from "./track-toolbar";
import { PainTrack } from "./pain-track";
import { EventTracks } from "./event-tracks";
import { SidePanel } from "./side-panel";
import { computeWindow, makeTimeScale } from "./scale";
import type {
  TimelineSeries,
  TrackVisibility,
  VisibleWindow,
  ZoomKey,
} from "./types";

export type { TimelineSeries } from "./types";
export { MOCK_TIMELINE_SERIES } from "./mock";

export interface MultiTrackTimelineProps {
  series: TimelineSeries;
  defaultZoom?: ZoomKey;
}

const DEFAULT_VISIBILITY: TrackVisibility = {
  pain: true,
  medications: true,
  procedures: true,
  consults: true,
  diagnostic_milestones: true,
  decisions: true,
  flare_bands: true,
};

const MOBILE_BREAKPOINT = 1024; /* lg */
const LABEL_COL_WIDTH = 120; /* mirrored from event-tracks.tsx */

/**
 * Top-level multi-track timeline. Owns:
 *  - the visible window (driven by zoom presets)
 *  - hovered/selected day shared across pain track and event lanes
 *  - track visibility checkboxes
 *  - a single ResizeObserver-driven measured container; both children read
 *    width from us.
 *
 * The pain track stays mounted (rendered with `display: none` is a no-go for
 * Recharts — instead we keep it in the tree at full size).
 *
 * No data fetching here. Props-only.
 */
export function MultiTrackTimeline({
  series,
  defaultZoom = "1y",
}: MultiTrackTimelineProps) {
  const [zoom, setZoom] = React.useState<ZoomKey>(defaultZoom);
  const [visibility, setVisibility] =
    React.useState<TrackVisibility>(DEFAULT_VISIBILITY);
  const [hoveredIso, setHoveredIso] = React.useState<string | null>(null);
  const [selectedIso, setSelectedIso] = React.useState<string | null>(null);

  const windowRange = React.useMemo<VisibleWindow>(
    () => computeWindow({ series, zoom }),
    [series, zoom],
  );

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const [width, setWidth] = React.useState<number>(0);
  const [isMobile, setIsMobile] = React.useState<boolean>(false);

  // ResizeObserver — debounced via rAF so layout work doesn't pile up.
  React.useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    let frame: number | null = null;
    let nextWidth = el.clientWidth;
    let nextMobile = window.innerWidth < MOBILE_BREAKPOINT;

    const flush = () => {
      frame = null;
      setWidth((prev) => (prev === nextWidth ? prev : nextWidth));
      setIsMobile((prev) => (prev === nextMobile ? prev : nextMobile));
    };

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      nextWidth = Math.round(entry.contentRect.width);
      nextMobile = window.innerWidth < MOBILE_BREAKPOINT;
      if (frame == null) frame = requestAnimationFrame(flush);
    });
    ro.observe(el);
    // Seed initial measurements.
    setWidth(Math.round(el.clientWidth));
    setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);

    return () => {
      ro.disconnect();
      if (frame != null) cancelAnimationFrame(frame);
    };
  }, []);

  // Build the X scale used by both panels. We pass widthPx = the width of
  // the lane content area (full container minus left label column and
  // matching right padding to mirror the Recharts margin). This keeps the
  // SVG event tracks horizontally aligned with the chart's plotting area.
  const RIGHT_PADDING = 8;
  const trackContentWidth = Math.max(
    0,
    width - LABEL_COL_WIDTH - RIGHT_PADDING,
  );
  const xScale = React.useMemo(
    () =>
      makeTimeScale({
        fromIso: windowRange.from,
        toIso: windowRange.to,
        widthPx: Math.max(1, trackContentWidth),
      }),
    [windowRange.from, windowRange.to, trackContentWidth],
  );

  // Keyboard handlers: ←/→ shift selectedIso by 1 day; Esc closes the panel.
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        if (selectedIso) {
          e.preventDefault();
          setSelectedIso(null);
        }
        return;
      }
      if (!selectedIso) return;
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      const target = e.target as HTMLElement | null;
      if (
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return;
      }
      const cur = parseISO(selectedIso);
      if (!isValid(cur)) return;
      const next = addDays(cur, e.key === "ArrowRight" ? 1 : -1);
      e.preventDefault();
      setSelectedIso(formatISO(next));
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedIso]);

  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-start">
      <div className="flex min-w-0 flex-1 flex-col gap-3" ref={containerRef}>
        <TrackToolbar
          zoom={zoom}
          onZoomChange={setZoom}
          visibility={visibility}
          onVisibilityChange={setVisibility}
        />

        <div className="flex flex-col gap-2">
          {/* Pain track sits in its own card so the Recharts container has a
              guaranteed non-zero box. The label column on the SVG below
              aligns with the YAxis width on the chart (~28px) plus a small
              fudge — close enough for a multi-track read; not pixel-perfect
              with Recharts axis math. */}
          <div className="overflow-hidden rounded-md border border-border bg-card/40 px-2 py-2">
            <PainTrack
              painPoints={series.pain_points}
              flareSessions={series.flare_sessions}
              window={windowRange}
              showFlareBands={visibility.flare_bands}
              heightClass={cn(
                isMobile
                  ? "h-[140px] min-h-[140px]"
                  : "h-[180px] min-h-[180px]",
              )}
              hoveredIso={hoveredIso}
              onHoverIso={setHoveredIso}
            />
          </div>

          <EventTracks
            window={windowRange}
            width={width}
            todayIso={series.anchors.today}
            medications={series.medications}
            procedures={series.procedures}
            consults={series.consults}
            diagnosticMilestones={series.diagnostic_milestones}
            decisions={series.decisions}
            visibility={visibility}
            xOf={xScale.xOf}
            selectedIso={selectedIso}
            hoveredIso={hoveredIso}
            onHoverIso={setHoveredIso}
            onSelectIso={setSelectedIso}
          />
        </div>
      </div>

      {/* Side panel: docked on lg+, sheet on mobile. */}
      {isMobile ? (
        <SidePanel
          asSheet
          selectedIso={selectedIso}
          series={series}
          onClose={() => setSelectedIso(null)}
        />
      ) : (
        <SidePanel
          selectedIso={selectedIso}
          series={series}
          onClose={() => setSelectedIso(null)}
        />
      )}
    </div>
  );
}
