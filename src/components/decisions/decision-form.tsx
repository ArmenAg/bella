"use client";

import * as React from "react";
import { canWrite } from "@/lib/auth";
import { useFieldArray, useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, X } from "lucide-react";
import type { z } from "zod";

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
import { DestructiveConfirm } from "@/components/feedback/destructive-confirm";
import { Field } from "@/components/entries/field";

import { decisionMutationSchema } from "@/server/contracts/decisions";
import {
  createDecision,
  softDeleteDecision,
  updateDecision,
} from "@/server/actions/decisions";
import type { Decision } from "@/server/contracts";

import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import { toDateInputValue } from "@/lib/format";
import { firstZodError } from "@/lib/forms";
import { useShellProfile } from "@/components/shell/shell-context";

type DecisionFormValues = z.input<typeof decisionMutationSchema>;

const STATUS_ORDER: Decision["status"][] = [
  "open",
  "waiting_on_test",
  "waiting_on_clinician",
  "revisiting",
  "decided",
  "rejected",
];

function buildDefaults(decision: Decision | undefined): DecisionFormValues {
  if (!decision) {
    return {
      title: "",
      status: "open",
      question: "",
      options: [],
      evidence_for: undefined,
      evidence_against: undefined,
      risks: undefined,
      what_would_change: undefined,
      owner: undefined,
      target_date: undefined,
      final_decision: undefined,
      rationale: undefined,
    };
  }
  return {
    title: decision.title,
    status: decision.status,
    question: decision.question,
    options: decision.options ?? [],
    evidence_for: decision.evidence_for ?? undefined,
    evidence_against: decision.evidence_against ?? undefined,
    risks: decision.risks ?? undefined,
    what_would_change: decision.what_would_change ?? undefined,
    owner: decision.owner ?? undefined,
    target_date: decision.target_date ?? undefined,
    final_decision: decision.final_decision ?? undefined,
    rationale: decision.rationale ?? undefined,
  };
}

export interface DecisionFormProps {
  mode: "create" | "edit";
  decision?: Decision;
}

