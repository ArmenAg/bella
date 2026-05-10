"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ToggleChip } from "@/components/entries/toggle-chip";
import { strings } from "@/lib/strings";

export type AppointmentScope = "upcoming" | "all" | "completed";

export interface AppointmentFilterProps {
  current: AppointmentScope;
}

export function AppointmentFilter({ current }: AppointmentFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const setScope = (next: AppointmentScope) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", "appointments");
    if (next === "upcoming") {
      params.delete("scope");
    } else {
      params.set("scope", next);
    }
    startTransition(() => {
      router.push(`/schedule?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToggleChip
        active={current === "upcoming"}
        onToggle={() => setScope("upcoming")}
        disabled={pending}
      >
        {strings.schedule.appointments.filters.upcoming}
      </ToggleChip>
      <ToggleChip
        active={current === "all"}
        onToggle={() => setScope("all")}
        disabled={pending}
      >
        {strings.schedule.appointments.filters.all}
      </ToggleChip>
      <ToggleChip
        active={current === "completed"}
        onToggle={() => setScope("completed")}
        disabled={pending}
      >
        {strings.schedule.appointments.filters.completed}
      </ToggleChip>
    </div>
  );
}
