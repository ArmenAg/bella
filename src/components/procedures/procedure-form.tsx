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
import { DestructiveConfirm } from "@/components/feedback/destructive-confirm";
import { Field } from "@/components/entries/field";

import {
  createProcedureEvent,
  softDeleteProcedureEvent,
  updateProcedureEvent,
} from "@/server/actions/procedures";
import { procedureEventMutationSchema } from "@/server/contracts/procedures";
import type {
  CreateProcedureEventInput,
  ProcedureEvent,
  UpdateProcedureEventInput,
} from "@/server/contracts";

import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import {
  fromLocalDateTimeInputValue,
  nowIso,
  nowIsoForInput,
  toLocalDateTimeInputValue,
} from "@/lib/format";
import { firstZodError } from "@/lib/forms";

type ProcedureFormValues = z.input<typeof procedureEventMutationSchema>;

const TYPE_ORDER: Array<
  "procedure_test" | "procedure" | "imaging" | "test_lab" | "consult"
> = ["procedure_test", "procedure", "imaging", "test_lab", "consult"];

const ANSWERED_ORDER: Array<"yes" | "partially" | "unclear" | "no"> = [
  "yes",
  "partially",
  "unclear",
  "no",
];

const NONE_VALUE = "__none__";

export interface SourceOption {
  id: string;
  title: string;
}

export interface ProcedureFormProps {
  mode: "create" | "edit";
  procedureEvent?: ProcedureEvent;
  sources: SourceOption[];
}

