import * as React from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDate, formatRelative } from "@/lib/format";
import type {
  Appointment,
  DiagnosisNode,
  EntryDTO,
  VasomotorMeasurementDTO,
} from "@/server/contracts";

import { strings } from "@/lib/strings";

const cluster = strings.dashboard.cluster;

interface InstrumentClusterProps {
  latestFlare: EntryDTO | null;
  flaresInLast30d: number;
  flaresInPrior30d: number;
  latestComparison: VasomotorMeasurementDTO | null;
  nextAppointment: Appointment | null;
  openDecisionsCount: number;
  overdueDecisionsCount: number;
  staleDiagnoses: DiagnosisNode[];
  // Optional fallback used when staleDiagnoses cannot be derived; renders the
  // open-tasks count instead. The page is responsible for indicating intent —
  // we just render what we are given.
  openTasksCount?: number;
  staleFallbackToTasks?: boolean;
}

interface BlockProps {
  label: string;
  value: React.ReactNode;
  sub?: React.ReactNode;
  href?: string;
}

function Block({ label, value, sub, href }: BlockProps) {
  const content = (
    <div className="flex h-full flex-col gap-1 rounded-md border bg-card p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
      <p className="text-2xl font-semibold leading-none tabular-nums">
        {value}
      </p>
      {sub ? (
        <p className="text-xs text-muted-foreground leading-snug">{sub}</p>
      ) : null}
    </div>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md hover:[&>div]:bg-muted/50"
      >
        {content}
      </Link>
    );
  }

  return content;
}

function nextApptCountdown(dateTime: string): {
  short: string;
  isToday: boolean;
} {
  const target = new Date(dateTime);
  const now = new Date();
  const diffMs = target.getTime() - now.getTime();
  const diffMin = Math.round(diffMs / 60000);
  const diffHr = Math.round(diffMs / 3600000);
  const diffDay = Math.round(diffMs / 86400000);

  if (diffMs < 0) {
    // Past — should not normally appear since we filter upcoming, but be safe.
    return { short: formatRelative(dateTime), isToday: false };
  }
  if (diffMin < 60) {
    return { short: `in ${Math.max(diffMin, 1)}m`, isToday: true };
  }
  if (diffHr < 24) {
    // Same calendar day if hours difference doesn't cross midnight.
    const sameDay = target.toDateString() === now.toDateString();
    return {
      short: sameDay ? cluster.nextAppt.today : `in ${diffHr}h`,
      isToday: sameDay,
    };
  }
  if (diffDay === 1) {
    return { short: cluster.nextAppt.tomorrow, isToday: false };
  }
  if (diffDay < 14) {
    return { short: `in ${diffDay}d`, isToday: false };
  }
  if (diffDay < 60) {
    return { short: `in ${Math.round(diffDay / 7)}w`, isToday: false };
  }
  return { short: `in ${Math.round(diffDay / 30)}mo`, isToday: false };
}

export function InstrumentCluster({
  latestFlare,
  flaresInLast30d,
  flaresInPrior30d,
  latestComparison,
  nextAppointment,
  openDecisionsCount,
  overdueDecisionsCount,
  staleDiagnoses,
  openTasksCount,
  staleFallbackToTasks,
}: InstrumentClusterProps) {
  // 1) Last flare
  const lastFlareValue = latestFlare
    ? formatRelative(latestFlare.occurred_at)
    : cluster.lastFlare.none;
  const lastFlareSub = latestFlare ? formatDate(latestFlare.occurred_at) : null;

  // 2) Flares 30d delta
  const flareDelta = flaresInLast30d - flaresInPrior30d;
  let flaresSub: React.ReactNode = null;
  if (flareDelta !== 0) {
    const isUp = flareDelta > 0;
    const Icon = isUp ? ArrowUp : ArrowDown;
    flaresSub = (
      <span
        className={cn(
          "inline-flex items-center gap-1",
          isUp ? "text-destructive" : "text-emerald-600 dark:text-emerald-500",
        )}
      >
        <Icon aria-hidden="true" className="h-3 w-3" />
        <span>
          {isUp ? cluster.flares30d.up : cluster.flares30d.down} {flaresInPrior30d}
        </span>
      </span>
    );
  }

  // 3) Last comparison
  const lastComparisonValue = latestComparison
    ? formatRelative(latestComparison.measured_at)
    : cluster.lastComparison.none;
  const lastComparisonSub = latestComparison?.site ?? null;

  // 4) Next appointment
  let nextApptValue: string = cluster.nextAppt.nonePeriod;
  let nextApptSub: React.ReactNode = cluster.nextAppt.none;
  if (nextAppointment) {
    const { short } = nextApptCountdown(nextAppointment.date_time);
    nextApptValue = short;
    nextApptSub = nextAppointment.provider ?? nextAppointment.purpose;
  }

  // 5) Open decisions
  const openDecisionsValue = openDecisionsCount;
  const openDecisionsSub =
    openDecisionsCount === 0
      ? null
      : overdueDecisionsCount > 0
        ? (
          <span className="text-destructive">
            {overdueDecisionsCount} {cluster.openDecisions.overdueSuffix}
          </span>
        )
        : cluster.openDecisions.noneOverdue;

  // 6) Stale review (or fallback to open tasks)
  let staleLabel: string = cluster.staleReview.label;
  let staleValue: React.ReactNode = 0;
  let staleSub: React.ReactNode = cluster.staleReview.none;
  let staleHref: string | undefined = "/diagnostic-tree";

  if (staleFallbackToTasks) {
    staleLabel = "Open tasks";
    staleValue = openTasksCount ?? 0;
    staleSub = (openTasksCount ?? 0) > 0 ? null : "All clear";
    staleHref = "/schedule";
  } else if (staleDiagnoses.length > 0) {
    staleValue = staleDiagnoses.length;
    const staleest = staleDiagnoses[0];
    staleSub = staleest.last_reviewed_at
      ? `${staleest.title} · ${cluster.staleReview.over90}`
      : `${staleest.title} · ${cluster.staleReview.neverReviewed}`;
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
      <Block
        label={cluster.lastFlare.label}
        value={lastFlareValue}
        sub={lastFlareSub}
        href="/pain-book?filter=flares"
      />
      <Block
        label={cluster.flares30d.label}
        value={flaresInLast30d}
        sub={flaresSub}
        href="/pain-book?filter=flares"
      />
      <Block
        label={cluster.lastComparison.label}
        value={lastComparisonValue}
        sub={lastComparisonSub}
        href="/vasomotor"
      />
      <Block
        label={cluster.nextAppt.label}
        value={nextApptValue}
        sub={nextApptSub}
        href="/schedule"
      />
      <Block
        label={cluster.openDecisions.label}
        value={openDecisionsValue}
        sub={openDecisionsSub}
        href="/decisions"
      />
      <Block
        label={staleLabel}
        value={staleValue}
        sub={staleSub}
        href={staleHref}
      />
    </div>
  );
}

