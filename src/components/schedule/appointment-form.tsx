"use client";

import * as React from "react";
import { canWrite } from "@/lib/auth";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
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
import { ChipInput } from "@/components/entries/chip-input";

import { appointmentMutationSchema } from "@/server/contracts/schedule";
import {
  createAppointment,
  softDeleteAppointment,
  updateAppointment,
} from "@/server/actions/schedule";
import type { Appointment } from "@/server/contracts";

import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import {
  toLocalDateTimeInputValue,
  fromLocalDateTimeInputValue,
  nowIso,
  nowIsoForInput,
} from "@/lib/format";
import { firstZodError } from "@/lib/forms";
import { useShellProfile } from "@/components/shell/shell-context";

type AppointmentFormValues = z.input<typeof appointmentMutationSchema>;

const STATUS_ORDER: Appointment["status"][] = [
  "scheduled",
  "completed",
  "cancelled",
];

function buildDefaults(
  appointment: Appointment | undefined,
): AppointmentFormValues {
  if (!appointment) {
    return {
      date_time: nowIso(),
      provider: undefined,
      specialty: undefined,
      location: undefined,
      location_url: undefined,
      purpose: "",
      prep_notes: undefined,
      questions: [],
      files_to_show: [],
      decisions_needed: [],
      after_visit_summary: undefined,
      follow_up_tasks: [],
      status: "scheduled",
    };
  }
  return {
    date_time: appointment.date_time,
    provider: appointment.provider ?? undefined,
    specialty: appointment.specialty ?? undefined,
    location: appointment.location ?? undefined,
    location_url: appointment.location_url ?? undefined,
    purpose: appointment.purpose,
    prep_notes: appointment.prep_notes ?? undefined,
    questions: appointment.questions ?? [],
    files_to_show: appointment.files_to_show ?? [],
    decisions_needed: appointment.decisions_needed ?? [],
    after_visit_summary: appointment.after_visit_summary ?? undefined,
    follow_up_tasks: appointment.follow_up_tasks ?? [],
    status: appointment.status,
  };
}

export interface AppointmentFormProps {
  mode: "create" | "edit";
  appointment?: Appointment;
}

