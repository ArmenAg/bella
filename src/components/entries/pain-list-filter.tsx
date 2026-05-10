"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ToggleChip } from "./toggle-chip";
import { strings } from "@/lib/strings";

export interface PainListFilterProps {
  current: "all" | "flares";
}

export function PainListFilter({ current }: PainListFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const setFilter = (next: "all" | "flares") => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "flares") {
      params.set("filter", "flares");
    } else {
      params.delete("filter");
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
        active={current === "all"}
        onToggle={() => setFilter("all")}
        disabled={pending}
      >
        {strings.painBook.list.filterAll}
      </ToggleChip>
      <ToggleChip
        active={current === "flares"}
        onToggle={() => setFilter("flares")}
        disabled={pending}
      >
        {strings.painBook.list.filterFlares}
      </ToggleChip>
    </div>
  );
}
