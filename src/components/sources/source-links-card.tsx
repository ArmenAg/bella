"use client";

import * as React from "react";
import { Link as LinkIcon, Loader2, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field } from "@/components/entries/field";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

import {
  linkSourceToDecision,
  linkSourceToDiagnosis,
  linkSourceToEvent,
} from "@/server/actions/sources";
import type { Decision, DiagnosisNode, SourceLinks } from "@/server/contracts";
import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";

const DIRECTIONS = ["supports", "weakens", "neutral", "pending"] as const;

type DirectionValue = (typeof DIRECTIONS)[number];

export interface SourceLinksCardProps {
  sourceId: string;
  initialLinks?: SourceLinks;
  diagnoses: DiagnosisNode[];
  decisions: Decision[];
  canWrite: boolean;
}

type DialogKind = "event" | "diagnosis" | "decision" | null;

export function SourceLinksCard({
  sourceId,
  initialLinks,
  diagnoses,
  decisions,
  canWrite,
}: SourceLinksCardProps) {
  const [open, setOpen] = React.useState<DialogKind>(null);
  const [toast, setToast] = React.useState<string | null>(null);
  const links = initialLinks ?? {
    source_id: sourceId,
    events: [],
    diagnoses: [],
    decisions: [],
  };
  const hasLinks =
    links.events.length > 0 ||
    links.diagnoses.length > 0 ||
    links.decisions.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strings.sources.form.links}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {hasLinks ? (
          <ul className="flex flex-col gap-2 rounded-md border border-border p-3">
            {links.events.map((event) => (
              <li key={event.id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline">{strings.procedures.title}</Badge>
                <span className="truncate">{event.title}</span>
              </li>
            ))}
            {links.diagnoses.map((link) => (
              <li key={link.id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline">
                  {strings.sources.links.linkToDiagnosis}
                </Badge>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {link.diagnosis_id.slice(0, 8)}
                </code>
              </li>
            ))}
            {links.decisions.map((link) => (
              <li key={link.id} className="flex items-center gap-2 text-sm">
                <Badge variant="outline">
                  {strings.sources.links.linkToDecision}
                </Badge>
                <code className="rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {link.decision_id.slice(0, 8)}
                </code>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">
            {strings.sources.links.noLinks}
          </p>
        )}

        {toast ? (
          <Alert variant="info">
            <LinkIcon aria-hidden="true" />
            <AlertDescription>{toast}</AlertDescription>
          </Alert>
        ) : null}

        {!canWrite ? (
          <p className="text-sm text-muted-foreground">
            {strings.settings.profile.readOnlyNotice}
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen("event")}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {strings.sources.links.linkToEvent}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen("diagnosis")}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {strings.sources.links.linkToDiagnosis}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setOpen("decision")}
            >
              <Plus aria-hidden="true" className="h-4 w-4" />
              {strings.sources.links.linkToDecision}
            </Button>
          </div>
        )}
      </CardContent>

      <LinkEventDialog
        open={open === "event"}
        onOpenChange={(next) => setOpen(next ? "event" : null)}
        sourceId={sourceId}
        onSaved={() => setToast(strings.sources.links.linkAdded)}
      />
      <LinkDiagnosisDialog
        open={open === "diagnosis"}
        onOpenChange={(next) => setOpen(next ? "diagnosis" : null)}
        sourceId={sourceId}
        diagnoses={diagnoses}
        onSaved={() => setToast(strings.sources.links.linkAdded)}
      />
      <LinkDecisionDialog
        open={open === "decision"}
        onOpenChange={(next) => setOpen(next ? "decision" : null)}
        sourceId={sourceId}
        decisions={decisions}
        onSaved={() => setToast(strings.sources.links.linkAdded)}
      />
    </Card>
  );
}

interface LinkDialogProps {
  open: boolean;
  onOpenChange: (next: boolean) => void;
  sourceId: string;
  onSaved: () => void;
}

