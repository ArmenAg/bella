"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";

import { ToggleChip } from "@/components/entries/toggle-chip";
import { strings } from "@/lib/strings";

const STATUS_KEYS = [
  "unreviewed",
  "suspected",
  "supported",
  "weakened",
  "ruled_out",
  "confirmed",
  "monitoring",
] as const;

const CONFIDENCE_KEYS = ["unknown", "low", "moderate", "high"] as const;

export type DiagnosisStatusKey = (typeof STATUS_KEYS)[number];
export type DiagnosisConfidenceKey = (typeof CONFIDENCE_KEYS)[number];

export interface DiagnosisTreeFiltersProps {
  status: DiagnosisStatusKey | null;
  confidence: DiagnosisConfidenceKey | null;
}

export function DiagnosisTreeFilters({
  status,
  confidence,
}: DiagnosisTreeFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const navigateWith = (
    nextStatus: DiagnosisStatusKey | null,
    nextConfidence: DiagnosisConfidenceKey | null,
  ) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (nextStatus) params.set("status", nextStatus);
    else params.delete("status");
    if (nextConfidence) params.set("confidence", nextConfidence);
    else params.delete("confidence");
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.push(url);
    });
  };

  return (
    <div className="flex flex-col gap-3 rounded-md border border-border bg-card/40 p-3">
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {strings.diagnoses.filters.status}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <ToggleChip
            active={status === null}
            onToggle={() => navigateWith(null, confidence)}
            disabled={pending}
          >
            {strings.diagnoses.filters.all}
          </ToggleChip>
          {STATUS_KEYS.map((key) => (
            <ToggleChip
              key={key}
              active={status === key}
              onToggle={() =>
                navigateWith(status === key ? null : key, confidence)
              }
              disabled={pending}
            >
              {strings.diagnoses.statuses[key]}
            </ToggleChip>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          {strings.diagnoses.filters.confidence}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <ToggleChip
            active={confidence === null}
            onToggle={() => navigateWith(status, null)}
            disabled={pending}
          >
            {strings.diagnoses.filters.all}
          </ToggleChip>
          {CONFIDENCE_KEYS.map((key) => (
            <ToggleChip
              key={key}
              active={confidence === key}
              onToggle={() =>
                navigateWith(status, confidence === key ? null : key)
              }
              disabled={pending}
            >
              {strings.diagnoses.confidences[key]}
            </ToggleChip>
          ))}
        </div>
      </div>
    </div>
  );
}