export function DecisionForm({ mode, decision }: DecisionFormProps) {
  const router = useRouter();
  const profile = useShellProfile();
  const writable = canWrite(profile?.role);

  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<DecisionFormValues>({
    resolver: zodResolver(decisionMutationSchema),
    defaultValues: buildDefaults(decision),
    mode: "onTouched",
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const optionsField = useFieldArray({ control, name: "options" });

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSubmitting(true);
    try {
      // Trim empty optional strings to undefined for cleanliness.
      const payload: DecisionFormValues = {
        ...values,
        evidence_for: values.evidence_for?.trim() || undefined,
        evidence_against: values.evidence_against?.trim() || undefined,
        risks: values.risks?.trim() || undefined,
        what_would_change: values.what_would_change?.trim() || undefined,
        owner: values.owner?.trim() || undefined,
        target_date: values.target_date?.trim() || undefined,
        final_decision: values.final_decision?.trim() || undefined,
        rationale: values.rationale?.trim() || undefined,
        options: (values.options ?? []).map((opt) => ({
          label: opt.label.trim(),
          notes: opt.notes?.trim() || undefined,
        })),
      };

      if (mode === "edit" && decision) {
        const result = await updateDecision({ ...payload, id: decision.id });
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
      } else {
        const result = await createDecision(payload);
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
      }
      router.push("/decisions");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  });

  const handleDelete = async (reason: string) => {
    if (!decision) return;
    setDeleting(true);
    try {
      const result = await softDeleteDecision(decision.id, reason);
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
      setConfirmDelete(false);
      router.push("/decisions");
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
          <CardTitle>{strings.decisions.form.summarySection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="decision-title"
            label={strings.decisions.form.title}
            error={errors.title?.message}
          >
            <Input
              id="decision-title"
              placeholder={strings.decisions.form.titlePlaceholder}
              aria-invalid={errors.title ? true : undefined}
              {...register("title")}
            />
          </Field>

          <Field
            id="decision-status"
            label={strings.decisions.form.status}
            error={errors.status?.message}
          >
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(next) =>
                    field.onChange(next as Decision["status"])
                  }
                >
                  <SelectTrigger
                    id="decision-status"
                    aria-invalid={errors.status ? true : undefined}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((status) => (
                      <SelectItem key={status} value={status}>
                        {strings.decisions.statuses[status]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{strings.decisions.form.questionSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="decision-question"
            label={strings.decisions.form.question}
            error={errors.question?.message}
          >
            <Textarea
              id="decision-question"
              rows={3}
              placeholder={strings.decisions.form.questionPlaceholder}
              aria-invalid={errors.question ? true : undefined}
              {...register("question")}
            />
          </Field>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">
                {strings.decisions.form.options}
              </span>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => optionsField.append({ label: "", notes: "" })}
              >
                <Plus aria-hidden="true" className="h-4 w-4" />
                {strings.decisions.form.addOption}
              </Button>
            </div>
            {optionsField.fields.length === 0 ? (
              <p className="rounded-md border border-dashed border-border bg-card/40 px-3 py-2 text-xs text-muted-foreground">
                {strings.decisions.form.noOptions}
              </p>
            ) : (
              <ul className="flex flex-col gap-3">
                {optionsField.fields.map((field, index) => (
                  <li
                    key={field.id}
                    className="flex flex-col gap-2 rounded-md border border-border bg-card/40 p-3"
                  >
                    <div className="flex items-start gap-2">
                      <div className="flex-1">
                        <Field
                          id={`decision-option-label-${index}`}
                          label={strings.decisions.form.optionsLabel}
                          error={errors.options?.[index]?.label?.message}
                        >
                          <Input
                            id={`decision-option-label-${index}`}
                            placeholder={
                              strings.decisions.form.optionsLabelPlaceholder
                            }
                            {...register(`options.${index}.label` as const)}
                          />
                        </Field>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => optionsField.remove(index)}
                        aria-label={strings.decisions.form.removeOption}
                      >
                        <X aria-hidden="true" className="h-4 w-4" />
                      </Button>
                    </div>
                    <Field
                      id={`decision-option-notes-${index}`}
                      label={strings.decisions.form.optionsNotes}
                      optional
                      error={errors.options?.[index]?.notes?.message}
                    >
                      <Textarea
                        id={`decision-option-notes-${index}`}
                        rows={2}
                        placeholder={
                          strings.decisions.form.optionsNotesPlaceholder
                        }
                        {...register(`options.${index}.notes` as const)}
                      />
                    </Field>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{strings.decisions.form.evidenceSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="decision-evidence-for"
            label={strings.decisions.form.evidenceFor}
            optional
            error={errors.evidence_for?.message}
          >
            <Textarea
              id="decision-evidence-for"
              rows={3}
              {...register("evidence_for")}
            />
          </Field>
          <Field
            id="decision-evidence-against"
            label={strings.decisions.form.evidenceAgainst}
            optional
            error={errors.evidence_against?.message}
          >
            <Textarea
              id="decision-evidence-against"
              rows={3}
              {...register("evidence_against")}
            />
          </Field>
          <Field
            id="decision-risks"
            label={strings.decisions.form.risks}
            optional
            error={errors.risks?.message}
          >
            <Textarea id="decision-risks" rows={3} {...register("risks")} />
          </Field>
          <Field
            id="decision-what-would-change"
            label={strings.decisions.form.whatWouldChange}
            optional
            error={errors.what_would_change?.message}
          >
            <Textarea
              id="decision-what-would-change"
              rows={3}
              {...register("what_would_change")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{strings.decisions.form.ownershipSection}</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Field
            id="decision-owner"
            label={strings.decisions.form.owner}
            optional
            error={errors.owner?.message}
          >
            <Input
              id="decision-owner"
              placeholder={strings.decisions.form.ownerPlaceholder}
              {...register("owner")}
            />
          </Field>
          <Field
            id="decision-target-date"
            label={strings.decisions.form.targetDate}
            optional
            error={errors.target_date?.message}
          >
            <Controller
              control={control}
              name="target_date"
              render={({ field }) => (
                <Input
                  id="decision-target-date"
                  type="date"
                  value={toDateInputValue(field.value ?? null)}
                  onChange={(event) => {
                    const next = event.target.value;
                    field.onChange(next ? next : undefined);
                  }}
                />
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{strings.decisions.form.outcomeSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="decision-final"
            label={strings.decisions.form.finalDecision}
            optional
            error={errors.final_decision?.message}
          >
            <Textarea
              id="decision-final"
              rows={3}
              placeholder={strings.decisions.form.finalDecisionPlaceholder}
              {...register("final_decision")}
            />
          </Field>
          <Field
            id="decision-rationale"
            label={strings.decisions.form.rationale}
            optional
            error={errors.rationale?.message}
          >
            <Textarea
              id="decision-rationale"
              rows={3}
              placeholder={strings.decisions.form.rationalePlaceholder}
              {...register("rationale")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{strings.decisions.form.evidenceLinksSection}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            {strings.decisions.form.evidenceLinksPlaceholder}
          </p>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {mode === "edit" && writable ? (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setConfirmDelete(true)}
              disabled={submitting || deleting}
            >
              <Trash2 aria-hidden="true" className="h-4 w-4" />
              {strings.actions.delete}
            </Button>
          ) : null}
        </div>
        <div className="flex items-center gap-2 sm:justify-end">
          <Button
            type="button"
            variant="ghost"
            onClick={() => {
              router.push("/decisions");
              router.refresh();
            }}
            disabled={submitting}
          >
            {strings.actions.cancel}
          </Button>
          <Button type="submit" disabled={submitting || !writable}>
            {submitting ? (
              <>
                <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
                {strings.actions.saving}
              </>
            ) : (
              strings.actions.save
            )}
          </Button>
        </div>
      </div>

      {mode === "edit" && decision ? (
        <DestructiveConfirm
          open={confirmDelete}
          onOpenChange={(next) => {
            if (!deleting) setConfirmDelete(next);
          }}
          title={strings.decisions.form.deleteTitle}
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