function LinkEventDialog({
  open,
  onOpenChange,
  sourceId,
  onSaved,
}: LinkDialogProps) {
  const [eventId, setEventId] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setEventId("");
      setError(null);
    }
  }, [open]);

  const isUuid =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      eventId.trim(),
    );

  const submit = async () => {
    if (!isUuid) {
      setError(strings.errors.validation);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await linkSourceToEvent({
        source_id: sourceId,
        event_id: eventId.trim(),
      });
      if (!result.ok) {
        setError(userFacingErrorMessage(result.error));
        return;
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{strings.sources.links.linkToEvent}</DialogTitle>
          <DialogDescription>
            {strings.sources.links.eventIdPlaceholder}
          </DialogDescription>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        <Field
          id="link-event-uuid"
          label={strings.sources.links.eventId}
          error={
            !isUuid && eventId.length > 0
              ? strings.errors.validation
              : undefined
          }
        >
          <Input
            id="link-event-uuid"
            value={eventId}
            onChange={(event) => setEventId(event.target.value)}
            placeholder={strings.sources.links.eventIdPlaceholder}
            autoFocus
          />
        </Field>
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {strings.actions.cancel}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={submitting || !isUuid}
          >
            {submitting ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                {strings.sources.links.submittingLink}
              </>
            ) : (
              strings.sources.links.submitLink
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface LinkDiagnosisDialogProps extends LinkDialogProps {
  diagnoses: DiagnosisNode[];
}

function LinkDiagnosisDialog({
  open,
  onOpenChange,
  sourceId,
  diagnoses,
  onSaved,
}: LinkDiagnosisDialogProps) {
  const [diagnosisId, setDiagnosisId] = React.useState("");
  const [direction, setDirection] = React.useState<DirectionValue>("pending");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setDiagnosisId("");
      setDirection("pending");
      setNote("");
      setError(null);
    }
  }, [open]);

  const orderedDiagnoses = React.useMemo(
    () =>
      [...diagnoses].sort((a, b) =>
        a.title.toLocaleLowerCase().localeCompare(b.title.toLocaleLowerCase()),
      ),
    [diagnoses],
  );

  const submit = async () => {
    if (!diagnosisId) {
      setError(strings.errors.validation);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await linkSourceToDiagnosis({
        source_id: sourceId,
        diagnosis_id: diagnosisId,
        direction,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      if (!result.ok) {
        setError(userFacingErrorMessage(result.error));
        return;
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{strings.sources.links.linkToDiagnosis}</DialogTitle>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {orderedDiagnoses.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {strings.sources.links.noBranches}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <Field
              id="link-diagnosis-id"
              label={strings.sources.links.selectDiagnosis}
            >
              <Select value={diagnosisId} onValueChange={setDiagnosisId}>
                <SelectTrigger id="link-diagnosis-id">
                  <SelectValue
                    placeholder={strings.sources.links.selectDiagnosis}
                  />
                </SelectTrigger>
                <SelectContent>
                  {orderedDiagnoses.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="link-diagnosis-direction"
              label={strings.sources.links.linkDirection}
            >
              <Select
                value={direction}
                onValueChange={(value) => setDirection(value as DirectionValue)}
              >
                <SelectTrigger id="link-diagnosis-direction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DIRECTIONS.map((value) => (
                    <SelectItem key={value} value={value}>
                      {strings.diagnoses.directions[value]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="link-diagnosis-note"
              label={strings.sources.links.note}
              optional
            >
              <Textarea
                id="link-diagnosis-note"
                rows={3}
                placeholder={strings.sources.links.notePlaceholder}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {strings.actions.cancel}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={submitting || !diagnosisId}
          >
            {submitting ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                {strings.sources.links.submittingLink}
              </>
            ) : (
              strings.sources.links.submitLink
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface LinkDecisionDialogProps extends LinkDialogProps {
  decisions: Decision[];
}

function LinkDecisionDialog({
  open,
  onOpenChange,
  sourceId,
  decisions,
  onSaved,
}: LinkDecisionDialogProps) {
  const [decisionId, setDecisionId] = React.useState("");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!open) {
      setDecisionId("");
      setNote("");
      setError(null);
    }
  }, [open]);

  const orderedDecisions = React.useMemo(
    () =>
      [...decisions].sort((a, b) =>
        a.title.toLocaleLowerCase().localeCompare(b.title.toLocaleLowerCase()),
      ),
    [decisions],
  );

  const submit = async () => {
    if (!decisionId) {
      setError(strings.errors.validation);
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      const result = await linkSourceToDecision({
        source_id: sourceId,
        decision_id: decisionId,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      if (!result.ok) {
        setError(userFacingErrorMessage(result.error));
        return;
      }
      onSaved();
      onOpenChange(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{strings.sources.links.linkToDecision}</DialogTitle>
        </DialogHeader>
        {error ? (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}
        {orderedDecisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {strings.sources.links.noDecisions}
          </p>
        ) : (
          <div className="flex flex-col gap-3">
            <Field
              id="link-decision-id"
              label={strings.sources.links.selectDecision}
            >
              <Select value={decisionId} onValueChange={setDecisionId}>
                <SelectTrigger id="link-decision-id">
                  <SelectValue
                    placeholder={strings.sources.links.selectDecision}
                  />
                </SelectTrigger>
                <SelectContent>
                  {orderedDecisions.map((decision) => (
                    <SelectItem key={decision.id} value={decision.id}>
                      {decision.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="link-decision-note"
              label={strings.sources.links.note}
              optional
            >
              <Textarea
                id="link-decision-note"
                rows={3}
                placeholder={strings.sources.links.notePlaceholder}
                value={note}
                onChange={(event) => setNote(event.target.value)}
              />
            </Field>
          </div>
        )}
        <DialogFooter>
          <Button
            type="button"
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
          >
            {strings.actions.cancel}
          </Button>
          <Button
            type="button"
            onClick={submit}
            disabled={submitting || !decisionId}
          >
            {submitting ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                {strings.sources.links.submittingLink}
              </>
            ) : (
              strings.sources.links.submitLink
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