export function AppointmentForm({ mode, appointment }: AppointmentFormProps) {
  const router = useRouter();
  const profile = useShellProfile();
  const writable = canWrite(profile?.role);

  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<AppointmentFormValues>({
    resolver: zodResolver(appointmentMutationSchema),
    defaultValues: buildDefaults(appointment),
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
      const payload: AppointmentFormValues = {
        ...values,
        provider: values.provider?.trim() || undefined,
        specialty: values.specialty?.trim() || undefined,
        location: values.location?.trim() || undefined,
        location_url: values.location_url?.trim() || undefined,
        prep_notes: values.prep_notes?.trim() || undefined,
        after_visit_summary: values.after_visit_summary?.trim() || undefined,
      };

      if (mode === "edit" && appointment) {
        const result = await updateAppointment({
          ...payload,
          id: appointment.id,
        });
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
      } else {
        const result = await createAppointment(payload);
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
      }
      router.push("/schedule?tab=appointments");
      router.refresh();
    } finally {
      setSubmitting(false);
    }
  });

  const handleDelete = async (reason: string) => {
    if (!appointment) return;
    setDeleting(true);
    try {
      const result = await softDeleteAppointment(appointment.id, reason);
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
      setConfirmDelete(false);
      router.push("/schedule?tab=appointments");
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
          <CardTitle>
            {strings.schedule.appointments.form.summarySection}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="appointment-date-time"
            label={strings.schedule.appointments.form.dateTime}
            error={errors.date_time?.message}
          >
            <Controller
              control={control}
              name="date_time"
              render={({ field }) => (
                <Input
                  id="appointment-date-time"
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
                  aria-invalid={errors.date_time ? true : undefined}
                />
              )}
            />
          </Field>

          <Field
            id="appointment-purpose"
            label={strings.schedule.appointments.form.purpose}
            error={errors.purpose?.message}
          >
            <Textarea
              id="appointment-purpose"
              rows={2}
              placeholder={
                strings.schedule.appointments.form.purposePlaceholder
              }
              aria-invalid={errors.purpose ? true : undefined}
              {...register("purpose")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="appointment-provider"
              label={strings.schedule.appointments.form.provider}
              optional
              error={errors.provider?.message}
            >
              <Input
                id="appointment-provider"
                placeholder={
                  strings.schedule.appointments.form.providerPlaceholder
                }
                {...register("provider")}
              />
            </Field>
            <Field
              id="appointment-specialty"
              label={strings.schedule.appointments.form.specialty}
              optional
              error={errors.specialty?.message}
            >
              <Input
                id="appointment-specialty"
                placeholder={
                  strings.schedule.appointments.form.specialtyPlaceholder
                }
                {...register("specialty")}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="appointment-location"
              label={strings.schedule.appointments.form.location}
              optional
              error={errors.location?.message}
            >
              <Input
                id="appointment-location"
                placeholder={
                  strings.schedule.appointments.form.locationPlaceholder
                }
                {...register("location")}
              />
            </Field>
            <Field
              id="appointment-location-url"
              label={strings.schedule.appointments.form.locationUrl}
              optional
              error={errors.location_url?.message}
            >
              <Input
                id="appointment-location-url"
                type="url"
                placeholder={
                  strings.schedule.appointments.form.locationUrlPlaceholder
                }
                {...register("location_url")}
              />
            </Field>
          </div>

          <Field
            id="appointment-status"
            label={strings.schedule.appointments.form.status}
            error={errors.status?.message}
          >
            <Controller
              control={control}
              name="status"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={(next) =>
                    field.onChange(next as Appointment["status"])
                  }
                >
                  <SelectTrigger id="appointment-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_ORDER.map((status) => (
                      <SelectItem key={status} value={status}>
                        {strings.schedule.appointments.statuses[status]}
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
          <CardTitle>
            {strings.schedule.appointments.form.prepSection}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="appointment-prep-notes"
            label={strings.schedule.appointments.form.prepNotes}
            optional
            error={errors.prep_notes?.message}
          >
            <Textarea
              id="appointment-prep-notes"
              rows={4}
              placeholder={
                strings.schedule.appointments.form.prepNotesPlaceholder
              }
              {...register("prep_notes")}
            />
          </Field>

          <Field
            id="appointment-questions"
            label={strings.schedule.appointments.form.questions}
            optional
          >
            <Controller
              control={control}
              name="questions"
              render={({ field }) => (
                <ChipInput
                  id="appointment-questions"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  maxLength={400}
                  placeholder={
                    strings.schedule.appointments.form.questionsPlaceholder
                  }
                  ariaLabel={strings.schedule.appointments.form.questions}
                />
              )}
            />
          </Field>

          <Field
            id="appointment-files-to-show"
            label={strings.schedule.appointments.form.filesToShow}
            optional
          >
            <Controller
              control={control}
              name="files_to_show"
              render={({ field }) => (
                <ChipInput
                  id="appointment-files-to-show"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  maxLength={240}
                  placeholder={
                    strings.schedule.appointments.form.filesToShowPlaceholder
                  }
                  ariaLabel={strings.schedule.appointments.form.filesToShow}
                />
              )}
            />
          </Field>

          <Field
            id="appointment-decisions-needed"
            label={strings.schedule.appointments.form.decisionsNeeded}
            optional
          >
            <Controller
              control={control}
              name="decisions_needed"
              render={({ field }) => (
                <ChipInput
                  id="appointment-decisions-needed"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  maxLength={400}
                  placeholder={
                    strings.schedule.appointments.form
                      .decisionsNeededPlaceholder
                  }
                  ariaLabel={strings.schedule.appointments.form.decisionsNeeded}
                />
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            {strings.schedule.appointments.form.afterVisitSection}
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="appointment-avs"
            label={strings.schedule.appointments.form.afterVisitSummary}
            optional
            error={errors.after_visit_summary?.message}
          >
            <Textarea
              id="appointment-avs"
              rows={4}
              placeholder={
                strings.schedule.appointments.form.afterVisitSummaryPlaceholder
              }
              {...register("after_visit_summary")}
            />
          </Field>

          <Field
            id="appointment-follow-up"
            label={strings.schedule.appointments.form.followUpTasks}
            optional
          >
            <Controller
              control={control}
              name="follow_up_tasks"
              render={({ field }) => (
                <ChipInput
                  id="appointment-follow-up"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  maxLength={400}
                  placeholder={
                    strings.schedule.appointments.form.followUpTasksPlaceholder
                  }
                  ariaLabel={strings.schedule.appointments.form.followUpTasks}
                />
              )}
            />
          </Field>
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
              router.push("/schedule?tab=appointments");
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

      {mode === "edit" && appointment ? (
        <DestructiveConfirm
          open={confirmDelete}
          onOpenChange={(next) => {
            if (!deleting) setConfirmDelete(next);
          }}
          title={strings.schedule.appointments.form.deleteTitle}
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
