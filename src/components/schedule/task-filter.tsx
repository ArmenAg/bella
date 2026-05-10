"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ToggleChip } from "@/components/entries/toggle-chip";
import { strings } from "@/lib/strings";

export type TaskScope = "open" | "all";

export interface TaskFilterProps {
  current: TaskScope;
}

export function TaskFilter({ current }: TaskFilterProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const setScope = (next: TaskScope) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    params.set("tab", "tasks");
    if (next === "open") {
      params.delete("scope");
    } else {
      params.set("scope", "all");
    }
    startTransition(() => {
      router.push(`/schedule?${params.toString()}`);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToggleChip
        active={current === "open"}
        onToggle={() => setScope("open")}
        disabled={pending}
      >
        {strings.schedule.tasks.filters.openOnly}
      </ToggleChip>
      <ToggleChip
        active={current === "all"}
        onToggle={() => setScope("all")}
        disabled={pending}
      >
        {strings.schedule.tasks.filters.all}
      </ToggleChip>
    </div>
  );
}
