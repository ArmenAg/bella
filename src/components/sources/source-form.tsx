"use client";

import * as React from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { Loader2, Trash2 } from "lucide-react";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChipInput } from "@/components/entries/chip-input";
import { Field } from "@/components/entries/field";
import { DestructiveConfirm } from "@/components/feedback/destructive-confirm";
import { AttachmentUploader } from "@/components/upload/attachment-uploader";
import type { AttachmentUploaderHandle } from "@/components/upload/types";

import {
  attachFileToSource,
  createSource,
  softDeleteSource,
  updateSource,
} from "@/server/actions/sources";
import {
  sourceMutationSchema,
  type CreateSourceInput,
  type Source,
  type SourceLinks,
  type SourceType,
} from "@/server/contracts";

import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import { toDateInputValue } from "@/lib/format";
import { firstZodError } from "@/lib/forms";

import { SourceLinksCard } from "./source-links-card";
import type { DiagnosisNode, Decision } from "@/server/contracts";

const SOURCE_TYPES: SourceType[] = [
  "visit_note",
  "imaging_report",
  "lab_report",
  "generated_report",
  "literature",
  "upload",
  "other",
];

type SourceFormValues = z.input<typeof sourceMutationSchema>;

export interface SourceFormProps {
  mode: "create" | "edit";
  source?: Source;
  sourceLinks?: SourceLinks;
  diagnoses: DiagnosisNode[];
  decisions: Decision[];
  canWrite: boolean;
}

function buildDefaults(source: Source | undefined): SourceFormValues {
  if (source) {
    return {
      title: source.title,
      source_type: source.source_type,
      source_date: source.source_date ?? undefined,
      provider: source.provider ?? undefined,
      citation: source.citation ?? undefined,
      summary: source.summary ?? undefined,
      tags: source.tags ?? [],
      url: source.url ?? undefined,
    };
  }
  return {
    title: "",
    source_type: "visit_note",
    source_date: undefined,
    provider: undefined,
    citation: undefined,
    summary: undefined,
    tags: [],
    url: undefined,
  };
}

