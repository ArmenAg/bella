import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { strings } from "@/lib/strings";
import { formatDate } from "@/lib/format";
import type { Medication } from "@/server/contracts";
import { cn } from "@/lib/utils";

export interface MedicationListRowProps {
  medication: Medication;
  href: string;
}

const STATUS_VARIANTS: Record<
  Medication["status"],
  "primary" | "muted" | "outline" | "accent"
> = {
  active: "primary",
  paused: "muted",
  planned: "muted",
  stopped: "outline",
};

export function MedicationListRow({
  medication,
  href,
}: MedicationListRowProps) {
  const helpedChips: string[] = [];
  if (medication.helped_pain)
    helpedChips.push(strings.medications.form.helpedPain);
  if (medication.helped_sleep)
    helpedChips.push(strings.medications.form.helpedSleep);
  if (medication.helped_anxiety)
    helpedChips.push(strings.medications.form.helpedAnxiety);
  if (medication.helped_function)
    helpedChips.push(strings.medications.form.helpedFunction);

  const subtitle = [medication.dose, medication.frequency, medication.route]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" · ");

  const dateParts: string[] = [];
  if (medication.start_date) dateParts.push(formatDate(medication.start_date));
  if (medication.stop_date) dateParts.push(formatDate(medication.stop_date));
  const dateRange = dateParts.join(" – ");

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-foreground">
            {medication.name || strings.medications.list.noNamePlaceholder}
          </p>
          {subtitle ? (
            <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant={STATUS_VARIANTS[medication.status]}>
            {strings.medications.statuses[medication.status]}
          </Badge>
          {medication.prescriber ? (
            <Badge variant="outline">{medication.prescriber}</Badge>
          ) : null}
        </div>
      </div>

      {helpedChips.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {helpedChips.map((chip) => (
            <Badge key={chip} variant="muted">
              {chip}
            </Badge>
          ))}
        </div>
      ) : null}

      {dateRange ? (
        <p className="text-xs text-muted-foreground">{dateRange}</p>
      ) : null}

      {medication.reason ? (
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {medication.reason}
        </p>
      ) : null}
    </Link>
  );
}
