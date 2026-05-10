"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { strings } from "@/lib/strings";

export type ExportTab = "clinician" | "bulk";

export interface ExportTabsProps {
  current: ExportTab;
}

export function ExportTabs({ current }: ExportTabsProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = React.useTransition();

  const setTab = (next: ExportTab) => {
    const params = new URLSearchParams(searchParams?.toString() ?? "");
    if (next === "clinician") {
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
      aria-label={strings.exportsNs.title}
      className="inline-flex w-full gap-1 rounded-md border border-border bg-card/40 p-1 sm:w-auto"
    >
      <TabButton
        active={current === "clinician"}
        pending={pending}
        onClick={() => setTab("clinician")}
      >
        {strings.exportsNs.tabs.clinician}
      </TabButton>
      <TabButton
        active={current === "bulk"}
        pending={pending}
        onClick={() => setTab("bulk")}
      >
        {strings.exportsNs.tabs.bulk}
      </TabButton>
    </div>
  );
}

function TabButton({
  active,
  pending,
  onClick,
  children,
}: {
  active: boolean;
  pending: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      disabled={pending}
      className={cn(
        "flex-1 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        "disabled:cursor-not-allowed disabled:opacity-60",
        active
          ? "bg-background text-foreground shadow-sm"
          : "text-muted-foreground hover:bg-muted",
      )}
    >
      {children}
    </button>
  );
}
