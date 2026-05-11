"use client";

import * as React from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { z } from "zod";

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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { ChipInput } from "@/components/entries/chip-input";
import { Field } from "@/components/entries/field";
import { DestructiveConfirm } from "@/components/feedback/destructive-confirm";

import {
  createDiagnosis,
  softDeleteDiagnosis,
  updateDiagnosis,
} from "@/server/actions/diagnoses";
import {
  diagnosisMutationSchema,
  type DiagnosisNode,
} from "@/server/contracts";

import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import {
  fromLocalDateTimeInputValue,
  toLocalDateTimeInputValue,
} from "@/lib/format";
import { firstZodError } from "@/lib/forms";
import { cn } from "@/lib/utils";

import { collectDescendantIds } from "./diagnosis-tree";

type DiagnosisFormValues = z.input<typeof diagnosisMutationSchema>;

const STATUS_KEYS: DiagnosisNode["status"][] = [
  "unreviewed",
  "suspected",
  "supported",
  "weakened",
  "ruled_out",
  "confirmed",
  "monitoring",
];

const CONFIDENCE_KEYS: DiagnosisNode["confidence"][] = [
  "unknown",
  "low",
  "moderate",
  "high",
];

const PARENT_NONE_VALUE = "__none__";

export interface DiagnosisFormProps {
  mode: "create" | "edit";
  node?: DiagnosisNode;
  allNodes: DiagnosisNode[];
  canDelete: boolean;
}

function buildDefaults(node: DiagnosisNode | undefined): DiagnosisFormValues {
  if (node) {
    return {
      title: node.title,
      parent_diagnosis_id: node.parent_diagnosis_id ?? undefined,
      status: node.status,
      confidence: node.confidence,
      summary: node.summary ?? undefined,
      why_considered: node.why_considered ?? undefined,
      evidence_for: node.evidence_for ?? undefined,
      evidence_against: node.evidence_against ?? undefined,
      tests_needed: node.tests_needed ?? undefined,
      treatment_implications: node.treatment_implications ?? undefined,
      open_questions: node.open_questions ?? [],
      last_reviewed_at: node.last_reviewed_at ?? undefined,
    };
  }
  return {
    title: "",
    parent_diagnosis_id: undefined,
    status: "unreviewed",
    confidence: "unknown",
    summary: undefined,
    why_considered: undefined,
    evidence_for: undefined,
    evidence_against: undefined,
    tests_needed: undefined,
    treatment_implications: undefined,
    open_questions: [],
    last_reviewed_at: undefined,
  };
}

