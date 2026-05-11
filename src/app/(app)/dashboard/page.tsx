import Link from "next/link";

import { PageHeader } from "@/components/shell/page-header";
import { Badge } from "@/components/ui/badge";
import { ErrorState } from "@/components/feedback/error-state";

import { ActiveFlareCard } from "@/components/dashboard/active-flare-card";
import { InstrumentCluster } from "@/components/dashboard/instrument-cluster";
import { RangeSelector } from "@/components/dashboard/range-selector";
import { SectionCard } from "@/components/dashboard/section-card";
import { SectionRow } from "@/components/dashboard/section-row";
import { TrendsAccordion } from "@/components/dashboard/trends-accordion";
import { UpcomingPacketCta } from "@/components/dashboard/upcoming-packet-cta";

import { FlareFrequencyChart } from "@/components/charts/flare-frequency-chart";
import { RecoveryTimeChart } from "@/components/charts/recovery-time-chart";
import { TriggerFrequencyChart } from "@/components/charts/trigger-frequency-chart";
import { PainByRegionChart } from "@/components/charts/pain-by-region-chart";
import { VasomotorDeltaChart } from "@/components/charts/vasomotor-delta-chart";
import { MedicationResponseSummaryChart } from "@/components/charts/medication-response-chart";
import { PainOverTimeChart } from "@/components/charts/pain-over-time-chart";

import { listAppointments } from "@/server/actions/schedule";
import { listDecisions } from "@/server/actions/decisions";
import { listDiagnoses } from "@/server/actions/diagnoses";
import { listEntries } from "@/server/actions/entries";
import { listMedications } from "@/server/actions/medications";
import { listTasks } from "@/server/actions/schedule";
import { listVasomotorMeasurements } from "@/server/actions/vasomotor";
import { listReferenceData } from "@/server/actions/reference";
import { getDashboardMetrics } from "@/server/actions/metrics";

import { strings, format as formatString } from "@/lib/strings";
import { formatDate, formatDateTime, formatRelative } from "@/lib/format";

const emptyCtas = strings.dashboard.emptyCtas;

const STALE_REVIEW_THRESHOLD_DAYS = 90;

export const dynamic = "force-dynamic";

interface DashboardPageProps {
  searchParams: Promise<{ range?: string }>;
}

type DashboardRange = "7" | "30" | "90";

function pickRange(value: string | undefined): DashboardRange {
  if (value === "7" || value === "90") return value;
  return "30";
}

function rangeToWindow(range: DashboardRange): {
  date_from: string;
  date_to: string;
} {
  const now = new Date();
  const from = new Date(now);
  from.setDate(now.getDate() - Number(range));
  return {
    date_from: from.toISOString(),
    date_to: now.toISOString(),
  };
}

const TASK_STATUS_LABEL: Record<string, string> = {
  open: strings.schedule.tasks.statuses.open,
  in_progress: strings.schedule.tasks.statuses.in_progress,
  blocked: strings.schedule.tasks.statuses.blocked,
};

const TASK_PRIORITY_VARIANT: Record<
  string,
  "default" | "muted" | "destructive" | "primary" | "outline" | "accent"
> = {
  urgent: "destructive",
  high: "primary",
  normal: "muted",
  low: "outline",
};

