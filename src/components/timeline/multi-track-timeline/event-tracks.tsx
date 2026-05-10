"use client";

import * as React from "react";
import { format as formatDate, parseISO, isValid } from "date-fns";

import { strings } from "@/lib/strings";

import type {
  ConsultMarker,
  DecisionMarker,
  DiagnosticMilestoneMarker,
  DiagnosisStatusTo,
  EventMarkerKind,
  MedicationRange,
  TimelineEventMarker,
  VisibleWindow,
} from "./types";
import { generateAxisTicks, formatTickLabel } from "./scale";

export interface EventTracksProps {
  window: VisibleWindow;
  width: number;
  todayIso: string;

  medications: MedicationRange[];
  procedures: TimelineEventMarker[];
  consults: ConsultMarker[];
  diagnosticMilestones: DiagnosticMilestoneMarker[];
  decisions: DecisionMarker[];

  visibility: {
    medications: boolean;
    procedures: boolean;
    consults: boolean;
    diagnostic_milestones: boolean;
    decisions: boolean;
  };

  xOf: (iso: string) => number;
  selectedIso: string | null;
  hoveredIso: string | null;
  onHoverIso: (iso: string | null) => void;
  onSelectIso: (iso: string | null) => void;
}

const LABEL_COL_WIDTH = 120;
const ROW_HEIGHT = 22;
const MARKER_LANE_HEIGHT = 28;
const TRACK_PADDING_Y = 6;

function safeIso(iso: string | null): string | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return isValid(d) ? iso : null;
}

interface LaneSpec {
  id: string;
  label: string;
  height: number;
  visible: boolean;
}

/**
 * Pure SVG event lanes that share an X scale with the pain track. The chart
 * wrapping component computes width via ResizeObserver and hands us xOf().
 *
 * Why pure SVG and not Recharts: medication Gantt bars across years with
 * arbitrary stacking and per-bar tooltips don't fit Recharts' axis model
 * cleanly, and we want to drop dropper-lines into the pain track on hover.
 */
