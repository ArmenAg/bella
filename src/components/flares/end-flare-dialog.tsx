"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Field } from "@/components/entries/field";
import { PainSegmented } from "@/components/entries/pain-segmented";

import { endFlare } from "@/server/actions/flares";
import { endFlareInputSchema } from "@/server/contracts/flares";
import type { FlareSessionDTO } from "@/server/contracts";

import {
  fromLocalDateTimeInputValue,
  toLocalDateTimeInputValue,
} from "@/lib/format";
import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";

type EndFlareFormValues = z.input<typeof endFlareInputSchema>;

export interface EndFlareDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: FlareSessionDTO;
  onEnded?: (next: FlareSessionDTO) => void;
}

export function EndFlareDialog({
  open,
  onOpenChange,
  session,
  onEnded,
}: EndFlareDialogProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<EndFlareFormValues>({
    resolver: zodResolver(endFlareInputSchema),
    defaultValues: {
      entry_id: session.entry.id,
      ended_at: new Date().toISOString(),
      pain_current: undefined,
      recovery_minutes: undefined,
      response: undefined,
      notes: undefined,
    },
    mode: "onTouched",
  });

  const {
    register,
    control,
    handleSubmit,
    reset,
    formState: { errors },
  } = form;

  React.useEffect(() => {
    if (open) {
      reset({
        entry_id: session.entry.id,
        ended_at: new Date().toISOString(),
        pain_current: undefined,
        recovery_minutes: undefined,
        response: undefined,
        notes: undefined,
      });
      setServerError(null);
    }
  }, [open, reset, session.entry.id]);

  const endStrings = strings.flare.end;

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await endFlare({
        entry_id: values.entry_id,
        ended_at: values.ended_at,
        pain_current: values.pain_current,
        recovery_minutes: values.recovery_minutes,
        response: values.response,
        notes: values.notes,
      });
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
      onEnded?.(result.data);
      onOpenChange(false);
      router.refresh();
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : strings.errors.generic,
      );
    } finally {
      setSubmitting(false);
    }
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{endStrings.title}</DialogTitle>
          <DialogDescription>{endStrings.subtitle}</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {serverError ? (
            <Alert variant="destructive">
              <AlertTitle>{strings.common.errorTitle}</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <Field
            id="end-flare-ended-at"
            label={endStrings.endedAt}
            error={errors.ended_at?.message}
          >
            <Controller
              control={control}
              name="ended_at"
              render={({ field }) => (
                <Input
                  id="end-flare-ended-at"
                  type="datetime-local"
                  value={
                    field.value
                      ? toLocalDateTimeInputValue(field.value)
                      : toLocalDateTimeInputValue(new Date().toISOString())
                  }
                  onChange={(event) => {
                    const next = fromLocalDateTimeInputValue(
                      event.target.value,
                    );
                    if (next) field.onChange(next);
                  }}
                  aria-invalid={errors.ended_at ? true : undefined}
                />
              )}
            />
          </Field>

          <Field
            id="end-flare-pain-current"
            label={endStrings.painCurrent}
            optional
            error={errors.pain_current?.message}
          >
            <Controller
              control={control}
              name="pain_current"
              render={({ field }) => (
                <PainSegmented
                  id="end-flare-pain-current"
                  value={field.value ?? undefined}
                  onChange={(next) => field.onChange(next)}
                  ariaLabel={endStrings.painCurrent}
                />
              )}
            />
          </Field>

          <Field
            id="end-flare-recovery-minutes"
            label={endStrings.recoveryMinutes}
            optional
            description={endStrings.recoveryHelp}
            error={errors.recovery_minutes?.message}
          >
            <Controller
              control={control}
              name="recovery_minutes"
              render={({ field }) => (
                <Input
                  id="end-flare-recovery-minutes"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  placeholder={endStrings.recoveryMinutesPlaceholder}
                  value={field.value ?? ""}
                  onChange={(event) => {
                    const raw = event.target.value;
                    if (raw === "") {
                      field.onChange(undefined);
                      return;
                    }
                    const parsed = Number(raw);
                    field.onChange(
                      Number.isFinite(parsed) ? parsed : undefined,
                    );
                  }}
                />
              )}
            />
          </Field>

          <Field
            id="end-flare-response"
            label={endStrings.response}
            optional
            error={errors.response?.message}
          >
            <Textarea
              id="end-flare-response"
              rows={3}
              placeholder={endStrings.responsePlaceholder}
              {...register("response")}
            />
          </Field>

          <Field
            id="end-flare-notes"
            label={endStrings.notes}
            optional
            error={errors.notes?.message}
          >
            <Textarea id="end-flare-notes" rows={3} {...register("notes")} />
          </Field>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={submitting}
            >
              {strings.actions.cancel}
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                  {endStrings.submitting}
                </>
              ) : (
                endStrings.submit
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
