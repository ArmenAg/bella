import { Badge } from "@/components/ui/badge";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

import type { DiagnosisNode, EvidenceLink } from "@/server/contracts";

type Status = DiagnosisNode["status"];
type Confidence = DiagnosisNode["confidence"];
type Direction = EvidenceLink["direction"];

const STATUS_VARIANTS: Record<
  Status,
  "default" | "primary" | "muted" | "outline" | "accent" | "destructive"
> = {
  unreviewed: "muted",
  suspected: "muted",
  supported: "primary",
  weakened: "outline",
  ruled_out: "outline",
  confirmed: "primary",
  monitoring: "muted",
};

const STATUS_TEXT_CLASS: Record<Status, string> = {
  unreviewed: "",
  suspected: "",
  supported: "",
  weakened: "italic",
  ruled_out: "line-through opacity-70",
  confirmed: "font-semibold",
  monitoring: "",
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
      className={cn(STATUS_TEXT_CLASS[status], className)}
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

const DIRECTION_VARIANTS: Record<
  Direction,
  "default" | "primary" | "muted" | "outline" | "destructive" | "accent"
> = {
  supports: "primary",
  weakens: "outline",
  neutral: "muted",
  pending: "muted",
};

export function DirectionBadge({
  direction,
  className,
}: {
  direction: Direction;
  className?: string;
}) {
  return (
    <Badge variant={DIRECTION_VARIANTS[direction]} className={className}>
      {strings.diagnoses.directions[direction]}
    </Badge>
  );
}

export const STATUS_TEXT_CLASS_MAP = STATUS_TEXT_CLASS;
