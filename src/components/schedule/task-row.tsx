import Link from "next/link";
import { CalendarClock, Compass, GitBranch, BookMarked } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { strings } from "@/lib/strings";
import { formatRelative } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Task } from "@/server/contracts";

const STATUS_VARIANT: Record<Task["status"], BadgeProps["variant"]> = {
  open: "muted",
  in_progress: "muted",
  blocked: "destructive",
  done: "muted",
  cancelled: "outline",
};

const PRIORITY_VARIANT: Record<Task["priority"], BadgeProps["variant"]> = {
  urgent: "destructive",
  high: "primary",
  normal: "muted",
  low: "outline",
};

export interface TaskRowProps {
  task: Task;
  href: string;
}

export function TaskRow({ task, href }: TaskRowProps) {
  const statusLabel = strings.schedule.tasks.statuses[task.status];
  const priorityLabel = strings.schedule.tasks.priorities[task.priority];

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
          <div className="flex items-center gap-1.5">
            <Badge variant={PRIORITY_VARIANT[task.priority]}>
              {priorityLabel}
            </Badge>
            <p className="truncate text-sm font-semibold text-foreground">
              {task.title}
            </p>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {task.due_at
              ? formatRelative(task.due_at)
              : strings.schedule.tasks.row.noDue}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5 text-xs">
          <Badge variant={STATUS_VARIANT[task.status]}>{statusLabel}</Badge>
          {task.appointment_id ? (
            <span
              aria-label={strings.schedule.tasks.row.linkedAppointment}
              title={strings.schedule.tasks.row.linkedAppointment}
              className="text-muted-foreground"
            >
              <CalendarClock aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          ) : null}
          {task.decision_id ? (
            <span
              aria-label={strings.schedule.tasks.row.linkedDecision}
              title={strings.schedule.tasks.row.linkedDecision}
              className="text-muted-foreground"
            >
              <Compass aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          ) : null}
          {task.diagnosis_id ? (
            <span
              aria-label={strings.schedule.tasks.row.linkedDiagnosis}
              title={strings.schedule.tasks.row.linkedDiagnosis}
              className="text-muted-foreground"
            >
              <GitBranch aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          ) : null}
          {task.source_id ? (
            <span
              aria-label={strings.schedule.tasks.row.linkedSource}
              title={strings.schedule.tasks.row.linkedSource}
              className="text-muted-foreground"
            >
              <BookMarked aria-hidden="true" className="h-3.5 w-3.5" />
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
