import Link from "next/link";
import { CalendarDays, User } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { strings } from "@/lib/strings";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { Decision } from "@/server/contracts";

const STATUS_VARIANT: Record<Decision["status"], BadgeProps["variant"]> = {
  open: "muted",
  waiting_on_test: "muted",
  waiting_on_clinician: "muted",
  revisiting: "muted",
  decided: "muted",
  rejected: "muted",
};

export interface DecisionCardProps {
  decision: Decision;
  href: string;
}

export function DecisionCard({ decision, href }: DecisionCardProps) {
  const statusLabel =
    strings.decisions.statuses[
      decision.status as keyof typeof strings.decisions.statuses
    ] ?? decision.status;

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-2.5 transition-colors hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="line-clamp-2 text-sm font-semibold leading-5 text-foreground">
          {decision.title}
        </p>
        <Badge variant={STATUS_VARIANT[decision.status]}>{statusLabel}</Badge>
      </div>
      <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
        {decision.question?.trim()
          ? decision.question
          : strings.decisions.list.noQuestion}
      </p>
      {decision.target_date || decision.owner ? (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
          {decision.target_date ? (
            <span className="inline-flex items-center gap-1">
              <CalendarDays aria-hidden="true" className="h-3 w-3" />
              {formatDate(decision.target_date)}
            </span>
          ) : null}
          {decision.owner ? (
            <span className="inline-flex items-center gap-1">
              <User aria-hidden="true" className="h-3 w-3" />
              <span className="truncate">{decision.owner}</span>
            </span>
          ) : null}
        </div>
      ) : null}
    </Link>
  );
}