export function DiagnosisForm({
  mode,
  node,
  allNodes,
  canDelete,
}: DiagnosisFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<DiagnosisFormValues>({
    resolver: zodResolver(diagnosisMutationSchema),
    defaultValues: buildDefaults(node),
    mode: "onTouched",
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const blockedParentIds = React.useMemo(() => {
    if (mode === "create" || !node) return new Set<string>();
    return collectDescendantIds(allNodes, node.id);
  }, [allNodes, mode, node]);

  const parentOptions = React.useMemo(() => {
    return allNodes
      .filter((candidate) => !blockedParentIds.has(candidate.id))
      .sort((a, b) =>
        a.title.toLocaleLowerCase().localeCompare(b.title.toLocaleLowerCase()),
      );
  }, [allNodes, blockedParentIds]);

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const payload = {
        ...values,
        // Drop undefineds to avoid sending empty strings as values.
        summary: values.summary?.trim() || undefined,
        why_considered: values.why_considered?.trim() || undefined,
        evidence_for: values.evidence_for?.trim() || undefined,
        evidence_against: values.evidence_against?.trim() || undefined,
        tests_needed: values.tests_needed?.trim() || undefined,
        treatment_implications:
          values.treatment_implications?.trim() || undefined,
      };

      if (mode === "edit" && node) {
        const result = await updateDiagnosis({ id: node.id, ...payload });
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
        router.push(`/diagnostic-tree/${node.id}/edit`);
        router.refresh();
      } else {
        const result = await createDiagnosis(payload);
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
        router.push(`/diagnostic-tree/${result.data.id}/edit`);
        router.refresh();
      }
    } catch (err) {
      setServerError(
        err instanceof Error ? err.message : strings.errors.generic,
      );
    } finally {
      setSubmitting(false);
    }
  });

  const handleDelete = async (reason: string) => {
    if (!node) return;
    setDeleting(true);
    try {
      const result = await softDeleteDiagnosis(node.id, reason);
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
      setConfirmDelete(false);
      router.push("/diagnostic-tree");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  };

  const validationSummary = firstZodError(errors);

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-5">
      {serverError ? (
        <Alert variant="destructive">
          <AlertTitle>{strings.common.errorTitle}</AlertTitle>
          <AlertDescription>{serverError}</AlertDescription>
        </Alert>
      ) : null}

      {validationSummary ? (
        <Alert variant="warning">
          <AlertTitle>{strings.errors.validation}</AlertTitle>
          <AlertDescription>{validationSummary}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{strings.diagnoses.form.branchSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="diagnosis-title"
            label={strings.diagnoses.form.title}
            error={errors.title?.message}
          >
            <Input
              id="diagnosis-title"
              aria-invalid={errors.title ? true : undefined}
              {...register("title")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field id="diagnosis-status" label={strings.diagnoses.form.status}>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(next) =>
                      field.onChange(next as DiagnosisNode["status"])
                    }
                  >
                    <SelectTrigger id="diagnosis-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_KEYS.map((statusKey) => (
                        <SelectItem key={statusKey} value={statusKey}>
                          {strings.diagnoses.statuses[statusKey]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field
              id="diagnosis-confidence"
              label={strings.diagnoses.form.confidence}
            >
              <Controller
                control={control}
                name="confidence"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(next) =>
                      field.onChange(next as DiagnosisNode["confidence"])
                    }
                  >
                    <SelectTrigger id="diagnosis-confidence">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CONFIDENCE_KEYS.map((conf) => (
                        <SelectItem key={conf} value={conf}>
                          {strings.diagnoses.confidences[conf]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <Field
            id="diagnosis-parent"
            label={strings.diagnoses.form.parent}
            optional
          >
            <Controller
              control={control}
              name="parent_diagnosis_id"
              render={({ field }) => (
                <Select
                  value={field.value ?? PARENT_NONE_VALUE}
                  onValueChange={(next) =>
                    field.onChange(
                      next === PARENT_NONE_VALUE ? undefined : next,
                    )
                  }
                >
                  <SelectTrigger id="diagnosis-parent">
                    <SelectValue
                      placeholder={strings.diagnoses.form.parentNone}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={PARENT_NONE_VALUE}>
                      {strings.diagnoses.form.parentNone}
                    </SelectItem>
                    {parentOptions.map((option) => (
                      <SelectItem key={option.id} value={option.id}>
                        {option.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field
            id="diagnosis-last-reviewed-at"
            label={strings.diagnoses.form.lastReviewedAt}
            optional
            error={errors.last_reviewed_at?.message}
          >
            <Controller
              control={control}
              name="last_reviewed_at"
              render={({ field }) => (
                <Input
                  id="diagnosis-last-reviewed-at"
                  type="datetime-local"
                  value={
                    field.value ? toLocalDateTimeInputValue(field.value) : ""
                  }
                  onChange={(event) => {
                    const next = fromLocalDateTimeInputValue(
                      event.target.value,
                    );
                    field.onChange(next);
                  }}
                />
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{strings.diagnoses.form.narrativeSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="diagnosis-summary"
            label={strings.diagnoses.form.summary}
            optional
            error={errors.summary?.message}
          >
            <Textarea
              id="diagnosis-summary"
              rows={3}
              maxLength={12000}
              {...register("summary")}
            />
          </Field>
          <Field
            id="diagnosis-why-considered"
            label={strings.diagnoses.form.whyConsidered}
            optional
          >
            <Textarea
              id="diagnosis-why-considered"
              rows={3}
              maxLength={12000}
              {...register("why_considered")}
            />
          </Field>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="diagnosis-evidence-for"
              label={strings.diagnoses.form.evidenceFor}
              optional
            >
              <Textarea
                id="diagnosis-evidence-for"
                rows={4}
                maxLength={12000}
                {...register("evidence_for")}
              />
            </Field>
            <Field
              id="diagnosis-evidence-against"
              label={strings.diagnoses.form.evidenceAgainst}
              optional
            >
              <Textarea
                id="diagnosis-evidence-against"
                rows={4}
                maxLength={12000}
                {...register("evidence_against")}
              />
            </Field>
          </div>
          <Field
            id="diagnosis-tests-needed"
            label={strings.diagnoses.form.testsNeeded}
            optional
          >
            <Textarea
              id="diagnosis-tests-needed"
              rows={3}
              maxLength={12000}
              {...register("tests_needed")}
            />
          </Field>
          <Field
            id="diagnosis-treatment"
            label={strings.diagnoses.form.treatmentImplications}
            optional
          >
            <Textarea
              id="diagnosis-treatment"
              rows={3}
              maxLength={12000}
              {...register("treatment_implications")}
            />
          </Field>
          <Field
            id="diagnosis-open-questions"
            label={strings.diagnoses.form.openQuestions}
            optional
          >
            <Controller
              control={control}
              name="open_questions"
              render={({ field }) => (
                <ChipInput
                  id="diagnosis-open-questions"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder={strings.diagnoses.form.openQuestionsPlaceholder}
                  maxLength={400}
                  ariaLabel={strings.diagnoses.form.openQuestions}
                />
              )}
            />
          </Field>
        </CardContent>
      </Card>

      {mode === "edit" ? (
        <Card>
          <CardHeader>
            <CardTitle>{strings.diagnoses.form.advancedSection}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">
              {strings.diagnoses.node.advancedNote}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" disabled>
                {strings.diagnoses.node.merge}
                <Badge variant="muted" className="ml-1">
                  {strings.common.comingSoon}
                </Badge>
              </Button>
              <Button type="button" variant="outline" size="sm" disabled>
                {strings.diagnoses.node.split}
                <Badge variant="muted" className="ml-1">
                  {strings.common.comingSoon}
                </Badge>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <div
        className={cn(
          "flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between",
        )}
      >
        <div>
          {mode === "edit" && canDelete ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={submitting || deleting}
            >
              <Trash2 className="h-4 w-4" />
              {strings.actions.delete}
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              router.push("/diagnostic-tree");
              router.refresh();
            }}
            disabled={submitting}
          >
            {strings.actions.cancel}
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {strings.diagnoses.form.submitting}
              </>
            ) : (
              strings.diagnoses.form.submit
            )}
          </Button>
        </div>
      </div>

      {mode === "edit" && node ? (
        <DestructiveConfirm
          open={confirmDelete}
          onOpenChange={(next) => {
            if (!deleting) setConfirmDelete(next);
          }}
          title={strings.diagnoses.node.deleteTitle}
          requireReason
          confirming={deleting}
          onConfirm={(reason) => {
            void handleDelete(reason);
          }}
        />
      ) : null}
    </form>
  );
}
