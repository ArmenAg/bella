import Link from "next/link";
import { CalendarClock, ListChecks, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { ScheduleTabs } from "@/components/schedule/schedule-tabs";
import {
  AppointmentFilter,
  type AppointmentScope,
} from "@/components/schedule/appointment-filter";
import { TaskFilter, type TaskScope } from "@/components/schedule/task-filter";
import { AppointmentRow } from "@/components/schedule/appointment-row";
import { TaskRow } from "@/components/schedule/task-row";
import { listAppointments, listTasks } from "@/server/actions/schedule";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { strings } from "@/lib/strings";
import type { Appointment, Task } from "@/server/contracts";

export const dynamic = "force-dynamic";

interface SchedulePageProps {
  searchParams: Promise<{ tab?: string; scope?: string }>;
}

function canWrite(role: string | undefined): boolean {
  return role === "primary" || role === "caregiver";
}

const PRIORITY_RANK: Record<Task["priority"], number> = {
  urgent: 0,
  high: 1,
  normal: 2,
  low: 3,
};

function sortTasks(tasks: Task[]): Task[] {
  return [...tasks].sort((a, b) => {
    const priorityDelta = PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority];
    if (priorityDelta !== 0) return priorityDelta;
    if (!a.due_at && !b.due_at) return 0;
    if (!a.due_at) return 1;
    if (!b.due_at) return -1;
    return Date.parse(a.due_at) - Date.parse(b.due_at);
  });
}

function sortAppointments(
  appointments: Appointment[],
  scope: AppointmentScope,
): Appointment[] {
  const sorted = [...appointments];
  if (scope === "upcoming") {
    sorted.sort((a, b) => Date.parse(a.date_time) - Date.parse(b.date_time));
  } else {
    sorted.sort((a, b) => Date.parse(b.date_time) - Date.parse(a.date_time));
  }
  return sorted;
}

export default async function SchedulePage({
  searchParams,
}: SchedulePageProps) {
  const params = await searchParams;
  const tab: "appointments" | "tasks" =
    params.tab === "tasks" ? "tasks" : "appointments";
  const profile = await loadShellProfile();
  const showWrite = canWrite(profile?.role);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.schedule.title}
        description={strings.schedule.subtitle}
      />

      <ScheduleTabs current={tab} />

      {tab === "appointments" ? (
        <AppointmentsTab scopeParam={params.scope} showWrite={showWrite} />
      ) : (
        <TasksTab scopeParam={params.scope} showWrite={showWrite} />
      )}
    </div>
  );
}

interface AppointmentsTabProps {
  scopeParam: string | undefined;
  showWrite: boolean;
}

async function AppointmentsTab({
  scopeParam,
  showWrite,
}: AppointmentsTabProps) {
  const scope: AppointmentScope =
    scopeParam === "all" || scopeParam === "completed"
      ? scopeParam
      : "upcoming";

  const filterArg =
    scope === "upcoming"
      ? { upcoming: true }
      : scope === "completed"
        ? { status: "completed" as const }
        : {};

  const result = await listAppointments({
    page_size: 200,
    ...filterArg,
  });

  const newButton = showWrite ? (
    <Button asChild size="sm">
      <Link href="/schedule/appointments/new">
        <Plus aria-hidden="true" className="h-4 w-4" />
        {strings.schedule.appointments.newCta}
      </Link>
    </Button>
  ) : null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <AppointmentFilter current={scope} />
        {newButton}
      </div>

      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={CalendarClock}
          title={
            scope === "upcoming"
              ? strings.schedule.appointments.empty.upcoming
              : scope === "completed"
                ? strings.schedule.appointments.empty.completed
                : strings.schedule.appointments.empty.all
          }
          action={newButton}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {sortAppointments(result.data.items, scope).map((appointment) => (
            <li key={appointment.id}>
              <AppointmentRow
                appointment={appointment}
                href={`/schedule/appointments/${appointment.id}/edit`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

interface TasksTabProps {
  scopeParam: string | undefined;
  showWrite: boolean;
}

async function TasksTab({ scopeParam, showWrite }: TasksTabProps) {
  const scope: TaskScope = scopeParam === "all" ? "all" : "open";

  const filterArg = scope === "open" ? { open_only: true } : {};

  const result = await listTasks({ page_size: 200, ...filterArg });

  const newButton = showWrite ? (
    <Button asChild size="sm">
      <Link href="/schedule/tasks/new">
        <Plus aria-hidden="true" className="h-4 w-4" />
        {strings.schedule.tasks.newCta}
      </Link>
    </Button>
  ) : null;

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <TaskFilter current={scope} />
        {newButton}
      </div>

      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={ListChecks}
          title={
            scope === "open"
              ? strings.schedule.tasks.empty.open
              : strings.schedule.tasks.empty.all
          }
          action={newButton}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {sortTasks(result.data.items).map((task) => (
            <li key={task.id}>
              <TaskRow task={task} href={`/schedule/tasks/${task.id}/edit`} />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
