import * as React from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatRelative } from "@/lib/format";
import { strings } from "@/lib/strings";
import type { Appointment } from "@/server/contracts";

const packetStrings = strings.dashboard.packetCta;

interface UpcomingPacketCtaProps {
  appointments: Appointment[];
  // 48h window in milliseconds; defaulted but overridable for tests.
  windowMs?: number;
}

/**
 * Anticipatory banner: when an appointment falls within the next 48h, surface
 * a single primary-tinted strip linking to the visit packet. Renders nothing
 * otherwise — the dashboard layout flows up.
 */
export function UpcomingPacketCta({
  appointments,
  windowMs = 48 * 60 * 60 * 1000,
}: UpcomingPacketCtaProps) {
  const now = Date.now();
  const cutoff = now + windowMs;

  // Find the soonest upcoming appointment that lands inside the window.
  const candidate = appointments
    .filter((appt) => {
      const t = new Date(appt.date_time).getTime();
      return Number.isFinite(t) && t >= now && t <= cutoff;
    })
    .sort(
      (a, b) =>
        new Date(a.date_time).getTime() - new Date(b.date_time).getTime(),
    )[0];

  if (!candidate) return null;

  const providerLabel = candidate.provider ?? candidate.specialty ?? null;
  const title = providerLabel
    ? `${packetStrings.packPrefix}${providerLabel} — ${formatRelative(candidate.date_time)}`
    : `${packetStrings.packMissingProvider} — ${formatRelative(candidate.date_time)}`;

  const subParts: string[] = [];
  if (candidate.purpose) subParts.push(candidate.purpose);
  if (candidate.location) subParts.push(candidate.location);
  const subLine = subParts.length > 0 ? subParts.join(" · ") : null;

  return (
    <section
      aria-label={packetStrings.eyebrow}
      className="flex flex-col gap-3 rounded-md border border-primary/30 bg-primary/5 p-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-primary">
          {packetStrings.eyebrow}
        </p>
        <p className="mt-1 truncate text-sm font-semibold">{title}</p>
        {subLine ? (
          <p className="text-xs text-muted-foreground">{subLine}</p>
        ) : null}
      </div>
      <Button asChild size="sm">
        <Link href="/export?range=since-last-appt">{packetStrings.cta}</Link>
      </Button>
    </section>
  );
}