export function EventTracks({
  window,
  width,
  todayIso,
  medications,
  procedures,
  consults,
  diagnosticMilestones,
  decisions,
  visibility,
  xOf,
  selectedIso,
  hoveredIso,
  onHoverIso,
  onSelectIso,
}: EventTracksProps) {
  const trackWidth = Math.max(1, width - LABEL_COL_WIDTH);

  const visibleMeds = React.useMemo(() => {
    if (!visibility.medications) return [];
    const fromMs = parseISO(window.from).getTime();
    const toMs = parseISO(window.to).getTime();
    return medications
      .filter((m) => {
        const start = m.start_at ? parseISO(m.start_at).getTime() : null;
        const end = m.end_at
          ? parseISO(m.end_at).getTime()
          : parseISO(todayIso).getTime();
        if (start == null) return false;
        if (Number.isNaN(start) || Number.isNaN(end)) return false;
        return end >= fromMs && start <= toMs;
      })
      .sort((a, b) => {
        const aStart = a.start_at ? parseISO(a.start_at).getTime() : 0;
        const bStart = b.start_at ? parseISO(b.start_at).getTime() : 0;
        return aStart - bStart;
      });
  }, [medications, visibility.medications, window.from, window.to, todayIso]);

  const visibleProcedures = React.useMemo(() => {
    if (!visibility.procedures) return [];
    return procedures.filter((p) => isInWindow(p.occurred_at, window));
  }, [procedures, visibility.procedures, window]);

  const visibleConsults = React.useMemo(() => {
    if (!visibility.consults) return [];
    return consults.filter((c) => isInWindow(c.occurred_at, window));
  }, [consults, visibility.consults, window]);

  const visibleDxMilestones = React.useMemo(() => {
    if (!visibility.diagnostic_milestones) return [];
    return diagnosticMilestones.filter((d) =>
      isInWindow(d.occurred_at, window),
    );
  }, [diagnosticMilestones, visibility.diagnostic_milestones, window]);

  const visibleDecisions = React.useMemo(() => {
    if (!visibility.decisions) return [];
    return decisions.filter((d) => {
      const iso = d.decided_at ?? d.target_date;
      return iso ? isInWindow(iso, window) : false;
    });
  }, [decisions, visibility.decisions, window]);

  const lanes: LaneSpec[] = [
    {
      id: "medications",
      label: strings.timelineSeries.tracks.medications,
      height: Math.max(
        MARKER_LANE_HEIGHT,
        visibleMeds.length * ROW_HEIGHT + TRACK_PADDING_Y * 2,
      ),
      visible: visibility.medications && visibleMeds.length > 0,
    },
    {
      id: "procedures",
      label: strings.timelineSeries.tracks.procedures,
      height: MARKER_LANE_HEIGHT,
      visible: visibility.procedures,
    },
    {
      id: "consults",
      label: strings.timelineSeries.tracks.consults,
      height: MARKER_LANE_HEIGHT,
      visible: visibility.consults,
    },
    {
      id: "diagnostic_milestones",
      label: strings.timelineSeries.tracks.diagnosticMilestones,
      height: MARKER_LANE_HEIGHT,
      visible: visibility.diagnostic_milestones,
    },
    {
      id: "decisions",
      label: strings.timelineSeries.tracks.decisions,
      height: MARKER_LANE_HEIGHT,
      visible: visibility.decisions,
    },
  ];

  const visibleLanes = lanes.filter((l) => l.visible);
  const totalHeight =
    visibleLanes.reduce((sum, l) => sum + l.height, 0) + 24; /* axis */

  const ticks = React.useMemo(() => generateAxisTicks(window), [window]);

  // Mouse → ISO. We translate clientX relative to the SVG's bounding rect
  // and pass through the inverse scale. Hook must be declared above any
  // conditional early return below.
  const svgRef = React.useRef<SVGSVGElement | null>(null);
  function pxToIso(clientX: number): string | null {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return null;
    const px = clientX - rect.left - LABEL_COL_WIDTH;
    if (px < 0 || px > trackWidth) return null;
    const ratio = px / Math.max(1, trackWidth);
    const fromMs = parseISO(window.from).getTime();
    const toMs = parseISO(window.to).getTime();
    const ms = fromMs + ratio * (toMs - fromMs);
    return new Date(ms).toISOString();
  }

  if (visibleLanes.length === 0) {
    return (
      <div className="flex h-12 items-center justify-center rounded-md border border-dashed border-border bg-card/40 px-3 text-xs text-muted-foreground">
        {strings.timelineSeries.tracks.allHidden}
      </div>
    );
  }

  // Compute lane offsets.
  const laneOffsets: Record<string, number> = {};
  let cursor = 0;
  for (const l of visibleLanes) {
    laneOffsets[l.id] = cursor;
    cursor += l.height;
  }
  const axisY = cursor;

  return (
    <div className="relative w-full overflow-hidden rounded-md border border-border bg-card/40">
      <svg
        ref={svgRef}
        width={width}
        height={totalHeight}
        role="img"
        aria-label={strings.timelineSeries.tracks.svgLabel}
        className="block"
        onMouseLeave={() => onHoverIso(null)}
        onMouseMove={(e) => onHoverIso(pxToIso(e.clientX))}
      >
        {/* Lane label column background */}
        <rect
          x={0}
          y={0}
          width={LABEL_COL_WIDTH}
          height={totalHeight}
          fill="hsl(var(--muted))"
          fillOpacity={0.3}
        />
        <line
          x1={LABEL_COL_WIDTH}
          x2={LABEL_COL_WIDTH}
          y1={0}
          y2={totalHeight}
          stroke="hsl(var(--border))"
          strokeWidth={1}
        />

        {/* Lane separators + labels */}
        {visibleLanes.map((lane, idx) => {
          const y = laneOffsets[lane.id];
          return (
            <g key={lane.id}>
              {idx > 0 ? (
                <line
                  x1={0}
                  x2={width}
                  y1={y}
                  y2={y}
                  stroke="hsl(var(--border))"
                  strokeWidth={1}
                  strokeDasharray="2 4"
                />
              ) : null}
              <text
                x={12}
                y={y + lane.height / 2}
                dominantBaseline="middle"
                fontSize={11}
                fill="hsl(var(--muted-foreground))"
                style={{ pointerEvents: "none" }}
              >
                {lane.label}
              </text>
            </g>
          );
        })}

        {/* X-axis tick guides spanning all lanes. xOf returns pixel offsets
            in track-content space (0..trackWidth); we offset by the lane
            label column width to draw inside the SVG coordinate space. */}
        {ticks.map((tIso) => {
          const gx = LABEL_COL_WIDTH + xOf(tIso);
          return (
            <g key={tIso}>
              <line
                x1={gx}
                x2={gx}
                y1={0}
                y2={axisY}
                stroke="hsl(var(--border))"
                strokeOpacity={0.5}
                strokeWidth={1}
              />
              <text
                x={gx}
                y={axisY + 14}
                fontSize={10}
                fill="hsl(var(--muted-foreground))"
                textAnchor="middle"
              >
                {formatTickLabel(tIso, window)}
              </text>
            </g>
          );
        })}

        {/* "Today" reference line */}
        {(() => {
          const todayMs = parseISO(todayIso).getTime();
          const fromMs = parseISO(window.from).getTime();
          const toMs = parseISO(window.to).getTime();
          if (!Number.isFinite(todayMs) || todayMs < fromMs || todayMs > toMs) {
            return null;
          }
          const tx = LABEL_COL_WIDTH + xOf(todayIso);
          return (
            <g>
              <line
                x1={tx}
                x2={tx}
                y1={0}
                y2={axisY}
                stroke="hsl(var(--accent))"
                strokeWidth={1}
                strokeDasharray="4 3"
              />
            </g>
          );
        })()}

        {/* Hovered scrubber line (shared with pain track via hoveredIso) */}
        {hoveredIso ? (
          <line
            x1={LABEL_COL_WIDTH + xOf(hoveredIso)}
            x2={LABEL_COL_WIDTH + xOf(hoveredIso)}
            y1={0}
            y2={axisY}
            stroke="hsl(var(--ring))"
            strokeWidth={1}
            strokeOpacity={0.6}
            style={{ pointerEvents: "none" }}
          />
        ) : null}

        {/* Selected day persistent line */}
        {selectedIso ? (
          <line
            x1={LABEL_COL_WIDTH + xOf(selectedIso)}
            x2={LABEL_COL_WIDTH + xOf(selectedIso)}
            y1={0}
            y2={axisY}
            stroke="hsl(var(--primary))"
            strokeWidth={1.5}
            style={{ pointerEvents: "none" }}
          />
        ) : null}

        {/* Medications lane */}
        {visibility.medications && visibleMeds.length > 0
          ? renderMedicationsLane({
              meds: visibleMeds,
              y: laneOffsets["medications"],
              xOf,
              labelOffset: LABEL_COL_WIDTH,
              todayIso,
              onSelectIso,
            })
          : null}

        {/* Procedures lane */}
        {visibility.procedures
          ? renderMarkerLane({
              items: visibleProcedures.map((p) => ({
                id: p.id,
                iso: p.occurred_at,
                title: p.title,
                summary: p.summary ?? null,
                kind: p.kind,
              })),
              y: laneOffsets["procedures"],
              labelOffset: LABEL_COL_WIDTH,
              xOf,
              renderMarker: (item, x, cy) =>
                renderProcedureMarker(item.kind, x, cy),
              ariaLabel: (item) =>
                `${strings.timelineSeries.tracks.procedures}: ${item.title} — ${formatLabelDate(item.iso)}`,
              onSelectIso,
            })
          : null}

        {/* Consults lane */}
        {visibility.consults
          ? renderMarkerLane({
              items: visibleConsults.map((c) => ({
                id: c.id,
                iso: c.occurred_at,
                title: c.purpose,
                summary: c.specialty,
                provider: c.provider,
              })),
              y: laneOffsets["consults"],
              labelOffset: LABEL_COL_WIDTH,
              xOf,
              renderMarker: (item, x, cy) => (
                <g>
                  <circle
                    cx={x}
                    cy={cy}
                    r={6}
                    fill="hsl(var(--accent))"
                    fillOpacity={0.85}
                  />
                  <text
                    x={x}
                    y={cy}
                    dominantBaseline="middle"
                    textAnchor="middle"
                    fontSize={9}
                    fill="hsl(var(--accent-foreground))"
                    style={{ pointerEvents: "none" }}
                  >
                    {initialsOf(item.provider ?? "")}
                  </text>
                </g>
              ),
              ariaLabel: (item) =>
                `${strings.timelineSeries.tracks.consults}: ${item.title} — ${formatLabelDate(item.iso)}`,
              onSelectIso,
            })
          : null}

        {/* Diagnostic milestones */}
        {visibility.diagnostic_milestones
          ? renderMarkerLane({
              items: visibleDxMilestones.map((d) => ({
                id: d.id,
                iso: d.occurred_at,
                title: d.diagnosis_name,
                summary: d.notes,
                statusTo: d.status_to,
              })),
              y: laneOffsets["diagnostic_milestones"],
              labelOffset: LABEL_COL_WIDTH,
              xOf,
              renderMarker: (item, x, cy) =>
                renderDxTag(item.statusTo as DiagnosisStatusTo, x, cy),
              ariaLabel: (item) =>
                `${strings.timelineSeries.tracks.diagnosticMilestones}: ${item.title} — ${formatLabelDate(item.iso)}`,
              onSelectIso,
            })
          : null}

        {/* Decisions */}
        {visibility.decisions
          ? renderMarkerLane({
              items: visibleDecisions.map((d) => ({
                id: d.id,
                iso: d.decided_at ?? d.target_date ?? "",
                title: d.title,
                summary: d.status,
                decided: Boolean(d.decided_at),
              })),
              y: laneOffsets["decisions"],
              labelOffset: LABEL_COL_WIDTH,
              xOf,
              renderMarker: (item, x, cy) =>
                renderDecisionFlag(Boolean(item.decided), x, cy),
              ariaLabel: (item) =>
                `${strings.timelineSeries.tracks.decisions}: ${item.title} — ${formatLabelDate(item.iso)}`,
              onSelectIso,
            })
          : null}
      </svg>
    </div>
  );
}

