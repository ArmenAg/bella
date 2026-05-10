"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ToggleChip } from "@/components/entries/toggle-chip";
import { strings } from "@/lib/strings";

export type DashboardRange = "7" | "30" | "90";

export interface RangeSelectorProps {
  current: DashboardRange;
}

const ORDER: {
  value: DashboardRange;
  labelKey: "last7" | "last30" | "last90";
}[] = [
  { value: "7", labelKey: "last7" },
  { value: "30", labelKey: "last30" },
  { value: "90", labelKey: "last90" },
];

export function RangeSelector({ current }: RangeSelectorProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const setRange = (next: DashboardRange) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "30") {
      params.delete("range");
    } else {
      params.set("range", next);
    }
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.push(url);
    });
  };

  return (
    <div
      className="flex flex-wrap items-center gap-1.5"
      role="group"
      aria-label={strings.dashboard.metricsRange.label}
    >
      <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {strings.dashboard.metricsRange.label}
      </span>
      {ORDER.map((item) => (
        <ToggleChip
          key={item.value}
          active={current === item.value}
          onToggle={() => setRange(item.value)}
          disabled={pending}
        >
          {strings.dashboard.metricsRange[item.labelKey]}
        </ToggleChip>
      ))}
    </div>
  );
}
