"use client";

import * as React from "react";
import { safeStringify } from "@/lib/format";
import Link from "next/link";
import {
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CircleCheck,
  ClipboardCheck,
  CircleSlash,
  Hourglass,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { AiImportDraft } from "@/server/contracts";
import { strings, format } from "@/lib/strings";
import { cn } from "@/lib/utils";

function targetTypeLabel(value: AiImportDraft["target_type"]): string {
  return (
    strings.agent.targetTypes[
      value as keyof typeof strings.agent.targetTypes
    ] ?? value
  );
}

function confidenceVariant(
  c: AiImportDraft["confidence"],
): "primary" | "accent" | "muted" {
  if (c === "high") return "primary";
  if (c === "medium") return "accent";
  return "muted";
}

function statusBadge(status: AiImportDraft["status"]) {
  switch (status) {
    case "committed":
      return {
        label: strings.agent.drafts.committedBadge,
        variant: "primary" as const,
        icon: CircleCheck,
      };
    case "rejected":
      return {
        label: strings.agent.drafts.rejectedBadge,
        variant: "muted" as const,
        icon: CircleSlash,
      };
    case "failed":
      return {
        label: strings.agent.drafts.failedBadge,
        variant: "destructive" as const,
        icon: AlertTriangle,
      };
    default:
      return {
        label: strings.agent.drafts.needsReview,
        variant: "accent" as const,
        icon: Hourglass,
      };
  }
}

export function AgentDraftCard({ draft }: { draft: AiImportDraft }) {
  const [open, setOpen] = React.useState(false);
  const status = statusBadge(draft.status);
  const StatusIcon = status.icon;
  return (
    <article className="flex flex-col gap-2 rounded-md border border-border bg-card p-3">
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-muted-foreground">
            {targetTypeLabel(draft.target_type)}
          </p>
          <h3 className="text-sm font-semibold leading-tight text-foreground">
            {draft.title ?? strings.agent.drafts.untitled}
          </h3>
        </div>
        <Badge variant={status.variant} className="shrink-0 gap-1">
          <StatusIcon aria-hidden="true" className="h-3 w-3" />
          {status.label}
        </Badge>
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge variant={confidenceVariant(draft.confidence)}>
          <span className="text-[10px] uppercase tracking-wider">
            {strings.agent.drafts.confidenceLabel}
          </span>
          <span className="ml-1">{draft.confidence}</span>
        </Badge>
        {draft.missing_fields.length > 0 ? (
          <Badge variant="muted">
            {format(
              draft.missing_fields.length === 1
                ? strings.importNs.missingCountSingular
                : strings.importNs.missingCountPlural,
              { count: draft.missing_fields.length },
            )}
          </Badge>
        ) : null}
        {draft.warnings.length > 0 ? (
          <Badge variant="destructive">
            {format(
              draft.warnings.length === 1
                ? strings.importNs.warningCountSingular
                : strings.importNs.warningCountPlural,
              { count: draft.warnings.length },
            )}
          </Badge>
        ) : null}
      </div>

      {draft.warnings.length > 0 ? (
        <ul className="rounded-sm bg-destructive/5 px-2 py-1.5 text-xs text-foreground">
          {draft.warnings.slice(0, 3).map((warning, idx) => (
            <li key={idx}>· {warning}</li>
          ))}
        </ul>
      ) : null}

      {draft.missing_fields.length > 0 ? (
        <p className="text-xs text-muted-foreground">
          <span className="font-medium">
            {strings.agent.drafts.missingLabel}:
          </span>{" "}
          {draft.missing_fields.join(", ")}
        </p>
      ) : null}

      {draft.validation_errors.length > 0 ? (
        <ul className="rounded-sm bg-destructive/5 px-2 py-1.5 text-xs">
          <li className="mb-0.5 font-medium text-destructive">
            {strings.agent.drafts.validationLabel}
          </li>
          {draft.validation_errors.slice(0, 4).map((issue, idx) => (
            <li key={idx} className="text-foreground">
              · <span className="font-mono">{issue.path}</span>: {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      {draft.evidence_spans.length > 0 ? (
        <div className="rounded-sm border border-border bg-muted/30 px-2 py-1.5">
          <p className="mb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {strings.agent.drafts.evidenceLabel}
          </p>
          <ul className="flex flex-col gap-1 text-xs leading-5">
            {draft.evidence_spans.slice(0, 3).map((span, idx) => (
              <li key={idx} className="flex flex-col">
                <span className="font-mono text-[10px] text-muted-foreground">
                  {span.field}
                </span>
                <span className="italic text-foreground">“{span.quote}”</span>
              </li>
            ))}
            {draft.evidence_spans.length > 3 ? (
              <li className="text-[10px] text-muted-foreground">
                + {draft.evidence_spans.length - 3} more
              </li>
            ) : null}
          </ul>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          "inline-flex items-center gap-1 self-start text-xs font-medium text-primary hover:underline",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
        )}
        aria-expanded={open}
      >
        {open ? (
          <ChevronDown aria-hidden="true" className="h-3 w-3" />
        ) : (
          <ChevronRight aria-hidden="true" className="h-3 w-3" />
        )}
        {open
          ? strings.agent.drafts.hidePayload
          : strings.agent.drafts.showPayload}
      </button>
      {open ? (
        <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words rounded-sm bg-muted/40 p-2 font-mono text-[11px] leading-5 text-foreground">
          {safeStringify(draft.proposed_payload)}
        </pre>
      ) : null}

      {draft.status === "proposed" ? (
        <Button
          asChild
          size="sm"
          variant="outline"
          className="self-start gap-1.5"
        >
          <Link href={`/import?draft=${draft.id}`}>
            <ClipboardCheck aria-hidden="true" className="h-3.5 w-3.5" />
            {strings.agent.drafts.deepLink}
          </Link>
        </Button>
      ) : null}
    </article>
  );
}