function isInWindow(iso: string, window: VisibleWindow): boolean {
  const ms = parseISO(iso).getTime();
  if (!Number.isFinite(ms)) return false;
  return (
    ms >= parseISO(window.from).getTime() && ms <= parseISO(window.to).getTime()
  );
}

function formatLabelDate(iso: string | null): string {
  const safe = safeIso(iso ?? "");
  if (!safe) return "";
  return formatDate(parseISO(safe), "PP");
}

function initialsOf(name: string): string {
  if (!name) return "·";
  const parts = name.trim().split(/\s+/);
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] : "";
  return (first + last).toUpperCase() || "·";
}

function renderProcedureMarker(
  kind: EventMarkerKind,
  x: number,
  cy: number,
): React.ReactNode {
  const fill =
    kind === "injury" ? "hsl(var(--destructive))" : "hsl(var(--primary))";
  switch (kind) {
    case "imaging":
      return (
        <polygon
          points={hexagonPoints(x, cy, 6)}
          fill={fill}
          fillOpacity={0.85}
        />
      );
    case "test_lab":
      return <circle cx={x} cy={cy} r={5} fill={fill} fillOpacity={0.85} />;
    case "injury":
      return (
        <g>
          <line
            x1={x - 5}
            x2={x + 5}
            y1={cy - 5}
            y2={cy + 5}
            stroke={fill}
            strokeWidth={2}
          />
          <line
            x1={x - 5}
            x2={x + 5}
            y1={cy + 5}
            y2={cy - 5}
            stroke={fill}
            strokeWidth={2}
          />
        </g>
      );
    case "medication_change":
      return (
        <rect
          x={x - 4}
          y={cy - 4}
          width={8}
          height={8}
          rx={1}
          fill="hsl(var(--accent))"
          fillOpacity={0.85}
        />
      );
    case "procedure":
    default:
      return (
        <polygon
          points={diamondPoints(x, cy, 6)}
          fill={fill}
          fillOpacity={0.85}
        />
      );
  }
}

