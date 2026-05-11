"use client";

import * as React from "react";
import { Download, FileArchive, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Field } from "@/components/entries/field";

import { createBulkDataExport } from "@/server/actions/exports";
import type { BulkExport, BulkExportRequest } from "@/server/contracts";
import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import { downloadBlob } from "@/lib/utils";

export interface BulkExportFormProps {
  canGenerate: boolean;
  canIncludeDeleted: boolean;
}

export function BulkExportForm({
  canGenerate,
  canIncludeDeleted,
}: BulkExportFormProps) {
  const [format, setFormat] = React.useState<"json" | "csv">("json");
  const [includeFiles, setIncludeFiles] = React.useState(true);
  const [includePackets, setIncludePackets] = React.useState(true);
  const [includeDeleted, setIncludeDeleted] = React.useState(false);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [archive, setArchive] = React.useState<BulkExport | null>(null);

  const submit = async () => {
    if (!canGenerate) return;
    setError(null);
    setSubmitting(true);
    const input: BulkExportRequest = {
      format,
      include_uploaded_files: includeFiles,
      include_generated_export_packets: includePackets,
      include_soft_deleted: canIncludeDeleted ? includeDeleted : false,
    };
    try {
      const result = await createBulkDataExport(input);
      if (!result.ok) {
        setError(userFacingErrorMessage(result.error));
        return;
      }
      setArchive(result.data);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadJson = () => {
    if (!archive) return;
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([JSON.stringify(archive, null, 2)], {
      type: "application/json",
    });
    downloadBlob(`bella-bulk-export-${date}.json`, blob);
  };

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        {strings.exportsNs.bulk.intro}
      </p>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{strings.common.errorTitle}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{strings.exportsNs.tabs.bulk}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Field id="bulk-format" label={strings.exportsNs.bulk.format}>
            <RadioGroup
              value={format}
              onValueChange={(value) => setFormat(value as "json" | "csv")}
              className="grid grid-cols-2 gap-2"
            >
              <label
                htmlFor="bulk-format-json"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <RadioGroupItem id="bulk-format-json" value="json" />
                <span>{strings.exportsNs.bulk.formatJson}</span>
              </label>
              <label
                htmlFor="bulk-format-csv"
                className="flex cursor-pointer items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <RadioGroupItem id="bulk-format-csv" value="csv" />
                <span>{strings.exportsNs.bulk.formatCsv}</span>
              </label>
            </RadioGroup>
          </Field>

          <div className="flex flex-col gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={includeFiles}
                onCheckedChange={(value) => setIncludeFiles(value === true)}
                disabled={!canGenerate}
              />
              <span>{strings.exportsNs.bulk.includeFiles}</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={includePackets}
                onCheckedChange={(value) => setIncludePackets(value === true)}
                disabled={!canGenerate}
              />
              <span>{strings.exportsNs.bulk.includePackets}</span>
            </label>
            <div className="flex flex-col gap-1">
              <label className="inline-flex items-center gap-2 text-sm">
                <Checkbox
                  checked={includeDeleted && canIncludeDeleted}
                  onCheckedChange={(value) => setIncludeDeleted(value === true)}
                  disabled={!canGenerate || !canIncludeDeleted}
                />
                <span>{strings.exportsNs.bulk.includeDeleted}</span>
              </label>
              {!canIncludeDeleted ? (
                <p className="pl-6 text-xs text-muted-foreground">
                  {strings.exportsNs.bulk.includeDeletedRoleNote}
                </p>
              ) : null}
            </div>
          </div>

          <div className="flex justify-end border-t border-border pt-4">
            <Button
              type="button"
              onClick={submit}
              disabled={submitting || !canGenerate}
            >
              {submitting ? (
                <>
                  <Loader2
                    aria-hidden="true"
                    className="h-4 w-4 animate-spin"
                  />
                  {strings.exportsNs.bulk.generating}
                </>
              ) : (
                <>
                  <FileArchive aria-hidden="true" className="h-4 w-4" />
                  {strings.exportsNs.bulk.generate}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {archive ? (
        <Card>
          <CardHeader>
            <CardTitle>{strings.exportsNs.bulk.summary}</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              <SummaryStat
                label={strings.exportsNs.bulk.tablesLabel}
                value={Object.keys(archive.tables).length}
              />
              <SummaryStat
                label={strings.exportsNs.bulk.filesLabel}
                value={archive.uploaded_file_manifest.length}
              />
              <SummaryStat
                label={strings.exportsNs.bulk.packetsLabel}
                value={archive.generated_packets.length}
              />
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {strings.exportsNs.bulk.limitations}
              </p>
              {archive.limitations.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {strings.exportsNs.bulk.noLimitations}
                </p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm leading-6 text-muted-foreground">
                  {archive.limitations.map((line, idx) => (
                    <li
                      key={`${idx}-${line.slice(0, 16)}`}
                      className="flex gap-2"
                    >
                      <span aria-hidden="true">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-col gap-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {strings.exportsNs.bulk.restoreNotes}
              </p>
              {archive.restore_notes.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  {strings.exportsNs.bulk.noRestoreNotes}
                </p>
              ) : (
                <ul className="flex flex-col gap-1 text-sm leading-6 text-muted-foreground">
                  {archive.restore_notes.map((line, idx) => (
                    <li
                      key={`${idx}-${line.slice(0, 16)}`}
                      className="flex gap-2"
                    >
                      <span aria-hidden="true">•</span>
                      <span>{line}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border pt-4">
              <Badge variant="muted">{archive.format.toUpperCase()}</Badge>
              <Button type="button" onClick={downloadJson}>
                <Download aria-hidden="true" className="h-4 w-4" />
                {strings.exportsNs.bulk.downloadJson}
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}

function SummaryStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-md border border-border bg-card/40 px-2 py-3 text-center">
      <p className="text-2xl font-semibold tabular-nums">{value}</p>
      <p className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </p>
    </div>
  );
}
