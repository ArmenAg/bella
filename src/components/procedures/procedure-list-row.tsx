import Link from "next/link";
import { Badge, type BadgeProps } from "@/components/ui/badge";
import { strings } from "@/lib/strings";
import { formatDate } from "@/lib/format";
import type { ProcedureEvent } from "@/server/contracts";
import { cn } from "@/lib/utils";

export interface ProcedureListRowProps {
  event: ProcedureEvent;
  href: string;
}

const ANSWERED_VARIANT: Record<
  Exclude<ProcedureEvent["answered_question"], null>,
  NonNullable<BadgeProps["variant"]>
> = {
  yes: "muted",
  partially: "muted",
  no: "muted",
  unclear: "muted",
};

export function ProcedureListRow({ event, href }: ProcedureListRowProps) {
  const typeLabel = strings.procedures.types[event.type];
  const answeredKey = event.answered_question;

  return (
    <Link
      href={href}
      className={cn(
        "flex flex-col gap-2 rounded-md border border-border bg-card px-4 py-3 transition-colors hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      )}
    >
      <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {formatDate(event.occurred_at)}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {event.title}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="muted">{typeLabel}</Badge>
          {answeredKey ? (
            <Badge variant={ANSWERED_VARIANT[answeredKey]}>
              {strings.procedures.list.answeredLabel}:{" "}
              {strings.procedures.answeredQuestion[answeredKey]}
            </Badge>
          ) : null}
        </div>
      </div>
      {event.provider ? (
        <p className="text-xs text-muted-foreground">{event.provider}</p>
      ) : null}
      {event.summary ? (
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {event.summary}
        </p>
      ) : null}
    </Link>
  );
}
