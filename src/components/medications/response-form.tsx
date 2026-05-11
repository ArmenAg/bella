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
import { PainSegmented } from "@/components/entries/pain-segmented";
import { ToggleChip } from "@/components/entries/toggle-chip";

import {
  createMedicationResponse,
  softDeleteMedicationResponse,
  updateMedicationResponse,
} from "@/server/actions/medications";
import { medicationResponseMutationSchema } from "@/server/contracts/medications";
import type {
  CreateMedicationResponseInput,
  MedicationResponse,
  UpdateMedicationResponseInput,
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

type MedicationResponseFormValues = z.input<
  typeof medicationResponseMutationSchema
>;

const HELPED_OPTIONS: Array<"helped" | "unclear" | "worsened"> = [
  "helped",
  "unclear",
  "worsened",
];

const NONE_VALUE = "__none__";

export interface MedicationOption {
  id: string;
  name: string;
}

export interface EntryOption {
  id: string;
  title: string;
  occurred_at: string;
}

export interface ResponseFormProps {
  mode: "create" | "edit";
  response?: MedicationResponse;
  medications: MedicationOption[];
  entries: EntryOption[];
  defaultMedicationId?: string;
}

function buildDefaults(
  response: MedicationResponse | undefined,
  defaultMedicationId: string | undefined,
): MedicationResponseFormValues {
  if (response) {
    return {
      medication_id: response.medication_id ?? undefined,
      entry_id: response.entry_id ?? undefined,
      taken_at: response.taken_at,
      reason: response.reason ?? undefined,
      pain_before: response.pain_before ?? undefined,
      pain_after_30m: response.pain_after_30m ?? undefined,
      pain_after_60m: response.pain_after_60m ?? undefined,
      pain_after_120m: response.pain_after_120m ?? undefined,
      sedation_effect: response.sedation_effect ?? undefined,
      cognition_effect: response.cognition_effect ?? undefined,
      gait_effect: response.gait_effect ?? undefined,
      side_effects: response.side_effects ?? undefined,
      helped: response.helped ?? undefined,
      notes: response.notes ?? undefined,
    };
  }
  return {
    medication_id: defaultMedicationId,
    taken_at: nowIso(),
  };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizePayload(
  values: MedicationResponseFormValues,
): MedicationResponseFormValues {
  return {
    ...values,
    medication_id: values.medication_id || undefined,
    entry_id: values.entry_id || undefined,
    reason: emptyToUndefined(values.reason),
    sedation_effect: emptyToUndefined(values.sedation_effect),
    cognition_effect: emptyToUndefined(values.cognition_effect),
    gait_effect: emptyToUndefined(values.gait_effect),
    side_effects: emptyToUndefined(values.side_effects),
    notes: emptyToUndefined(values.notes),
  };
}

export function MedicationResponseForm(props: ResponseFormProps) {
  const { mode, response, medications, entries, defaultMedicationId } = props;
  const router = useRouter();
  const formStrings = strings.medications.response;

  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<MedicationResponseFormValues>({
    resolver: zodResolver(medicationResponseMutationSchema),
    defaultValues: buildDefaults(response, defaultMedicationId),
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
      if (mode === "edit" && response) {
        const update: UpdateMedicationResponseInput = {
          ...payload,
          id: response.id,
        };
        const result = await updateMedicationResponse(update);
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
      } else {
        const create: CreateMedicationResponseInput = payload;
        const result = await createMedicationResponse(create);
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
      }
      router.push("/medications?tab=responses");
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
    if (!response) return;
    setDeleting(true);
    try {
      const result = await softDeleteMedicationResponse(response.id, reason);
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
      setConfirmDelete(false);
      router.push("/medications?tab=responses");
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
          <CardTitle>{formStrings.contextSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="resp-medication"
            label={formStrings.medication}
            description={formStrings.medicationHelp}
            error={errors.medication_id?.message}
          >
            <Controller
              control={control}
              name="medication_id"
              render={({ field }) => (
                <Select
                  value={field.value ?? NONE_VALUE}
                  onValueChange={(next) =>
                    field.onChange(next === NONE_VALUE ? undefined : next)
                  }
                >
                  <SelectTrigger id="resp-medication">
                    <SelectValue placeholder={formStrings.medicationNone} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>
                      {formStrings.medicationNone}
                    </SelectItem>
                    {medications.map((med) => (
                      <SelectItem key={med.id} value={med.id}>
                        {med.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <Field
            id="resp-entry"
            label={formStrings.linkedEntry}
            description={formStrings.linkedEntryHelp}
            error={errors.entry_id?.message}
          >
            <Controller
              control={control}
              name="entry_id"
              render={({ field }) => (
                <Select
                  value={field.value ?? NONE_VALUE}
                  onValueChange={(next) =>
                    field.onChange(next === NONE_VALUE ? undefined : next)
                  }
                >
                  <SelectTrigger id="resp-entry">
                    <SelectValue placeholder={formStrings.linkedEntryNone} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NONE_VALUE}>
                      {formStrings.linkedEntryNone}
                    </SelectItem>
                    {entries.map((entry) => (
                      <SelectItem key={entry.id} value={entry.id}>
                        {entry.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="resp-taken-at"
              label={formStrings.takenAt}
              error={errors.taken_at?.message}
            >
              <Controller
                control={control}
                name="taken_at"
                render={({ field }) => (
                  <Input
                    id="resp-taken-at"
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
                    aria-invalid={errors.taken_at ? true : undefined}
                  />
                )}
              />
            </Field>

            <Field
              id="resp-reason"
              label={formStrings.reason}
              optional
              error={errors.reason?.message}
            >
              <Input
                id="resp-reason"
                placeholder={formStrings.reasonPlaceholder}
                {...register("reason")}
              />
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{formStrings.painSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-5">
          <Field
            id="resp-pain-before"
            label={formStrings.painBefore}
            optional
            error={errors.pain_before?.message}
          >
            <Controller
              control={control}
              name="pain_before"
              render={({ field }) => (
                <PainSegmented
                  id="resp-pain-before"
                  value={field.value ?? undefined}
                  onChange={(next) => field.onChange(next)}
                  ariaLabel={formStrings.painBefore}
                />
              )}
            />
          </Field>
          <Field
            id="resp-pain-30"
            label={formStrings.painAfter30m}
            optional
            error={errors.pain_after_30m?.message}
          >
            <Controller
              control={control}
              name="pain_after_30m"
              render={({ field }) => (
                <PainSegmented
                  id="resp-pain-30"
                  value={field.value ?? undefined}
                  onChange={(next) => field.onChange(next)}
                  ariaLabel={formStrings.painAfter30m}
                />
              )}
            />
          </Field>
          <Field
            id="resp-pain-60"
            label={formStrings.painAfter60m}
            optional
            error={errors.pain_after_60m?.message}
          >
            <Controller
              control={control}
              name="pain_after_60m"
              render={({ field }) => (
                <PainSegmented
                  id="resp-pain-60"
                  value={field.value ?? undefined}
                  onChange={(next) => field.onChange(next)}
                  ariaLabel={formStrings.painAfter60m}
                />
              )}
            />
          </Field>
          <Field
            id="resp-pain-120"
            label={formStrings.painAfter120m}
            optional
            error={errors.pain_after_120m?.message}
          >
            <Controller
              control={control}
              name="pain_after_120m"
              render={({ field }) => (
                <PainSegmented
                  id="resp-pain-120"
                  value={field.value ?? undefined}
                  onChange={(next) => field.onChange(next)}
                  ariaLabel={formStrings.painAfter120m}
                />
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{formStrings.effectsSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="resp-sedation"
            label={formStrings.sedationEffect}
            optional
            error={errors.sedation_effect?.message}
          >
            <Input
              id="resp-sedation"
              placeholder={formStrings.sedationEffectPlaceholder}
              {...register("sedation_effect")}
            />
          </Field>
          <Field
            id="resp-cognition"
            label={formStrings.cognitionEffect}
            optional
            error={errors.cognition_effect?.message}
          >
            <Input
              id="resp-cognition"
              placeholder={formStrings.cognitionEffectPlaceholder}
              {...register("cognition_effect")}
            />
          </Field>
          <Field
            id="resp-gait"
            label={formStrings.gaitEffect}
            optional
            error={errors.gait_effect?.message}
          >
            <Input
              id="resp-gait"
              placeholder={formStrings.gaitEffectPlaceholder}
              {...register("gait_effect")}
            />
          </Field>
          <Field
            id="resp-side-effects"
            label={formStrings.sideEffects}
            optional
            error={errors.side_effects?.message}
          >
            <Textarea
              id="resp-side-effects"
              rows={3}
              placeholder={formStrings.sideEffectsPlaceholder}
              {...register("side_effects")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{formStrings.outcomeSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field label={formStrings.helped} optional>
            <Controller
              control={control}
              name="helped"
              render={({ field }) => (
                <div
                  role="radiogroup"
                  aria-label={formStrings.helped}
                  className="flex flex-wrap gap-1.5"
                >
                  {HELPED_OPTIONS.map((option) => {
                    const active = field.value === option;
                    return (
                      <ToggleChip
                        key={option}
                        active={active}
                        onToggle={() =>
                          field.onChange(active ? undefined : option)
                        }
                      >
                        {formStrings.helpedValues[option]}
                      </ToggleChip>
                    );
                  })}
                </div>
              )}
            />
          </Field>

          <Field
            id="resp-notes"
            label={formStrings.notes}
            optional
            error={errors.notes?.message}
          >
            <Textarea
              id="resp-notes"
              rows={4}
              placeholder={formStrings.notesPlaceholder}
              {...register("notes")}
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
              router.push("/medications?tab=responses");
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

      {mode === "edit" && response ? (
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
