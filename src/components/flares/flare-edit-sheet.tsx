"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { z } from "zod";

import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import { Field } from "@/components/entries/field";
import { PainSegmented } from "@/components/entries/pain-segmented";
import { ToggleChip } from "@/components/entries/toggle-chip";

import { updateFlare } from "@/server/actions/flares";
import { updateFlareInputSchema } from "@/server/contracts/flares";
import type {
  BodyRegionDTO,
  FlareSessionDTO,
  SymptomDTO,
  TriggerDTO,
} from "@/server/contracts";

import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";

type UpdateFlareFormValues = z.input<typeof updateFlareInputSchema>;

export interface FlareEditSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  session: FlareSessionDTO;
  bodyRegions: BodyRegionDTO[];
  symptoms: SymptomDTO[];
  triggers: TriggerDTO[];
}

export function FlareEditSheet({
  open,
  onOpenChange,
  session,
  bodyRegions,
  symptoms,
  triggers,
}: FlareEditSheetProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const buildDefaults = React.useCallback(
    (): UpdateFlareFormValues => ({
      entry_id: session.entry.id,
      title: session.entry.title,
      pain_current: session.entry.pain_current ?? undefined,
      pain_peak: session.entry.pain_peak ?? undefined,
      notes: session.entry.notes ?? undefined,
      body_region_ids: session.entry.body_region_ids ?? [],
      symptoms: (session.entry.symptom_ids ?? []).map((symptom_id) => ({
        symptom_id,
      })),
      triggers: (session.entry.trigger_ids ?? []).map((trigger_id) => ({
        trigger_id,
      })),
    }),
    [session.entry],
  );

  const form = useForm<UpdateFlareFormValues>({
    resolver: zodResolver(updateFlareInputSchema),
    defaultValues: buildDefaults(),
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
      reset(buildDefaults());
      setServerError(null);
    }
  }, [open, reset, buildDefaults]);

  const orderedRegions = React.useMemo(
    () => [...bodyRegions].sort((a, b) => a.display_order - b.display_order),
    [bodyRegions],
  );
  const orderedSymptoms = React.useMemo(
    () => [...symptoms].sort((a, b) => a.display_order - b.display_order),
    [symptoms],
  );
  const orderedTriggers = React.useMemo(
    () => [...triggers].sort((a, b) => a.display_order - b.display_order),
    [triggers],
  );

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    setSubmitting(true);
    try {
      const result = await updateFlare(values);
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
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

  const editStrings = strings.flare.active;

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!submitting) onOpenChange(next);
      }}
    >
      <SheetContent
        side="right"
        className="flex w-full max-w-md flex-col gap-0 overflow-hidden p-0"
      >
        <SheetHeader>
          <SheetTitle>{editStrings.edit}</SheetTitle>
          <SheetDescription>{editStrings.editSubtitle}</SheetDescription>
        </SheetHeader>
        <form
          onSubmit={onSubmit}
          noValidate
          className="flex flex-1 flex-col gap-4 overflow-y-auto px-4 pb-4"
        >
          {serverError ? (
            <Alert variant="destructive">
              <AlertTitle>{strings.common.errorTitle}</AlertTitle>
              <AlertDescription>{serverError}</AlertDescription>
            </Alert>
          ) : null}

          <Field
            id="flare-edit-title"
            label={strings.flare.start.titleField}
            error={errors.title?.message}
          >
            <Input id="flare-edit-title" {...register("title")} />
          </Field>

          <div className="grid grid-cols-1 gap-4">
            <Field
              id="flare-edit-pain-current"
              label={strings.flare.start.painCurrent}
              optional
            >
              <Controller
                control={control}
                name="pain_current"
                render={({ field }) => (
                  <PainSegmented
                    id="flare-edit-pain-current"
                    value={field.value ?? undefined}
                    onChange={(next) => field.onChange(next)}
                  />
                )}
              />
            </Field>
            <Field
              id="flare-edit-pain-peak"
              label={strings.flare.start.painPeak}
              optional
            >
              <Controller
                control={control}
                name="pain_peak"
                render={({ field }) => (
                  <PainSegmented
                    id="flare-edit-pain-peak"
                    value={field.value ?? undefined}
                    onChange={(next) => field.onChange(next)}
                  />
                )}
              />
            </Field>
          </div>

          <Field label={editStrings.regions} optional>
            <Controller
              control={control}
              name="body_region_ids"
              render={({ field }) => {
                const selected = new Set(field.value ?? []);
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {orderedRegions.map((region) => {
                      const active = selected.has(region.id);
                      return (
                        <ToggleChip
                          key={region.id}
                          active={active}
                          onToggle={() => {
                            const next = new Set(selected);
                            if (active) next.delete(region.id);
                            else next.add(region.id);
                            field.onChange(Array.from(next));
                          }}
                        >
                          {region.name}
                        </ToggleChip>
                      );
                    })}
                  </div>
                );
              }}
            />
          </Field>

          <Field label={strings.flare.start.symptoms} optional>
            <Controller
              control={control}
              name="symptoms"
              render={({ field }) => {
                const selected = new Set(
                  (field.value ?? []).map((entry) => entry.symptom_id),
                );
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {orderedSymptoms.map((symptom) => {
                      const active = selected.has(symptom.id);
                      return (
                        <ToggleChip
                          key={symptom.id}
                          active={active}
                          onToggle={() => {
                            const current = field.value ?? [];
                            const next = active
                              ? current.filter(
                                  (item) => item.symptom_id !== symptom.id,
                                )
                              : [...current, { symptom_id: symptom.id }];
                            field.onChange(next);
                          }}
                        >
                          {symptom.name}
                        </ToggleChip>
                      );
                    })}
                  </div>
                );
              }}
            />
          </Field>

          <Field label={editStrings.triggers} optional>
            <Controller
              control={control}
              name="triggers"
              render={({ field }) => {
                const selected = new Set(
                  (field.value ?? []).map((entry) => entry.trigger_id),
                );
                return (
                  <div className="flex flex-wrap gap-1.5">
                    {orderedTriggers.map((trigger) => {
                      const active = selected.has(trigger.id);
                      return (
                        <ToggleChip
                          key={trigger.id}
                          active={active}
                          onToggle={() => {
                            const current = field.value ?? [];
                            const next = active
                              ? current.filter(
                                  (item) => item.trigger_id !== trigger.id,
                                )
                              : [...current, { trigger_id: trigger.id }];
                            field.onChange(next);
                          }}
                        >
                          {trigger.name}
                        </ToggleChip>
                      );
                    })}
                  </div>
                );
              }}
            />
          </Field>

          {/* Reuse the existing select primitive so users can switch the
              primary trigger without touching the entry-form internals. */}
          <Field
            id="flare-edit-primary-trigger"
            label={strings.flare.start.primaryTrigger}
            optional
          >
            <Controller
              control={control}
              name="triggers"
              render={({ field }) => {
                const items = field.value ?? [];
                if (items.length === 0) {
                  return (
                    <p className="text-xs text-muted-foreground">
                      {strings.common.none}
                    </p>
                  );
                }
                const lookup = new Map(orderedTriggers.map((t) => [t.id, t]));
                return (
                  <p className="text-xs text-muted-foreground">
                    {items
                      .map((item) => lookup.get(item.trigger_id)?.name)
                      .filter(Boolean)
                      .join(", ")}
                  </p>
                );
              }}
            />
          </Field>

          <Field
            id="flare-edit-notes"
            label={strings.flare.start.notes}
            optional
          >
            <Textarea id="flare-edit-notes" rows={4} {...register("notes")} />
          </Field>

          {/* Hidden select so we never lose entry_id even if the form is
              partially modified. */}
          <input type="hidden" {...register("entry_id")} />

          {/* Wrap submit button so the sheet body has a stable footer. */}
          <div className="mt-2 flex items-center justify-end gap-2 border-t border-border pt-4">
            <Button
              type="button"
              variant="ghost"
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
                  {editStrings.savingChanges}
                </>
              ) : (
                editStrings.saveChanges
              )}
            </Button>
          </div>
        </form>
      </SheetContent>
    </Sheet>
  );
}
