import { Badge } from "@/components/ui/badge";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

import type { DiagnosisNode, EvidenceLink } from "@/server/contracts";

type Status = DiagnosisNode["status"];
type Confidence = DiagnosisNode["confidence"];
type Direction = EvidenceLink["direction"];

type BadgeVariant =
  | "default"
  | "primary"
  | "muted"
  | "outline"
  | "accent"
  | "destructive";

/**
 * Status palette — color encodes evidence direction and weight, NOT urgency.
 * Per UX.md §VII the app does not assert certainty; the visual system mirrors
 * that restraint. Confirmed and supported are visually distinct so a reader
 * scanning a list can tell which nodes have linked criteria. Ruled-out is
 * desaturated rather than red — ruling out is healthy, not alarming.
 */
const STATUS_VARIANTS: Record<Status, BadgeVariant> = {
  unreviewed: "outline",
  suspected: "muted",
  monitoring: "outline",
  supported: "primary",
  confirmed: "outline",
  weakened: "outline",
  ruled_out: "outline",
};

/**
 * Per-status className overrides. Composed on top of the base variant so we
 * don't have to add new Badge variants for one-off color pairings.
 */
const STATUS_CLASS: Record<Status, string> = {
  unreviewed: "",
  suspected: "",
  monitoring: "border-blue-300 text-blue-700",
  supported: "font-medium",
  confirmed:
    "border-emerald-500/60 bg-emerald-50 text-emerald-800 font-semibold",
  weakened: "border-amber-400/60 bg-amber-50 text-amber-800 italic",
  ruled_out: "text-muted-foreground line-through opacity-70",
};

/**
 * Re-exported for the tree list, which mirrors a status's text treatment
 * (line-through for ruled_out, etc.) onto the row title so the title and
 * its badge read as one element.
 */
const STATUS_TEXT_CLASS: Record<Status, string> = {
  unreviewed: "",
  suspected: "",
  monitoring: "",
  supported: "font-medium",
  confirmed: "font-semibold",
  weakened: "italic",
  ruled_out: "text-muted-foreground line-through opacity-70",
};

export function StatusBadge({
  status,
  className,
}: {
  status: Status;
  className?: string;
}) {
  return (
    <Badge
      variant={STATUS_VARIANTS[status]}
      className={cn(STATUS_CLASS[status], className)}
    >
      {strings.diagnoses.statuses[status]}
    </Badge>
  );
}

const CONFIDENCE_VARIANTS: Record<
  Confidence,
  "default" | "primary" | "muted" | "outline" | "accent"
> = {
  unknown: "outline",
  low: "muted",
  moderate: "muted",
  high: "primary",
};

export function ConfidenceBadge({
  confidence,
  className,
}: {
  confidence: Confidence;
  className?: string;
}) {
  return (
    <Badge variant={CONFIDENCE_VARIANTS[confidence]} className={className}>
      {strings.diagnoses.confidences[confidence]}
    </Badge>
  );
}

const DIRECTION_VARIANTS: Record<Direction, BadgeVariant> = {
  supports: "primary",
  weakens: "outline",
  neutral: "muted",
  pending: "muted",
};

const DIRECTION_CLASS: Record<Direction, string> = {
  supports: "",
  // Pair visually with the `weakened` status so a reader scanning a row of
  // evidence chips can tell which links are pulling against the hypothesis.
  weakens: "border-amber-400/60 text-amber-800",
  neutral: "",
  pending: "",
};

export function DirectionBadge({
  direction,
  className,
}: {
  direction: Direction;
  className?: string;
}) {
  return (
    <Badge
      variant={DIRECTION_VARIANTS[direction]}
      className={cn(DIRECTION_CLASS[direction], className)}
    >
      {strings.diagnoses.directions[direction]}
    </Badge>
  );
}

export const STATUS_TEXT_CLASS_MAP = STATUS_TEXT_CLASS;