function diamondPoints(cx: number, cy: number, r: number): string {
  return `${cx},${cy - r} ${cx + r},${cy} ${cx},${cy + r} ${cx - r},${cy}`;
}

function hexagonPoints(cx: number, cy: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 6; i += 1) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const x = cx + r * Math.cos(angle);
    const y = cy + r * Math.sin(angle);
    pts.push(`${x},${y}`);
  }
  return pts.join(" ");
}

function renderDxTag(status: DiagnosisStatusTo, x: number, cy: number) {
  const color = colorForDxStatus(status);
  const opacity = status === "supported" ? 0.7 : 0.85;
  const w = 14;
  const h = 12;
  // Tag-shaped polygon: pointed left edge.
  const points = [
    `${x - w / 2 + 3},${cy - h / 2}`,
    `${x + w / 2},${cy - h / 2}`,
    `${x + w / 2},${cy + h / 2}`,
    `${x - w / 2 + 3},${cy + h / 2}`,
    `${x - w / 2},${cy}`,
  ].join(" ");
  return (
    <polygon
      points={points}
      fill={color}
      fillOpacity={opacity}
      stroke={
        status === "weakened" || status === "ruled_out" ? color : "transparent"
      }
      strokeWidth={1}
      strokeDasharray={status === "ruled_out" ? "2 2" : undefined}
    />
  );
}