function buildDefaults(
  procedureEvent: ProcedureEvent | undefined,
): ProcedureFormValues {
  if (procedureEvent) {
    return {
      type: procedureEvent.type,
      occurred_at: procedureEvent.occurred_at,
      ended_at: procedureEvent.ended_at ?? undefined,
      title: procedureEvent.title,
      summary: procedureEvent.summary ?? undefined,
      provider: procedureEvent.provider ?? undefined,
      location: procedureEvent.location ?? undefined,
      source_id: procedureEvent.source_id ?? undefined,
      diagnostic_question: procedureEvent.diagnostic_question ?? undefined,
      baseline_before: procedureEvent.baseline_before ?? undefined,
      immediate_effect: procedureEvent.immediate_effect ?? undefined,
      effect_24h: procedureEvent.effect_24h ?? undefined,
      effect_72h: procedureEvent.effect_72h ?? undefined,
      effect_1w: procedureEvent.effect_1w ?? undefined,
      effect_1m: procedureEvent.effect_1m ?? undefined,
      new_symptoms: procedureEvent.new_symptoms ?? undefined,
      answered_question: procedureEvent.answered_question ?? undefined,
      repeat_recommendation: procedureEvent.repeat_recommendation ?? undefined,
    };
  }
  return {
    type: "procedure_test",
    occurred_at: nowIso(),
    title: "",
  };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizePayload(values: ProcedureFormValues): ProcedureFormValues {
  return {
    ...values,
    title: values.title.trim(),
    ended_at: values.ended_at || undefined,
    summary: emptyToUndefined(values.summary),
    provider: emptyToUndefined(values.provider),
    location: emptyToUndefined(values.location),
    source_id: values.source_id || undefined,
    diagnostic_question: emptyToUndefined(values.diagnostic_question),
    baseline_before: emptyToUndefined(values.baseline_before),
    immediate_effect: emptyToUndefined(values.immediate_effect),
    effect_24h: emptyToUndefined(values.effect_24h),
    effect_72h: emptyToUndefined(values.effect_72h),
    effect_1w: emptyToUndefined(values.effect_1w),
    effect_1m: emptyToUndefined(values.effect_1m),
    new_symptoms: emptyToUndefined(values.new_symptoms),
    repeat_recommendation: emptyToUndefined(values.repeat_recommendation),
  };
}

export function ProcedureForm({
  mode,
  procedureEvent,
  sources,
}: ProcedureFormProps) {
  const router = useRouter();
  const formStrings = strings.procedures.form;

  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<ProcedureFormValues>({
    resolver: zodResolver(procedureEventMutationSchema),
    defaultValues: buildDefaults(procedureEvent),
    mode: "onTouched",
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const payload = normalizePayload(values);
      if (mode === "edit" && procedureEvent) {
        const update: UpdateProcedureEventInput = {
          ...payload,
          id: procedureEvent.id,
        };
        const result = await updateProcedureEvent(update);
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
      } else {
        const create: CreateProcedureEventInput = payload;
        const result = await createProcedureEvent(create);
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
      }
      router.push("/procedures");
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : strings.errors.generic,
      );
    } finally {
      setSubmitting(false);
    }
  });

  const handleDelete = async (reason: string) => {
    if (!procedureEvent) return;
    setDeleting(true);
    try {
      const result = await softDeleteProcedureEvent(procedureEvent.id, reason);
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
      setConfirmDelete(false);
      router.push("/procedures");
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
          <CardTitle>{formStrings.identitySection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="proc-title"
            label={formStrings.title}
            error={errors.title?.message}
          >
            <Input
              id="proc-title"
              placeholder={formStrings.titlePlaceholder}
              aria-invalid={errors.title ? true : undefined}
              {...register("title")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="proc-type"
              label={formStrings.type}
              error={errors.type?.message}
            >
              <Controller
                control={control}
                name="type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(next) =>
                      field.onChange(
                        next as
                          | "procedure"
                          | "imaging"
                          | "test_lab"
                          | "consult"
                          | "procedure_test",
                      )
                    }
                  >
                    <SelectTrigger id="proc-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TYPE_ORDER.map((typeKey) => (
                        <SelectItem key={typeKey} value={typeKey}>
                          {strings.procedures.types[typeKey]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>

            <Field
              id="proc-source"
              label={formStrings.source}
              description={formStrings.sourceHelp}
              error={errors.source_id?.message}
            >
              <Controller
                control={control}
                name="source_id"
                render={({ field }) => (
                  <Select
                    value={field.value ?? NONE_VALUE}
                    onValueChange={(next) =>
                      field.onChange(next === NONE_VALUE ? undefined : next)
                    }
                  >
                    <SelectTrigger id="proc-source">
                      <SelectValue placeholder={formStrings.sourceNone} />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NONE_VALUE}>
                        {formStrings.sourceNone}
                      </SelectItem>
                      {sources.map((source) => (
                        <SelectItem key={source.id} value={source.id}>
                          {source.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="proc-occurred-at"
              label={formStrings.occurredAt}
              error={errors.occurred_at?.message}
            >
              <Controller
                control={control}
                name="occurred_at"
                render={({ field }) => (
                  <Input
                    id="proc-occurred-at"
                    type="datetime-local"
                    value={
                      field.value
                        ? toLocalDateTimeInputValue(field.value)
                        : nowIsoForInput()
                    }
                    onChange={(event) => {
                      const next = fromLocalDateTimeInputValue(
                        event.target.value,
                      );
                      if (next) field.onChange(next);
                    }}
                    aria-invalid={errors.occurred_at ? true : undefined}
                  />
                )}
              />
            </Field>

            <Field
              id="proc-ended-at"
              label={formStrings.endedAt}
              optional
              error={errors.ended_at?.message}
            >
              <Controller
                control={control}
                name="ended_at"
                render={({ field }) => (
                  <Input
                    id="proc-ended-at"
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
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="proc-provider"
              label={formStrings.provider}
              optional
              error={errors.provider?.message}
            >
              <Input
                id="proc-provider"
                placeholder={formStrings.providerPlaceholder}
                {...register("provider")}
              />
            </Field>
            <Field
              id="proc-location"
              label={formStrings.location}
              optional
              error={errors.location?.message}
            >
              <Input
                id="proc-location"
                placeholder={formStrings.locationPlaceholder}
                {...register("location")}
              />
            </Field>
          </div>

          <Field
            id="proc-summary"
            label={formStrings.summary}
            optional
            error={errors.summary?.message}
          >
            <Textarea
              id="proc-summary"
              rows={3}
              placeholder={formStrings.summaryPlaceholder}
              {...register("summary")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{formStrings.diagnosticSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            {formStrings.diagnosticSectionHint}
          </p>
          <Field
            id="proc-diagnostic-question"
            label={formStrings.diagnosticQuestion}
            optional
            error={errors.diagnostic_question?.message}
          >
            <Textarea
              id="proc-diagnostic-question"
              rows={5}
              placeholder={formStrings.diagnosticQuestionPlaceholder}
              {...register("diagnostic_question")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{formStrings.impactSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-xs text-muted-foreground">
            {formStrings.impactSectionHint}
          </p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="proc-baseline"
              label={formStrings.baselineBefore}
              optional
              error={errors.baseline_before?.message}
            >
              <Textarea
                id="proc-baseline"
                rows={3}
                placeholder={formStrings.baselineBeforePlaceholder}
                {...register("baseline_before")}
              />
            </Field>
            <Field
              id="proc-immediate"
              label={formStrings.immediateEffect}
              optional
              error={errors.immediate_effect?.message}
            >
              <Textarea
                id="proc-immediate"
                rows={3}
                placeholder={formStrings.immediateEffectPlaceholder}
                {...register("immediate_effect")}
              />
            </Field>
            <Field
              id="proc-24h"
              label={formStrings.effect24h}
              optional
              error={errors.effect_24h?.message}
            >
              <Textarea
                id="proc-24h"
                rows={3}
                placeholder={formStrings.effect24hPlaceholder}
                {...register("effect_24h")}
              />
            </Field>
            <Field
              id="proc-72h"
              label={formStrings.effect72h}
              optional
              error={errors.effect_72h?.message}
            >
              <Textarea
                id="proc-72h"
                rows={3}
                placeholder={formStrings.effect72hPlaceholder}
                {...register("effect_72h")}
              />
            </Field>
            <Field
              id="proc-1w"
              label={formStrings.effect1w}
              optional
              error={errors.effect_1w?.message}
            >
              <Textarea
                id="proc-1w"
                rows={3}
                placeholder={formStrings.effect1wPlaceholder}
                {...register("effect_1w")}
              />
            </Field>
            <Field
              id="proc-1m"
              label={formStrings.effect1m}
              optional
              error={errors.effect_1m?.message}
            >
              <Textarea
                id="proc-1m"
                rows={3}
                placeholder={formStrings.effect1mPlaceholder}
                {...register("effect_1m")}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{formStrings.aftermathSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="proc-new-symptoms"
            label={formStrings.newSymptoms}
            optional
            error={errors.new_symptoms?.message}
          >
            <Textarea
              id="proc-new-symptoms"
              rows={3}
              placeholder={formStrings.newSymptomsPlaceholder}
              {...register("new_symptoms")}
            />
          </Field>

          <Field
            id="proc-answered"
            label={formStrings.answeredQuestion}
            optional
            error={errors.answered_question?.message}
          >
            <Controller
              control={control}
              name="answered_question"
              render={({ field }) => (
                <Select
                  value={field.value ?? NONE_VALUE}
                  onValueChange={(next) =>
                    field.onChange(
                      next === NONE_VALUE
                        ? undefined
                        : (next as "yes" | "no" | "partially" | "unclear"),
                    )
                  }
                >
                  <SelectTrigger id="proc-answered">
                    <SelectValue
                      placeholder={strings.procedures.answeredQuestion.none}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>
                      {strings.procedures.answeredQuestion.none}
                    </SelectItem>
                    {ANSWERED_ORDER.map((option) => (
                      <SelectItem key={option} value={option}>
                        {strings.procedures.answeredQuestion[option]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field
            id="proc-repeat"
            label={formStrings.repeatRecommendation}
            optional
            error={errors.repeat_recommendation?.message}
          >
            <Textarea
              id="proc-repeat"
              rows={3}
              placeholder={formStrings.repeatRecommendationPlaceholder}
              {...register("repeat_recommendation")}
            />
          </Field>
        </CardContent>
      </Card>

      <div className="flex flex-col-reverse gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          {mode === "edit" ? (
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
              router.push("/procedures");
              router.refresh();
            }}
            disabled={submitting}
          >
            {strings.actions.cancel}
          </Button>
          <Button type="submit" disabled={submitting}>
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

      {mode === "edit" && procedureEvent ? (
        <DestructiveConfirm
          open={confirmDelete}
          onOpenChange={(next) => {
            if (!deleting) setConfirmDelete(next);
          }}
          title={formStrings.deleteTitle}
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