export function SourceForm({
  mode,
  source,
  sourceLinks,
  diagnoses,
  decisions,
  canWrite,
}: SourceFormProps) {
  const router = useRouter();
  const uploaderRef = React.useRef<AttachmentUploaderHandle>(null);

  const [pendingUploads, setPendingUploads] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [deleting, setDeleting] = React.useState(false);
  const [confirmDelete, setConfirmDelete] = React.useState(false);
  const [serverError, setServerError] = React.useState<string | null>(null);

  const form = useForm<SourceFormValues>({
    resolver: zodResolver(sourceMutationSchema),
    defaultValues: buildDefaults(source),
    mode: "onTouched",
  });

  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = form;

  const onSubmit = handleSubmit(async (raw) => {
    if (!canWrite) return;
    setServerError(null);

    if (uploaderRef.current?.hasPendingUploads()) {
      setServerError(strings.painBook.form.pendingUploads);
      return;
    }

    // Strip empty optional strings so they don't fail the URL/regex checks.
    const values: CreateSourceInput = {
      title: raw.title,
      source_type: raw.source_type,
      tags: raw.tags ?? [],
      ...(raw.source_date ? { source_date: raw.source_date } : {}),
      ...(raw.provider && raw.provider.trim()
        ? { provider: raw.provider.trim() }
        : {}),
      ...(raw.citation && raw.citation.trim()
        ? { citation: raw.citation.trim() }
        : {}),
      ...(raw.summary && raw.summary.trim()
        ? { summary: raw.summary.trim() }
        : {}),
      ...(raw.url && raw.url.trim() ? { url: raw.url.trim() } : {}),
    };

    setSubmitting(true);
    try {
      if (mode === "edit" && source) {
        const result = await updateSource({ id: source.id, ...values });
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
        router.push("/sources");
        router.refresh();
      } else {
        const result = await createSource(values);
        if (!result.ok) {
          setServerError(userFacingErrorMessage(result.error));
          return;
        }
        const newId = result.data.id;
        const readyIds = uploaderRef.current?.getReadyAttachmentIds() ?? [];
        for (const attachmentId of readyIds) {
          await attachFileToSource({
            source_id: newId,
            attachment_id: attachmentId,
          });
        }
        router.push(`/sources/${newId}/edit`);
        router.refresh();
      }
    } catch (error) {
      setServerError(
        error instanceof Error ? error.message : strings.errors.generic,
      );
    } finally {
      setSubmitting(false);
    }
  });

  const handleDelete = async (reason: string) => {
    if (!source) return;
    setDeleting(true);
    try {
      const result = await softDeleteSource(source.id, reason);
      if (!result.ok) {
        setServerError(userFacingErrorMessage(result.error));
        return;
      }
      setConfirmDelete(false);
      router.push("/sources");
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
          <CardTitle>{strings.sources.form.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field
            id="source-title"
            label={strings.sources.form.title}
            error={errors.title?.message}
          >
            <Input
              id="source-title"
              placeholder={strings.sources.form.titlePlaceholder}
              aria-invalid={errors.title ? true : undefined}
              disabled={!canWrite}
              {...register("title")}
            />
          </Field>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="source-type"
              label={strings.sources.form.sourceType}
              error={errors.source_type?.message}
            >
              <Controller
                control={control}
                name="source_type"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(next) => field.onChange(next as SourceType)}
                    disabled={!canWrite}
                  >
                    <SelectTrigger id="source-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {SOURCE_TYPES.map((typeKey) => (
                        <SelectItem key={typeKey} value={typeKey}>
                          {
                            strings.sources.types[
                              typeKey as keyof typeof strings.sources.types
                            ]
                          }
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </Field>
            <Field
              id="source-date"
              label={strings.sources.form.sourceDate}
              optional
              error={errors.source_date?.message}
            >
              <Controller
                control={control}
                name="source_date"
                render={({ field }) => (
                  <Input
                    id="source-date"
                    type="date"
                    value={toDateInputValue(field.value ?? null)}
                    onChange={(event) =>
                      field.onChange(event.target.value || undefined)
                    }
                    disabled={!canWrite}
                  />
                )}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="source-provider"
              label={strings.sources.form.provider}
              optional
              error={errors.provider?.message}
            >
              <Input
                id="source-provider"
                placeholder={strings.sources.form.providerPlaceholder}
                disabled={!canWrite}
                {...register("provider")}
              />
            </Field>
            <Field
              id="source-url"
              label={strings.sources.form.url}
              optional
              error={errors.url?.message}
            >
              <Input
                id="source-url"
                type="url"
                inputMode="url"
                placeholder={strings.sources.form.urlPlaceholder}
                aria-invalid={errors.url ? true : undefined}
                disabled={!canWrite}
                {...register("url")}
              />
            </Field>
          </div>

          <Field
            id="source-citation"
            label={strings.sources.form.citation}
            optional
            error={errors.citation?.message}
          >
            <Textarea
              id="source-citation"
              rows={2}
              placeholder={strings.sources.form.citationPlaceholder}
              disabled={!canWrite}
              {...register("citation")}
            />
          </Field>

          <Field
            id="source-summary"
            label={strings.sources.form.summary}
            optional
            error={errors.summary?.message}
          >
            <Textarea
              id="source-summary"
              rows={5}
              placeholder={strings.sources.form.summaryPlaceholder}
              disabled={!canWrite}
              {...register("summary")}
            />
          </Field>

          <Field
            id="source-tags"
            label={strings.sources.form.tags}
            optional
            error={
              Array.isArray(errors.tags)
                ? undefined
                : (errors.tags as { message?: string } | undefined)?.message
            }
          >
            <Controller
              control={control}
              name="tags"
              render={({ field }) => (
                <ChipInput
                  id="source-tags"
                  value={field.value ?? []}
                  onChange={field.onChange}
                  placeholder={strings.sources.form.tagsPlaceholder}
                  disabled={!canWrite}
                  ariaLabel={strings.sources.form.tags}
                />
              )}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{strings.sources.form.attachments}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {mode === "create" ? (
            <p className="text-xs text-muted-foreground">
              {strings.sources.form.attachmentsNewNote}
            </p>
          ) : (
            <AttachmentUploader
              ref={uploaderRef}
              linkedType="source"
              linkedId={source?.id}
              disabled={submitting || deleting || !canWrite}
              onReadyChange={() => {
                setPendingUploads(
                  uploaderRef.current?.hasPendingUploads() ?? false,
                );
              }}
            />
          )}
        </CardContent>
      </Card>

      {mode === "edit" && source ? (
        <SourceLinksCard
          sourceId={source.id}
          initialLinks={sourceLinks}
          diagnoses={diagnoses}
          decisions={decisions}
          canWrite={canWrite}
        />
      ) : null}

      {canWrite ? (
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
            {pendingUploads ? (
              <span className="text-xs text-muted-foreground">
                {strings.painBook.form.pendingUploads}
              </span>
            ) : null}
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                router.push("/sources");
                router.refresh();
              }}
              disabled={submitting}
            >
              {strings.actions.cancel}
            </Button>
            <Button type="submit" disabled={submitting || pendingUploads}>
              {submitting ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                  {strings.actions.saving}
                </>
              ) : (
                strings.actions.save
              )}
            </Button>
          </div>
        </div>
      ) : null}

      {mode === "edit" && source ? (
        <DestructiveConfirm
          open={confirmDelete}
          onOpenChange={(next) => {
            if (!deleting) setConfirmDelete(next);
          }}
          title={strings.sources.form.deleteTitle}
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
