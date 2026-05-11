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
import { Checkbox } from "@/components/ui/checkbox";
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
  createMedication,
  softDeleteMedication,
  updateMedication,
} from "@/server/actions/medications";
import { medicationMutationSchema } from "@/server/contracts/medications";
import type {
  CreateMedicationInput,
  Medication,
  UpdateMedicationInput,
} from "@/server/contracts";

import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import { toDateInputValue } from "@/lib/format";
import { firstZodError } from "@/lib/forms";

type MedicationFormValues = z.input<typeof medicationMutationSchema>;

const STATUS_ORDER: Medication["status"][] = [
  "active",
  "paused",
  "stopped",
  "planned",
];

export interface MedicationFormProps {
  mode: "create" | "edit";
  medication?: Medication;
}

function buildDefaults(
  medication: Medication | undefined,
): MedicationFormValues {
  if (medication) {
    return {
      name: medication.name,
      dose: medication.dose ?? undefined,
      route: medication.route ?? undefined,
      frequency: medication.frequency ?? undefined,
      start_date: medication.start_date ?? undefined,
      stop_date: medication.stop_date ?? undefined,
      prescriber: medication.prescriber ?? undefined,
      reason: medication.reason ?? undefined,
      status: medication.status,
      helped_pain: medication.helped_pain ?? undefined,
      helped_sleep: medication.helped_sleep ?? undefined,
      helped_anxiety: medication.helped_anxiety ?? undefined,
      helped_function: medication.helped_function ?? undefined,
      side_effects: medication.side_effects ?? undefined,
      notes: medication.notes ?? undefined,
    };
  }
  return {
    name: "",
    status: "active",
  };
}

function emptyToUndefined(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizePayload(values: MedicationFormValues): MedicationFormValues {
  return {
    ...values,
    name: values.name.trim(),
    dose: emptyToUndefined(values.dose),
    route: emptyToUndefined(values.route),
    frequency: emptyToUndefined(values.frequency),
    start_date: emptyToUndefined(values.start_date),
    stop_date: emptyToUndefined(values.stop_date),
    prescriber: emptyToUndefined(values.prescriber),
    reason: emptyToUndefined(values.reason),
    side_effects: emptyToUndefined(values.side_effects),
    notes: emptyToUndefined(values.notes),
  };
}

export function MedicationForm({ mode, medication }: MedicationFormProps) {
  const router = useRouter();
  const formStrings = strings.medications.form;

  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<MedicationFormValues>({
    resolver: zodResolver(medicationMutationSchema),
    defaultValues: buildDefaults(medication),
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
      if (mode === "edit" && medication) {
        const update: UpdateMedicationInput = { ...payload, id: medication.id };
        const result = await updateMedication(update);
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
      } else {
        const create: CreateMedicationInput = payload;
        const result = await createMedication(create);
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
      }
      router.push("/medications");
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
    if (!medication) return;
    setDeleting(true);
    try {
      const result = await softDeleteMedication(medication.id, reason);
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
      setConfirmDelete(false);
      router.push("/medications");
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
          <CardTitle>{formStrings.detailsSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="med-name"
            label={formStrings.name}
            error={errors.name?.message}
          >
            <Input
              id="med-name"
              placeholder={formStrings.namePlaceholder}
              aria-invalid={errors.name ? true : undefined}
              {...register("name")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="med-dose"
              label={formStrings.dose}
              optional
              error={errors.dose?.message}
            >
              <Input
                id="med-dose"
                placeholder={formStrings.dosePlaceholder}
                {...register("dose")}
              />
            </Field>
            <Field
              id="med-route"
              label={formStrings.route}
              optional
              error={errors.route?.message}
            >
              <Input
                id="med-route"
                placeholder={formStrings.routePlaceholder}
                {...register("route")}
              />
            </Field>
          </div>

          <Field
            id="med-frequency"
            label={formStrings.frequency}
            optional
            error={errors.frequency?.message}
          >
            <Input
              id="med-frequency"
              placeholder={formStrings.frequencyPlaceholder}
              {...register("frequency")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="med-start-date"
              label={formStrings.startDate}
              optional
              error={errors.start_date?.message}
            >
              <Controller
                control={control}
                name="start_date"
                render={({ field }) => (
                  <Input
                    id="med-start-date"
                    type="date"
                    value={toDateInputValue(field.value)}
                    onChange={(event) => {
                      const next = event.target.value;
                      field.onChange(next === "" ? undefined : next);
                    }}
                  />
                )}
              />
            </Field>
            <Field
              id="med-stop-date"
              label={formStrings.stopDate}
              optional
              error={errors.stop_date?.message}
            >
              <Controller
                control={control}
                name="stop_date"
                render={({ field }) => (
                  <Input
                    id="med-stop-date"
                    type="date"
                    value={toDateInputValue(field.value)}
                    onChange={(event) => {
                      const next = event.target.value;
                      field.onChange(next === "" ? undefined : next);
                    }}
                  />
                )}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="med-prescriber"
              label={formStrings.prescriber}
              optional
              error={errors.prescriber?.message}
            >
              <Input
                id="med-prescriber"
                placeholder={formStrings.prescriberPlaceholder}
                {...register("prescriber")}
              />
            </Field>
            <Field
              id="med-status"
              label={formStrings.status}
              error={errors.status?.message}
            >
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(next) =>
                      field.onChange(next as Medication["status"])
                    }
                  >
                    <SelectTrigger id="med-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_ORDER.map((status) => (
                        <SelectItem key={status} value={status}>
                          {strings.medications.statuses[status]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
          </div>

          <Field
            id="med-reason"
            label={formStrings.reason}
            optional
            error={errors.reason?.message}
          >
            <Textarea
              id="med-reason"
              rows={3}
              placeholder={formStrings.reasonPlaceholder}
              {...register("reason")}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{formStrings.effectSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-xs text-muted-foreground">
            {formStrings.effectSectionHint}
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <HelpedCheckbox
              control={control}
              name="helped_pain"
              label={formStrings.helpedPain}
            />
            <HelpedCheckbox
              control={control}
              name="helped_sleep"
              label={formStrings.helpedSleep}
            />
            <HelpedCheckbox
              control={control}
              name="helped_anxiety"
              label={formStrings.helpedAnxiety}
            />
            <HelpedCheckbox
              control={control}
              name="helped_function"
              label={formStrings.helpedFunction}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{formStrings.notesSection}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="med-side-effects"
            label={formStrings.sideEffects}
            optional
            error={errors.side_effects?.message}
          >
            <Textarea
              id="med-side-effects"
              rows={3}
              placeholder={formStrings.sideEffectsPlaceholder}
              {...register("side_effects")}
            />
          </Field>
          <Field
            id="med-notes"
            label={formStrings.notes}
            optional
            error={errors.notes?.message}
          >
            <Textarea
              id="med-notes"
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
              router.push("/medications");
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

      {mode === "edit" && medication ? (
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

interface HelpedCheckboxProps {
  control: ReturnType<typeof useForm<MedicationFormValues>>["control"];
  name: "helped_pain" | "helped_sleep" | "helped_anxiety" | "helped_function";
  label: string;
}

function HelpedCheckbox({ control, name, label }: HelpedCheckboxProps) {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field }) => (
        <label className="flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm">
          <Checkbox
            checked={field.value === true}
            onCheckedChange={(checked) =>
              field.onChange(checked === true ? true : undefined)
            }
          />
          <span>{label}</span>
        </label>
      )}
    />
  );
}
