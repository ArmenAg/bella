"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ToggleChip } from "@/components/entries/toggle-chip";
import { strings } from "@/lib/strings";

export type MedicationsTab = "current" | "past" | "responses";

const TAB_ORDER: MedicationsTab[] = ["current", "past", "responses"];

export interface MedicationsTabsProps {
  current: MedicationsTab;
}

export function MedicationsTabs({ current }: MedicationsTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const setTab = (next: MedicationsTab) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "current") {
      params.delete("tab");
    } else {
      params.set("tab", next);
    }
    const query = params.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    startTransition(() => {
      router.push(url);
    });
  };

  return (
    <div
      role="tablist"
      aria-label={strings.medications.title}
      className="flex flex-wrap items-center gap-1.5"
    >
      {TAB_ORDER.map((tab) => (
        <ToggleChip
          key={tab}
          active={current === tab}
          onToggle={() => setTab(tab)}
          disabled={pending}
        >
          {strings.medications.tabs[tab]}
        </ToggleChip>
      ))}
    </div>
  );
}
