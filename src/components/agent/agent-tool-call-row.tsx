"use client";

import * as React from "react";
import { ChevronDown, ChevronRight, Wrench } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { AgentToolCall } from "@/server/contracts";
import { formatDateTime, safeStringify } from "@/lib/format";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

function statusVariant(
  status: AgentToolCall["status"],
): "default" | "muted" | "destructive" | "primary" | "outline" | "accent" {
  switch (status) {
    case "succeeded":
      return "primary";
    case "running":
    case "pending":
      return "accent";
    case "failed":
      return "destructive";
    case "cancelled":
      return "muted";
    default:
      return "outline";
  }
}

export function AgentToolCallRow({ call }: { call: AgentToolCall }) {
  const [open, setOpen] = React.useState(false);
  const statusLabel =
    strings.agent.tools.statuses[
      call.status as keyof typeof strings.agent.tools.statuses
    ] ?? call.status;
  const startedAt = call.started_at ?? call.created_at;

  return (
    <article className="rounded-md border border-border bg-card p-3">
      <header className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm">
          <span className="flex h-5 w-5 items-center justify-center rounded bg-muted text-muted-foreground">
            <Wrench aria-hidden="true" className="h-3 w-3" />
          </span>
          <span className="font-mono text-xs text-foreground">
            {String(call.tool_name)}
          </span>
        </div>
        <Badge variant={statusVariant(call.status)}>{statusLabel}</Badge>
      </header>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {formatDateTime(startedAt)}
      </p>
      {call.error_message ? (
        <p className="mt-2 text-xs text-destructive">
          <span className="font-medium">
            {strings.agent.tools.errorLabel}:{" "}
          </span>
          {call.error_message}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        )}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown aria-hidden="true" className="h-3 w-3" />
        ) : (
          <ChevronRight aria-hidden="true" className="h-3 w-3" />
        )}
        {open ? strings.agent.tools.hideIO : strings.agent.tools.showIO}
      </button>
      {open ? (
        <div className="mt-2 flex flex-col gap-2">
          <details open className="rounded-sm bg-muted/40 px-2 py-1.5">
            <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {strings.agent.tools.inputLabel}
            </summary>
            <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-foreground">
              {Object.keys(call.input).length === 0
                ? strings.agent.tools.noInput
                : safeStringify(call.input)}
            </pre>
          </details>
          <details className="rounded-sm bg-muted/40 px-2 py-1.5">
            <summary className="cursor-pointer text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
              {strings.agent.tools.outputLabel}
            </summary>
            <pre className="mt-1 max-h-60 overflow-auto whitespace-pre-wrap break-words font-mono text-[11px] leading-5 text-foreground">
              {call.output == null
                ? strings.agent.tools.noOutput
                : safeStringify(call.output)}
            </pre>
          </details>
        </div>
      ) : null}
    </article>
  );
}