export default async function DashboardPage({
  searchParams,
}: DashboardPageProps) {
  const params = await searchParams;
  const range = pickRange(params.range);
  const window = rangeToWindow(range);

  // Pull a wider flare window (60d) so the instrument cluster can compute the
  // last-30d vs prior-30d delta without a second round-trip. Capped at 200 to
  // keep this cheap; flares are rare enough that this is plenty for the math.
  const flareWindowFromIso = new Date(
    Date.now() - 60 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const [
    metricsResult,
    appointmentsResult,
    decisionsResult,
    flaresResult,
    flareWindowResult,
    vasomotorResult,
    medicationsResult,
    tasksResult,
    referenceResult,
    diagnosesResult,
  ] = await Promise.all([
    getDashboardMetrics({
      date_from: window.date_from,
      date_to: window.date_to,
    }),
    listAppointments({ upcoming: true, page_size: 5 }),
    listDecisions({ open_only: true, page_size: 5 }),
    listEntries({ flare_only: true, page_size: 5 }),
    listEntries({
      flare_only: true,
      date_from: flareWindowFromIso,
      page_size: 200,
    }),
    listVasomotorMeasurements({ page_size: 5 }),
    listMedications({ status: "active", page_size: 10 }),
    listTasks({ open_only: true, page_size: 10 }),
    listReferenceData(),
    listDiagnoses({ page_size: 100 }),
  ]);

  const referenceData = referenceResult.ok
    ? referenceResult.data
    : { body_regions: [], symptoms: [], triggers: [] };
  const medications = medicationsResult.ok ? medicationsResult.data.items : [];

  const todayDate = new Date().toISOString().slice(0, 10);
  const nowIso = new Date().toISOString();

  const upcomingAppointments = appointmentsResult.ok
    ? appointmentsResult.data.items.slice(0, 3)
    : [];
  const openDecisions = decisionsResult.ok
    ? [...decisionsResult.data.items]
        .sort((a, b) => {
          const aDate = a.target_date ?? "9999-12-31";
          const bDate = b.target_date ?? "9999-12-31";
          return aDate.localeCompare(bDate);
        })
        .slice(0, 5)
    : [];
  const recentFlares = flaresResult.ok
    ? flaresResult.data.items.slice(0, 5)
    : [];
  const recentVasomotor = vasomotorResult.ok
    ? vasomotorResult.data.items.slice(0, 5)
    : [];
  const activeMedications = medications.slice(0, 6);
  const tasksDue = tasksResult.ok
    ? [...tasksResult.data.items]
        .sort((a, b) => {
          const aDue = a.due_at ?? "9999-12-31T00:00:00Z";
          const bDue = b.due_at ?? "9999-12-31T00:00:00Z";
          return aDue.localeCompare(bDue);
        })
        .slice(0, 3)
    : [];

  const painOverTimeData = recentFlares.map((entry) => ({
    occurred_at: entry.occurred_at,
    pain_peak: entry.pain_peak,
    pain_current: entry.pain_current,
  }));

  // ── Instrument cluster derivations ────────────────────────────────────────
  const allUpcomingAppointments = appointmentsResult.ok
    ? appointmentsResult.data.items
    : [];
  const nextAppointment = allUpcomingAppointments[0] ?? null;

  const flareWindowItems = flareWindowResult.ok
    ? flareWindowResult.data.items
    : [];
  const latestFlare =
    [...flareWindowItems].sort((a, b) =>
      b.occurred_at.localeCompare(a.occurred_at),
    )[0] ?? null;

  const nowMs = Date.now();
  const day30Ms = 30 * 24 * 60 * 60 * 1000;
  const flaresInLast30d = flareWindowItems.filter((e) => {
    const t = new Date(e.occurred_at).getTime();
    return t >= nowMs - day30Ms && t <= nowMs;
  }).length;
  const flaresInPrior30d = flareWindowItems.filter((e) => {
    const t = new Date(e.occurred_at).getTime();
    return t >= nowMs - 2 * day30Ms && t < nowMs - day30Ms;
  }).length;

  const latestComparison = recentVasomotor[0] ?? null;

  const overdueDecisionsCount = decisionsResult.ok
    ? decisionsResult.data.items.filter(
        (d) => d.target_date !== null && d.target_date < todayDate,
      ).length
    : 0;

  // Stale review: nodes never reviewed, or reviewed more than N days ago.
  // Sorted "staleest first" so the cluster sub-line names the worst offender.
  const staleCutoffMs =
    nowMs - STALE_REVIEW_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
  const staleDiagnoses = diagnosesResult.ok
    ? [...diagnosesResult.data.items]
        .filter((d) => {
          if (d.last_reviewed_at === null) return true;
          return new Date(d.last_reviewed_at).getTime() < staleCutoffMs;
        })
        .sort((a, b) => {
          // Nulls (never reviewed) sort first, then oldest review date next.
          const aT = a.last_reviewed_at
            ? new Date(a.last_reviewed_at).getTime()
            : -Infinity;
          const bT = b.last_reviewed_at
            ? new Date(b.last_reviewed_at).getTime()
            : -Infinity;
          return aT - bT;
        })
    : [];
  const staleFallbackToTasks = !diagnosesResult.ok;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.dashboard.title}
        description={strings.dashboard.subtitle}
        actions={<RangeSelector current={range} />}
      />

      {/* Instrument cluster: six glanceable metrics, single horizontal row on
          desktop, stacks gracefully on mobile. */}
      <InstrumentCluster
        latestFlare={latestFlare}
        flaresInLast30d={flaresInLast30d}
        flaresInPrior30d={flaresInPrior30d}
        latestComparison={latestComparison}
        nextAppointment={nextAppointment}
        openDecisionsCount={
          metricsResult.ok ? metricsResult.data.open_decisions_count : 0
        }
        overdueDecisionsCount={overdueDecisionsCount}
        staleDiagnoses={staleDiagnoses}
        openTasksCount={
          metricsResult.ok ? metricsResult.data.open_tasks_count : 0
        }
        staleFallbackToTasks={staleFallbackToTasks}
      />

      {/* Visit-prep CTA: only renders when an appointment is within 48h. */}
      <UpcomingPacketCta appointments={allUpcomingAppointments} />

      {/* Row 1: Active flare (renders null when no active flare) */}
      <ActiveFlareCard />

      {/* Row 2: Today — appointments + tasks merged */}
      <SectionCard
        title={strings.dashboard.sections.today}
        hint={
          metricsResult.ok
            ? `${formatString(strings.dashboard.counts.appointments, {
                count: metricsResult.data.upcoming_appointments_count,
              })} · ${formatString(strings.dashboard.counts.tasks, {
                count: metricsResult.data.open_tasks_count,
              })}`
            : undefined
        }
      >
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {strings.dashboard.sections.todayAppointments}
            </h3>
            {!appointmentsResult.ok ? (
              <ErrorState message={appointmentsResult.error.message} />
            ) : upcomingAppointments.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {emptyCtas.appointments}{" "}
                <Link
                  href="/schedule/appointments/new"
                  className="text-primary hover:underline"
                >
                  {emptyCtas.appointmentsCta}
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {upcomingAppointments.map((appt) => (
                  <li key={appt.id}>
                    <SectionRow
                      href="/schedule"
                      eyebrow={formatDateTime(appt.date_time)}
                      title={appt.purpose}
                      meta={
                        <>
                          {appt.provider ? <span>{appt.provider}</span> : null}
                          {appt.specialty ? (
                            <span>· {appt.specialty}</span>
                          ) : null}
                        </>
                      }
                    />
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {strings.dashboard.sections.todayTasks}
            </h3>
            {!tasksResult.ok ? (
              <ErrorState message={tasksResult.error.message} />
            ) : tasksDue.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {emptyCtas.tasks}{" "}
                <Link
                  href="/schedule/tasks/new"
                  className="text-primary hover:underline"
                >
                  {emptyCtas.tasksCta}
                </Link>
              </p>
            ) : (
              <ul className="flex flex-col gap-1.5">
                {tasksDue.map((task) => {
                  const statusLabel =
                    TASK_STATUS_LABEL[task.status] ?? task.status;
                  const priorityVariant =
                    TASK_PRIORITY_VARIANT[task.priority] ?? "muted";
                  const priorityLabel =
                    strings.schedule.tasks.priorities[
                      task.priority as keyof typeof strings.schedule.tasks.priorities
                    ] ?? task.priority;
                  const isOverdue =
                    task.due_at !== null &&
                    task.due_at < nowIso &&
                    task.status !== "done" &&
                    task.status !== "cancelled";
                  return (
                    <li key={task.id}>
                      <SectionRow
                        tone={isOverdue ? "urgent" : "default"}
                        title={task.title}
                        meta={
                          <>
                            <span>{statusLabel}</span>
                            <span>
                              ·{" "}
                              {isOverdue
                                ? `${strings.dashboard.overduePrefix}${
                                    task.due_at
                                      ? formatString(
                                          strings.dashboard.tasks.due,
                                          {
                                            when: formatDateTime(task.due_at),
                                          },
                                        )
                                      : strings.dashboard.tasks.noDue
                                  }`
                                : task.due_at
                                  ? formatString(strings.dashboard.tasks.due, {
                                      when: formatDateTime(task.due_at),
                                    })
                                  : strings.dashboard.tasks.noDue}
                            </span>
                          </>
                        }
                        trailing={
                          isOverdue ? (
                            <Badge variant="destructive">
                              {strings.dashboard.overdue}
                            </Badge>
                          ) : task.priority !== "normal" &&
                            task.priority !== "low" ? (
                            <Badge variant={priorityVariant}>
                              {priorityLabel}
                            </Badge>
                          ) : null
                        }
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </SectionCard>

      {/* Row 3: Pain over time chart */}
      <PainOverTimeChart data={painOverTimeData} />

      {/* Row 4: 2-col grid with remaining sections */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <SectionCard
          title={strings.dashboard.sections.openDecisions}
          hint={
            metricsResult.ok
              ? formatString(strings.dashboard.counts.decisions, {
                  count: metricsResult.data.open_decisions_count,
                })
              : undefined
          }
          href="/decisions"
          hrefLabel={strings.dashboard.viewAll}
        >
          {!decisionsResult.ok ? (
            <ErrorState message={decisionsResult.error.message} />
          ) : openDecisions.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {emptyCtas.decisions}{" "}
              <Link
                href="/decisions/new"
                className="text-primary hover:underline"
              >
                {emptyCtas.decisionsCta}
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {openDecisions.map((decision) => {
                const statusLabel =
                  strings.decisions.statuses[
                    decision.status as keyof typeof strings.decisions.statuses
                  ] ?? decision.status;
                const isOverdue =
                  decision.target_date !== null &&
                  decision.target_date < todayDate;
                return (
                  <li key={decision.id}>
                    <SectionRow
                      href="/decisions"
                      tone={isOverdue ? "urgent" : "default"}
                      title={decision.title}
                      meta={
                        decision.target_date ? (
                          <span>
                            {isOverdue ? strings.dashboard.overduePrefix : null}
                            {formatDate(decision.target_date)}
                          </span>
                        ) : null
                      }
                      trailing={
                        isOverdue ? (
                          <Badge variant="destructive">
                            {strings.dashboard.overdue}
                          </Badge>
                        ) : (
                          <Badge variant="muted">{statusLabel}</Badge>
                        )
                      }
                    />
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={strings.dashboard.sections.recentFlares}
          href="/pain-book?filter=flares"
          hrefLabel={strings.dashboard.viewAll}
        >
          {!flaresResult.ok ? (
            <ErrorState message={flaresResult.error.message} />
          ) : recentFlares.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {emptyCtas.flares}{" "}
              <Link href="/flare" className="text-primary hover:underline">
                {emptyCtas.flaresCta}
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {recentFlares.map((entry) => (
                <li key={entry.id}>
                  <SectionRow
                    href={`/pain-book/${entry.id}/edit`}
                    eyebrow={formatDateTime(entry.occurred_at)}
                    title={entry.title}
                    trailing={
                      entry.pain_peak !== null ? (
                        <Badge
                          variant={
                            entry.pain_peak >= 8 ? "destructive" : "primary"
                          }
                        >
                          Peak {entry.pain_peak}
                        </Badge>
                      ) : null
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard title={strings.dashboard.sections.recentComparisons}>
          {!vasomotorResult.ok ? (
            <ErrorState message={vasomotorResult.error.message} />
          ) : recentVasomotor.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {emptyCtas.comparisons}{" "}
              <Link
                href="/vasomotor/new"
                className="text-primary hover:underline"
              >
                {emptyCtas.comparisonsCta}
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {recentVasomotor.map((measurement) => (
                <li key={measurement.id}>
                  <SectionRow
                    eyebrow={formatRelative(measurement.measured_at)}
                    title={measurement.site}
                    meta={
                      measurement.context !== "custom" ? (
                        <span>
                          {strings.vasomotor.contexts[
                            measurement.context as keyof typeof strings.vasomotor.contexts
                          ] ?? measurement.context}
                        </span>
                      ) : null
                    }
                    trailing={
                      measurement.delta_c !== null ? (
                        <Badge variant="primary">
                          Δ {measurement.delta_c.toFixed(1)}°C
                        </Badge>
                      ) : null
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title={strings.dashboard.sections.currentMeds}
          href="/medications"
          hrefLabel={strings.dashboard.viewAll}
        >
          {!medicationsResult.ok ? (
            <ErrorState message={medicationsResult.error.message} />
          ) : activeMedications.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {emptyCtas.medications}{" "}
              <Link
                href="/medications/new"
                className="text-primary hover:underline"
              >
                {emptyCtas.medicationsCta}
              </Link>
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {activeMedications.map((med) => (
                <li key={med.id}>
                  <SectionRow
                    title={med.name}
                    meta={
                      <>
                        {med.dose ? <span>{med.dose}</span> : null}
                        {med.frequency ? <span>· {med.frequency}</span> : null}
                      </>
                    }
                  />
                </li>
              ))}
            </ul>
          )}
        </SectionCard>
      </div>

      {/* Row 5: Trends — collapsed by default. Charts only mount when expanded
          to avoid Recharts ResponsiveContainer measuring 0x0 on first paint. */}
      <TrendsAccordion>
        {!metricsResult.ok ? (
          <ErrorState message={metricsResult.error.message} />
        ) : (
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <FlareFrequencyChart data={metricsResult.data.flares_per_week} />
            <RecoveryTimeChart data={metricsResult.data.recovery} />
            <TriggerFrequencyChart
              data={metricsResult.data.trigger_frequency}
              triggers={referenceData.triggers}
            />
            <PainByRegionChart
              data={metricsResult.data.pain_by_body_region}
              bodyRegions={referenceData.body_regions}
            />
            <VasomotorDeltaChart
              data={metricsResult.data.vasomotor_deltas_over_time}
            />
            <MedicationResponseSummaryChart
              data={metricsResult.data.medication_response_summary}
              medications={medications}
            />
          </div>
        )}
      </TrendsAccordion>
    </div>
  );
}
