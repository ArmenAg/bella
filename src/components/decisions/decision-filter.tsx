"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ToggleChip } from "@/components/entries/toggle-chip";
import { strings } from "@/lib/strings";

export interface DecisionFilterProps {
  current: "open" | "all";
}

export function DecisionFilter({ current }: DecisionFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const setFilter = (next: "open" | "all") => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "all") {
      params.set("scope", "all");
    } else {
      params.delete("scope");
    }
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.push(url);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <ToggleChip
        active={current === "open"}
        onToggle={() => setFilter("open")}
        disabled={pending}
      >
        {strings.decisions.list.openOnly}
      </ToggleChip>
      <ToggleChip
        active={current === "all"}
        onToggle={() => setFilter("all")}
        disabled={pending}
      >
        {strings.decisions.list.all}
      </ToggleChip>
    </div>
  );
}
