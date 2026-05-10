"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Pencil,
  X,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  commitAiImportDraft,
  rejectAiImportDraft,
  updateAiImportDraft,
} from "@/server/actions/ai-import";
import type { AiImportDraft } from "@/server/contracts";
import { format, strings } from "@/lib/strings";
import { formatDate } from "@/lib/format";
import { userFacingErrorMessage } from "@/lib/result";
import { cn } from "@/lib/utils";
import { ImportDraftStatusBadge } from "./import-status-badge";

interface ImportDraftCardProps {
  draft: AiImportDraft;
  canWrite: boolean;
  highlight?: boolean;
  onUpdated: (next: AiImportDraft) => void;
  onCommitted: (next: AiImportDraft) => void;
  onRejected: (next: AiImportDraft) => void;
}

function targetTypeLabel(value: AiImportDraft["target_type"]): string {
  return (
    strings.importNs.targetTypes[
      value as keyof typeof strings.importNs.targetTypes
    ] ?? value
  );
}

function confidenceLabel(value: AiImportDraft["confidence"]): string {
  return (
    strings.importNs.confidences[
      value as keyof typeof strings.importNs.confidences
    ] ?? value
  );
}

function safeStringify(value: unknown): string {
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export function ImportDraftCard({
  draft,
  canWrite,
  highlight,
  onUpdated,
  onCommitted,
  onRejected,
}: ImportDraftCardProps) {
  const [showPayload, setShowPayload] = React.useState(false);
  const [editing, setEditing] = React.useState(false);
  const [draftJson, setDraftJson] = React.useState(() =>
    safeStringify(draft.proposed_payload),
  );
  const [jsonInvalid, setJsonInvalid] = React.useState(false);
  const [savingEdit, setSavingEdit] = React.useState(false);
  const [commitOpen, setCommitOpen] = React.useState(false);
  const [committing, setCommitting] = React.useState(false);
  const [rejectOpen, setRejectOpen] = React.useState(false);
  const [rejecting, setRejecting] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState("");
  const [error, setError] = React.useState<string | null>(null);

  const isProposed = draft.status === "proposed";

  const handleStartEdit = () => {
    setDraftJson(safeStringify(draft.proposed_payload));
    setJsonInvalid(false);
    setEditing(true);
  };

  const handleSaveEdit = async () => {
    let parsed: Record<string, unknown>;
    try {
      const candidate = JSON.parse(draftJson);
      if (
        candidate === null ||
        typeof candidate !== "object" ||
        Array.isArray(candidate)
      ) {
        throw new Error("not an object");
      }
      parsed = candidate as Record<string, unknown>;
    } catch {
      setJsonInvalid(true);
      return;
    }
    setSavingEdit(true);
    setError(null);
    const result = await updateAiImportDraft({
      id: draft.id,
      proposed_payload: parsed,
    });
    setSavingEdit(false);
    if (!result.ok) {
      setError(userFacingErrorMessage(result.error));
      return;
    }
    onUpdated(result.data);
    setEditing(false);
  };

  const handleCommit = async () => {
    setCommitting(true);
    setError(null);
    const result = await commitAiImportDraft({ id: draft.id });
    setCommitting(false);
    if (!result.ok) {
      setError(userFacingErrorMessage(result.error));
      setCommitOpen(false);
      return;
    }
    onCommitted(result.data.draft);
    setCommitOpen(false);
  };

  const handleReject = async () => {
    const reason = rejectReason.trim();
    if (reason.length === 0) return;
    setRejecting(true);
    setError(null);
    const result = await rejectAiImportDraft({ id: draft.id, reason });
    setRejecting(false);
    if (!result.ok) {
      setError(userFacingErrorMessage(result.error));
      setRejectOpen(false);
      return;
    }
    onRejected(result.data);
    setRejectOpen(false);
    setRejectReason("");
  };

  return (
    <article
      id={`draft-${draft.id}`}
      className={cn(
        "flex flex-col gap-3 rounded-md border bg-card p-4 transition-colors",
        highlight
          ? "border-primary/40 ring-2 ring-primary/15"
          : "border-border",
      )}
    >
      <header className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">
            {targetTypeLabel(draft.target_type)}
          </p>
          <h3 className="text-base font-semibold tracking-tight">
            {draft.title ?? strings.agent.drafts.untitled}
          </h3>
        </div>
        <ImportDraftStatusBadge status={draft.status} />
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        <Badge
          variant={
            draft.confidence === "high"
              ? "primary"
              : draft.confidence === "medium"
                ? "accent"
                : "muted"
          }
        >
          {confidenceLabel(draft.confidence)}
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

      {draft.status === "committed" ? (
        <p className="text-xs text-muted-foreground">
          {format(strings.importNs.drafts.committedNote, {
            date: formatDate(draft.committed_at ?? draft.updated_at),
          })}
        </p>
      ) : null}
      {draft.status === "rejected" && draft.rejected_reason ? (
        <p className="text-xs text-muted-foreground">
          {format(strings.importNs.drafts.rejectedNote, {
            reason: draft.rejected_reason,
          })}
        </p>
      ) : null}
      {draft.status === "failed" ? (
        <p className="text-xs text-destructive">
          {strings.importNs.drafts.failedNote}
        </p>
      ) : null}

      {draft.warnings.length > 0 ? (
        <ul className="rounded-sm bg-destructive/5 px-2 py-1.5 text-sm leading-6 text-foreground">
          <li className="font-medium text-destructive">
            {strings.importNs.drafts.warningsLabel}
          </li>
          {draft.warnings.map((warning, idx) => (
            <li key={idx}>· {warning}</li>
          ))}
        </ul>
      ) : null}

      {draft.missing_fields.length > 0 ? (
        <p className="text-sm leading-6 text-muted-foreground">
          <span className="font-medium">
            {strings.importNs.drafts.missingLabel}:
          </span>{" "}
          {draft.missing_fields.join(", ")}
        </p>
      ) : null}

      {draft.validation_errors.length > 0 ? (
        <ul className="rounded-sm bg-destructive/5 px-2 py-1.5 text-sm leading-6">
          <li className="font-medium text-destructive">
            {strings.importNs.drafts.validationLabel}
          </li>
          {draft.validation_errors.map((issue, idx) => (
            <li key={idx} className="text-foreground">
              · <span className="font-mono">{issue.path}</span>: {issue.message}
            </li>
          ))}
        </ul>
      ) : null}

      {draft.evidence_spans.length > 0 ? (
        <details className="rounded-sm bg-muted/40 px-2 py-1.5">
          <summary className="cursor-pointer text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {strings.importNs.drafts.evidenceLabel} (
            {draft.evidence_spans.length})
          </summary>
          <ul className="mt-1 flex flex-col gap-1 text-sm leading-6">
            {draft.evidence_spans.map((span, idx) => (
              <li key={idx}>
                <span className="font-mono text-xs text-muted-foreground">
                  {span.field}
                </span>
                <span className="ml-2 italic">“{span.quote}”</span>
              </li>
            ))}
          </ul>
        </details>
      ) : null}

      <div>
        <button
          type="button"
          onClick={() => setShowPayload((prev) => !prev)}
          className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1"
          aria-expanded={showPayload}
        >
          {showPayload ? (
            <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <ChevronRight aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          {showPayload
            ? strings.importNs.drafts.hidePayload
            : strings.importNs.drafts.showPayload}
        </button>
        {showPayload ? (
          <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap break-words rounded-sm bg-muted/40 p-2 font-mono text-xs leading-5 text-foreground">
            {safeStringify(draft.proposed_payload)}
          </pre>
        ) : null}
      </div>

      {error ? (
        <Alert variant="destructive">
          <AlertTriangle aria-hidden="true" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {canWrite && isProposed ? (
        <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <Button
            type="button"
            onClick={() => setCommitOpen(true)}
            disabled={committing || rejecting || savingEdit}
            className="gap-1.5"
          >
            <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
            {strings.importNs.actions.commit}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setRejectOpen(true)}
            disabled={committing || rejecting || savingEdit}
            className="gap-1.5"
          >
            <X aria-hidden="true" className="h-4 w-4" />
            {strings.importNs.actions.reject}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleStartEdit}
            disabled={committing || rejecting || savingEdit}
            className="gap-1.5"
          >
            <Pencil aria-hidden="true" className="h-4 w-4" />
            {strings.importNs.actions.edit}
          </Button>
        </div>
      ) : null}

      <Dialog
        open={editing}
        onOpenChange={(open) => !savingEdit && setEditing(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{strings.importNs.edit.title}</DialogTitle>
            <DialogDescription>{strings.importNs.edit.hint}</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Textarea
              rows={14}
              value={draftJson}
              onChange={(event) => {
                setDraftJson(event.target.value);
                setJsonInvalid(false);
              }}
              className="font-mono text-xs"
              spellCheck={false}
            />
            {jsonInvalid ? (
              <p className="text-xs text-destructive">
                {strings.importNs.edit.jsonInvalid}
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setEditing(false)}
              disabled={savingEdit}
            >
              {strings.importNs.actions.cancelEdit}
            </Button>
            <Button
              type="button"
              onClick={handleSaveEdit}
              disabled={savingEdit}
            >
              {savingEdit
                ? strings.importNs.actions.savingEdit
                : strings.importNs.actions.saveEdit}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={commitOpen}
        onOpenChange={(open) => !committing && setCommitOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{strings.importNs.commit.title}</DialogTitle>
            <DialogDescription>
              {format(strings.importNs.commit.body, {
                target: targetTypeLabel(draft.target_type),
              })}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCommitOpen(false)}
              disabled={committing}
            >
              {strings.importNs.commit.cancel}
            </Button>
            <Button type="button" onClick={handleCommit} disabled={committing}>
              {committing
                ? strings.importNs.actions.committing
                : strings.importNs.commit.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={rejectOpen}
        onOpenChange={(open) => !rejecting && setRejectOpen(open)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{strings.importNs.reject.title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor={`reject-${draft.id}`}>
              {strings.importNs.reject.reasonLabel}
            </Label>
            <Textarea
              id={`reject-${draft.id}`}
              rows={4}
              value={rejectReason}
              onChange={(event) => setRejectReason(event.target.value)}
              placeholder={strings.importNs.reject.reasonPlaceholder}
              maxLength={2000}
              required
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setRejectOpen(false)}
              disabled={rejecting}
            >
              {strings.importNs.reject.cancel}
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleReject}
              disabled={rejecting || rejectReason.trim().length === 0}
            >
              {rejecting
                ? strings.importNs.actions.rejecting
                : strings.importNs.reject.confirm}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}