function colorForDxStatus(status: DiagnosisStatusTo): string {
  switch (status) {
    case "confirmed":
    case "supported":
      return "hsl(var(--primary))";
    case "weakened":
    case "ruled_out":
      return "hsl(var(--muted-foreground))";
    case "monitoring":
    case "suspected":
    case "unreviewed":
    default:
      return "hsl(var(--muted-foreground))";
  }
}

function renderDecisionFlag(decided: boolean, x: number, cy: number) {
  const color = "hsl(var(--accent))";
  // Simple flag: pole + triangle to the right.
  return (
    <g>
      <line
        x1={x}
        x2={x}
        y1={cy - 7}
        y2={cy + 7}
        stroke={color}
        strokeWidth={1.5}
      />
      <polygon
        points={`${x},${cy - 6} ${x + 8},${cy - 3} ${x},${cy}`}
        fill={decided ? color : "none"}
        stroke={color}
        strokeWidth={1.5}
        fillOpacity={decided ? 0.9 : 0}
      />
    </g>
  );
}

interface RenderMarkerLaneArgs<T extends { id: string; iso: string }> {
  items: T[];
  y: number;
  labelOffset: number;
  xOf: (iso: string) => number;
  renderMarker: (item: T, x: number, cy: number) => React.ReactNode;
  ariaLabel: (item: T) => string;
  onSelectIso: (iso: string | null) => void;
}

function renderMarkerLane<T extends { id: string; iso: string }>(
  args: RenderMarkerLaneArgs<T>,
) {
  const { items, y, labelOffset, xOf, renderMarker, ariaLabel, onSelectIso } =
    args;
  const cy = y + MARKER_LANE_HEIGHT / 2;
  return (
    <g>
      {items.map((item) => {
        const x = labelOffset + xOf(item.iso);
        return (
          <g
            key={item.id}
            role="button"
            tabIndex={0}
            aria-label={ariaLabel(item)}
            style={{ cursor: "pointer" }}
            onClick={() => onSelectIso(item.iso)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectIso(item.iso);
              }
            }}
          >
            {/* Hit area */}
            <rect
              x={x - 9}
              y={cy - 10}
              width={18}
              height={20}
              fill="transparent"
            />
            {renderMarker(item, x, cy)}
            <title>{ariaLabel(item)}</title>
          </g>
        );
      })}
    </g>
  );
}

