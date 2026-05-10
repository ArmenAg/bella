"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ToggleChip } from "@/components/entries/toggle-chip";
import { strings } from "@/lib/strings";

export type ProcedureTypeFilterValue =
  | "all"
  | "procedure_test"
  | "procedure"
  | "imaging"
  | "test_lab"
  | "consult";

const ORDER: ProcedureTypeFilterValue[] = [
  "all",
  "procedure_test",
  "procedure",
  "imaging",
  "test_lab",
  "consult",
];

export interface ProcedureTypeFilterProps {
  current: ProcedureTypeFilterValue;
}

export function ProcedureTypeFilter({ current }: ProcedureTypeFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const setFilter = (next: ProcedureTypeFilterValue) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "all") {
      params.delete("type");
    } else {
      params.set("type", next);
    }
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.push(url);
    });
  };

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {ORDER.map((value) => {
        const label =
          value === "all"
            ? strings.procedures.list.filterAll
            : strings.procedures.types[value];
        return (
          <ToggleChip
            key={value}
            active={current === value}
            onToggle={() => setFilter(value)}
            disabled={pending}
          >
            {label}
          </ToggleChip>
        );
      })}
    </div>
  );
}
