"use client";

import * as React from "react";
import Link from "next/link";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

export type ScheduleTab = "appointments" | "tasks";

export interface ScheduleTabsProps {
  current: ScheduleTab;
}

export function ScheduleTabs({ current }: ScheduleTabsProps) {
  const tabs: { id: ScheduleTab; label: string }[] = [
    { id: "appointments", label: strings.schedule.tabs.appointments },
    { id: "tasks", label: strings.schedule.tabs.tasks },
  ];

  return (
    <div
      role="tablist"
      aria-label={strings.schedule.title}
      className="flex w-full max-w-sm items-center gap-1 rounded-md border border-border bg-card p-1"
    >
      {tabs.map((tab) => {
        const active = current === tab.id;
        return (
          <Link
            key={tab.id}
            role="tab"
            aria-selected={active}
            href={`/schedule?tab=${tab.id}`}
            className={cn(
              "flex-1 rounded-sm px-3 py-1.5 text-center text-sm font-medium transition-colors",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