interface RenderMedsLaneArgs {
  meds: MedicationRange[];
  y: number;
  xOf: (iso: string) => number;
  labelOffset: number;
  todayIso: string;
  onSelectIso: (iso: string | null) => void;
}

function renderMedicationsLane({
  meds,
  y,
  xOf,
  labelOffset,
  todayIso,
  onSelectIso,
}: RenderMedsLaneArgs) {
  return (
    <g>
      {meds.map((med, idx) => {
        const startIso = med.start_at ?? "";
        const endIso = med.end_at ?? todayIso;
        const startX = labelOffset + xOf(startIso);
        const endX = labelOffset + xOf(endIso);
        const w = Math.max(2, endX - startX);
        const rowY = y + TRACK_PADDING_Y + idx * ROW_HEIGHT;
        const barH = ROW_HEIGHT - 6;
        const ongoing = med.end_at == null;
        const fill = colorForMedStatus(med.status);
        const fillOpacity =
          med.status === "active" ? 0.85 : med.status === "stopped" ? 0.4 : 0.6;
        const labelFits = w > 80;
        const aria = `${med.name}${med.dose ? ` (${med.dose})` : ""} — ${
          med.status
        } — ${formatLabelDate(startIso)}${
          med.end_at ? ` to ${formatLabelDate(med.end_at)}` : " (ongoing)"
        }`;
        return (
          <g
            key={med.id}
            role="button"
            tabIndex={0}
            aria-label={aria}
            style={{ cursor: "pointer" }}
            onClick={() => onSelectIso(startIso || null)}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSelectIso(startIso || null);
              }
            }}
          >
            <rect
              x={startX}
              y={rowY}
              width={w}
              height={barH}
              rx={3}
              fill={fill}
              fillOpacity={fillOpacity}
            />
            {ongoing ? (
              <polygon
                points={`${endX},${rowY} ${endX + 6},${
                  rowY + barH / 2
                } ${endX},${rowY + barH}`}
                fill={fill}
                fillOpacity={fillOpacity}
              />
            ) : null}
            {labelFits ? (
              <text
                x={startX + 6}
                y={rowY + barH / 2}
                dominantBaseline="middle"
                fontSize={10}
                fill="hsl(var(--primary-foreground))"
                style={{ pointerEvents: "none" }}
              >
                {truncate(med.name, Math.floor(w / 6))}
              </text>
            ) : null}
            <title>{aria}</title>
          </g>
        );
      })}
    </g>
  );
}

function colorForMedStatus(status: MedicationRange["status"]): string {
  switch (status) {
    case "active":
      return "hsl(var(--primary))";
    case "paused":
      return "hsl(var(--accent))";
    case "planned":
      return "hsl(var(--muted-foreground))";
    case "stopped":
    default:
      return "hsl(var(--muted-foreground))";
  }
}

function truncate(value: string, max: number): string {
  if (max <= 0) return "";
  if (value.length <= max) return value;
  return `${value.slice(0, Math.max(0, max - 1))}…`;
}

/** Helper consumed by the side-panel cn() classes. Mirrors the
 * STATUS_TEXT_CLASS map in `diagnoses/diagnosis-badges.tsx` so the same
 * styling rules apply when a milestone status is rendered as text in the
 * side panel rather than as a tag in the SVG. Kept local to avoid a
 * circular import on the diagnoses module. */
export function dxStatusTextClass(status: DiagnosisStatusTo): string {
  switch (status) {
    case "confirmed":
      return "font-semibold";
    case "weakened":
      return "italic";
    case "ruled_out":
      return "line-through opacity-70";
    default:
      return "";
  }
}

/** Re-exported for tests/storybook so callers don't have to recompute it. */
export { LABEL_COL_WIDTH, ROW_HEIGHT, MARKER_LANE_HEIGHT };
