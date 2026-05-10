import Link from "next/link";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { strings, format as formatString } from "@/lib/strings";
import { formatDateTime } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Appointment } from "@/server/contracts";

const STATUS_VARIANT: Record<Appointment["status"], BadgeProps["variant"]> = {
  scheduled: "muted",
  completed: "muted",
  cancelled: "outline",
};

export interface AppointmentRowProps {
  appointment: Appointment;
  href: string;
}

export function AppointmentRow({ appointment, href }: AppointmentRowProps) {
  const statusLabel =
    strings.schedule.appointments.statuses[appointment.status];

  const isPast = (() => {
    const ts = Date.parse(appointment.date_time);
    return Number.isFinite(ts) ? ts < Date.now() : false;
  })();

  const questionCount = appointment.questions?.length ?? 0;
  const followUpCount = appointment.follow_up_tasks?.length ?? 0;

  const providerLine = [appointment.provider, appointment.specialty]
    .filter((value): value is string => Boolean(value && value.trim()))
    .join(" · ");

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col gap-1.5 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {formatDateTime(appointment.date_time)}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {appointment.purpose?.trim()
              ? appointment.purpose
              : strings.schedule.appointments.row.noPurpose}
          </p>
          {providerLine ? (
            <p className="truncate text-xs text-muted-foreground">
              {providerLine}
            </p>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant={STATUS_VARIANT[appointment.status]}>
            {statusLabel}
          </Badge>
          {questionCount > 0 ? (
            <Badge variant="muted">
              {formatString(
                questionCount === 1
                  ? strings.schedule.appointments.row.questionsCount
                  : strings.schedule.appointments.row.questionsCountPlural,
                { count: questionCount },
              )}
            </Badge>
          ) : null}
          {isPast && followUpCount > 0 ? (
            <Badge variant="muted">
              {formatString(
                followUpCount === 1
                  ? strings.schedule.appointments.row.followUpsCount
                  : strings.schedule.appointments.row.followUpsCountPlural,
                { count: followUpCount },
              )}
            </Badge>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
