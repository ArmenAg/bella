"use client";

import * as React from "react";
import { Loader2, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Field } from "@/components/entries/field";

import {
  createEvidenceLink,
  removeEvidenceLink,
} from "@/server/actions/diagnoses";
import { createEvidenceLinkInputSchema } from "@/server/contracts";
import type {
  CreateEvidenceLinkInput,
  EvidenceLink,
  EvidenceLinkedTypeKey,
} from "./types";

import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import { formatDateTime } from "@/lib/format";

import { DirectionBadge } from "./diagnosis-badges";

const LINKED_TYPES: EvidenceLinkedTypeKey[] = [
  "entry",
  "event",
  "attachment",
  "source",
  "decision",
  "vasomotor_measurement",
  "medication_response",
  "diagnosis",
];

const DIRECTIONS: EvidenceLink["direction"][] = [
  "supports",
  "weakens",
  "neutral",
  "pending",
];

interface OptimisticLink extends EvidenceLink {
  __addedLocally?: boolean;
}

export interface DiagnosisEvidenceSectionProps {
  diagnosisId: string;
  initialLinks: OptimisticLink[];
  canWrite: boolean;
}

export function DiagnosisEvidenceSection({
  diagnosisId,
  initialLinks,
  canWrite,
}: DiagnosisEvidenceSectionProps) {
  const [links, setLinks] = React.useState<OptimisticLink[]>(initialLinks);
  const [linkedType, setLinkedType] =
    React.useState<EvidenceLinkedTypeKey>("entry");
  const [linkedId, setLinkedId] = React.useState("");
  const [direction, setDirection] =
    React.useState<EvidenceLink["direction"]>("supports");
  const [note, setNote] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [removingId, setRemovingId] = React.useState<string | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const reset = () => {
    setLinkedType("entry");
    setLinkedId("");
    setDirection("supports");
    setNote("");
  };

  const onAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    const trimmedNote = note.trim();
    const input: CreateEvidenceLinkInput = {
      diagnosis_id: diagnosisId,
      linked_type: linkedType,
      linked_id: linkedId.trim(),
      direction,
      ...(trimmedNote ? { note: trimmedNote } : {}),
    };
    const validated = createEvidenceLinkInputSchema.safeParse(input);
    if (!validated.success) {
      setError(strings.errors.validation);
      return;
    }
    setSubmitting(true);
    try {
      const result = await createEvidenceLink(validated.data);
      if (!result.ok) {
        setError(userFacingErrorMessage(result.error));
        return;
      }
      setLinks((prev) => [
        { ...result.data, __addedLocally: true },
        ...prev.filter((link) => link.id !== result.data.id),
      ]);
      reset();
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.errors.generic);
    } finally {
      setSubmitting(false);
    }
  };

  const onRemove = async (id: string) => {
    setError(null);
    setRemovingId(id);
    try {
      const result = await removeEvidenceLink(id);
      if (!result.ok) {
        setError(userFacingErrorMessage(result.error));
        return;
      }
      setLinks((prev) => prev.filter((link) => link.id !== id));
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.errors.generic);
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{strings.diagnoses.node.evidenceList}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {links.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {strings.diagnoses.node.noEvidence}
          </p>
        ) : (
          <ul className="flex flex-col divide-y divide-border rounded-md border border-border">
            {links.map((link) => (
              <li
                key={link.id}
                className="flex flex-col gap-1 px-3 py-2.5 sm:flex-row sm:items-start sm:justify-between sm:gap-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <DirectionBadge direction={link.direction} />
                    <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                      {
                        strings.diagnoses.evidence.linkedTypes[
                          link.linked_type as EvidenceLinkedTypeKey
                        ]
                      }
                    </span>
                    <code className="truncate rounded bg-muted px-1 py-0.5 font-mono text-[11px] text-muted-foreground">
                      {link.linked_id.slice(0, 8)}
                    </code>
                    {link.__addedLocally ? (
                      <span className="rounded-sm bg-primary/10 px-1.5 py-0.5 text-[11px] font-medium text-primary">
                        {strings.diagnoses.evidence.addedLocallyBadge}
                      </span>
                    ) : null}
                  </div>
                  {link.note ? (
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">
                      {link.note}
                    </p>
                  ) : null}
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {formatDateTime(link.created_at)}
                  </p>
                </div>
                {canWrite ? (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onRemove(link.id)}
                    disabled={removingId !== null}
                  >
                    {removingId === link.id ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        {strings.diagnoses.evidence.removing}
                      </>
                    ) : (
                      <>
                        <Trash2 className="h-3.5 w-3.5" />
                        {strings.diagnoses.node.removeEvidence}
                      </>
                    )}
                  </Button>
                ) : null}
              </li>
            ))}
          </ul>
        )}

        {canWrite ? (
          <form
            onSubmit={onAdd}
            noValidate
            className="flex flex-col gap-3 rounded-md border border-dashed border-border p-3"
          >
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {strings.diagnoses.node.addEvidence}
            </p>
            {error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field
                id="evidence-linked-type"
                label={strings.diagnoses.evidence.linkedType}
              >
                <Select
                  value={linkedType}
                  onValueChange={(next) =>
                    setLinkedType(next as EvidenceLinkedTypeKey)
                  }
                >
                  <SelectTrigger id="evidence-linked-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LINKED_TYPES.map((typeKey) => (
                      <SelectItem key={typeKey} value={typeKey}>
                        {strings.diagnoses.evidence.linkedTypes[typeKey]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
              <Field
                id="evidence-direction"
                label={strings.diagnoses.evidence.direction}
              >
                <Select
                  value={direction}
                  onValueChange={(next) =>
                    setDirection(next as EvidenceLink["direction"])
                  }
                >
                  <SelectTrigger id="evidence-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIRECTIONS.map((directionKey) => (
                      <SelectItem key={directionKey} value={directionKey}>
                        {strings.diagnoses.directions[directionKey]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            </div>
            <Field
              id="evidence-linked-id"
              label={strings.diagnoses.evidence.linkedId}
              description={strings.diagnoses.evidence.linkedIdPlaceholder}
            >
              <Input
                id="evidence-linked-id"
                value={linkedId}
                onChange={(event) => setLinkedId(event.target.value)}
                placeholder="00000000-0000-0000-0000-000000000000"
                required
              />
            </Field>
            <Field
              id="evidence-note"
              label={strings.diagnoses.evidence.note}
              optional
            >
              <Textarea
                id="evidence-note"
                rows={3}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder={strings.diagnoses.evidence.notePlaceholder}
                maxLength={12000}
              />
            </Field>
            <div className="flex justify-end">
              <Button type="submit" size="sm" disabled={submitting}>
                {submitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    {strings.diagnoses.evidence.submitting}
                  </>
                ) : (
                  strings.diagnoses.evidence.submit
                )}
              </Button>
            </div>
          </form>
        ) : null}
      </CardContent>
    </Card>
  );
}
