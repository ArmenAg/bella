"use client";

import * as React from "react";
import { Download, FileText, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ChipInput } from "@/components/entries/chip-input";
import { Field } from "@/components/entries/field";

import { generateClinicianExportPacket } from "@/server/actions/exports";
import type {
  BodyRegionDTO,
  DiagnosisNode,
  ExportPacket,
  ExportPacketRequest,
} from "@/server/contracts";

import { strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";
import { downloadBlob } from "@/lib/utils";
import { formatDate } from "@/lib/format";

const ANY_VALUE = "__any__";

export interface ClinicianPacketFormProps {
  diagnoses: DiagnosisNode[];
  bodyRegions: BodyRegionDTO[];
  canGenerate: boolean;
}

export function ClinicianPacketForm({
  diagnoses,
  bodyRegions,
  canGenerate,
}: ClinicianPacketFormProps) {
  const [dateFrom, setDateFrom] = React.useState("");
  const [dateTo, setDateTo] = React.useState("");
  const [branch, setBranch] = React.useState(ANY_VALUE);
  const [region, setRegion] = React.useState(ANY_VALUE);
  const [flaresOnly, setFlaresOnly] = React.useState(false);
  const [includePhotos, setIncludePhotos] = React.useState(false);
  const [includeProcedures, setIncludeProcedures] = React.useState(true);
  const [questions, setQuestions] = React.useState<string[]>([]);

  const [submitting, setSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [packet, setPacket] = React.useState<ExportPacket | null>(null);

  const orderedDiagnoses = React.useMemo(
    () =>
      [...diagnoses].sort((a, b) =>
        a.title.toLocaleLowerCase().localeCompare(b.title.toLocaleLowerCase()),
      ),
    [diagnoses],
  );
  const orderedRegions = React.useMemo(
    () => [...bodyRegions].sort((a, b) => a.display_order - b.display_order),
    [bodyRegions],
  );

  const submit = async () => {
    if (!canGenerate) return;
    setError(null);
    setSubmitting(true);

    const input: ExportPacketRequest = {
      flares_only: flaresOnly,
      include_photos: includePhotos,
      include_procedure_summaries: includeProcedures,
      include_soft_deleted: false,
      clinician_questions: questions,
      ...(dateFrom ? { date_from: dateFrom } : {}),
      ...(dateTo ? { date_to: dateTo } : {}),
      ...(branch !== ANY_VALUE ? { diagnostic_branch_id: branch } : {}),
      ...(region !== ANY_VALUE ? { body_region_id: region } : {}),
    };

    try {
      const result = await generateClinicianExportPacket(input);
      if (!result.ok) {
        setError(userFacingErrorMessage(result.error));
        return;
      }
      setPacket(result.data);
    } finally {
      setSubmitting(false);
    }
  };

  const downloadMarkdown = () => {
    if (!packet) return;
    const date = new Date().toISOString().slice(0, 10);
    const blob = new Blob([packet.markdown], { type: "text/markdown" });
    downloadBlob(`bella-clinician-packet-${date}.md`, blob);
  };

  const filters = packet?.filters;

  return (
    <div className="flex flex-col gap-5">
      <p className="text-sm text-muted-foreground">
        {strings.exportsNs.clinician.intro}
      </p>

      {error ? (
        <Alert variant="destructive">
          <AlertTitle>{strings.common.errorTitle}</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>{strings.exportsNs.tabs.clinician}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="packet-date-from"
              label={strings.exportsNs.clinician.dateFrom}
              optional
            >
              <Input
                id="packet-date-from"
                type="date"
                value={dateFrom}
                onChange={(event) => setDateFrom(event.target.value)}
                disabled={!canGenerate}
              />
            </Field>
            <Field
              id="packet-date-to"
              label={strings.exportsNs.clinician.dateTo}
              optional
            >
              <Input
                id="packet-date-to"
                type="date"
                value={dateTo}
                onChange={(event) => setDateTo(event.target.value)}
                disabled={!canGenerate}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Field
              id="packet-branch"
              label={strings.exportsNs.clinician.branch}
              optional
            >
              <Select
                value={branch}
                onValueChange={setBranch}
                disabled={!canGenerate}
              >
                <SelectTrigger id="packet-branch">
                  <SelectValue
                    placeholder={strings.exportsNs.clinician.branchAny}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_VALUE}>
                    {strings.exportsNs.clinician.branchAny}
                  </SelectItem>
                  {orderedDiagnoses.map((node) => (
                    <SelectItem key={node.id} value={node.id}>
                      {node.title}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field
              id="packet-region"
              label={strings.exportsNs.clinician.bodyRegion}
              optional
            >
              <Select
                value={region}
                onValueChange={setRegion}
                disabled={!canGenerate}
              >
                <SelectTrigger id="packet-region">
                  <SelectValue
                    placeholder={strings.exportsNs.clinician.bodyRegionAny}
                  />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ANY_VALUE}>
                    {strings.exportsNs.clinician.bodyRegionAny}
                  </SelectItem>
                  {orderedRegions.map((bodyRegion) => (
                    <SelectItem key={bodyRegion.id} value={bodyRegion.id}>
                      {bodyRegion.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="flex flex-wrap gap-4">
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={flaresOnly}
                onCheckedChange={(value) => setFlaresOnly(value === true)}
                disabled={!canGenerate}
              />
              <span>{strings.exportsNs.clinician.flaresOnly}</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={includePhotos}
                onCheckedChange={(value) => setIncludePhotos(value === true)}
                disabled={!canGenerate}
              />
              <span>{strings.exportsNs.clinician.includePhotos}</span>
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <Checkbox
                checked={includeProcedures}
                onCheckedChange={(value) =>
                  setIncludeProcedures(value === true)
                }
                disabled={!canGenerate}
              />
              <span>
                {strings.exportsNs.clinician.includeProcedureSummaries}
              </span>
            </label>
          </div>

          <Field
            id="packet-questions"
            label={strings.exportsNs.clinician.clinicianQuestions}
            optional
          >
            <ChipInput
              id="packet-questions"
              value={questions}
              onChange={setQuestions}
              placeholder={
                strings.exportsNs.clinician.clinicianQuestionsPlaceholder
              }
              disabled={!canGenerate}
              maxLength={400}
              ariaLabel={strings.exportsNs.clinician.clinicianQuestions}
            />
          </Field>

          <div className="flex flex-col gap-2 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-end">
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
                  {strings.exportsNs.clinician.generating}
                </>
              ) : (
                <>
                  <FileText aria-hidden="true" className="h-4 w-4" />
                  {strings.exportsNs.clinician.generate}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{strings.exportsNs.clinician.preview}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {!packet ? (
            <p className="text-sm text-muted-foreground">
              {strings.exportsNs.clinician.noPreview}
            </p>
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                <Badge variant="muted">
                  {strings.exportsNs.clinician.attachmentsLabel}:{" "}
                  {packet.included_attachment_ids.length}
                </Badge>
                {filters?.date_from || filters?.date_to ? (
                  <Badge variant="outline">
                    {strings.exportsNs.clinician.filtersDateRange}:{" "}
                    {filters?.date_from
                      ? formatDate(filters.date_from)
                      : strings.exportsNs.clinician.anyValue}{" "}
                    →{" "}
                    {filters?.date_to
                      ? formatDate(filters.date_to)
                      : strings.exportsNs.clinician.anyValue}
                  </Badge>
                ) : null}
                {filters?.diagnostic_branch_id ? (
                  <Badge variant="outline">
                    {strings.exportsNs.clinician.filtersBranch}:{" "}
                    {orderedDiagnoses.find(
                      (node) => node.id === filters.diagnostic_branch_id,
                    )?.title ?? filters.diagnostic_branch_id}
                  </Badge>
                ) : null}
                {filters?.body_region_id ? (
                  <Badge variant="outline">
                    {strings.exportsNs.clinician.filtersRegion}:{" "}
                    {orderedRegions.find(
                      (item) => item.id === filters.body_region_id,
                    )?.name ?? filters.body_region_id}
                  </Badge>
                ) : null}
                {filters?.flares_only ? (
                  <Badge variant="outline">
                    {strings.exportsNs.clinician.filtersFlares}
                  </Badge>
                ) : null}
                {filters?.include_photos ? (
                  <Badge variant="outline">
                    {strings.exportsNs.clinician.filtersPhotos}
                  </Badge>
                ) : null}
                {filters?.include_procedure_summaries ? (
                  <Badge variant="outline">
                    {strings.exportsNs.clinician.filtersProcedures}
                  </Badge>
                ) : null}
                {filters?.clinician_questions &&
                filters.clinician_questions.length > 0 ? (
                  <Badge variant="outline">
                    {strings.exportsNs.clinician.filtersQuestions}:{" "}
                    {filters.clinician_questions.length}
                  </Badge>
                ) : null}
              </div>

              <pre className="max-h-[480px] overflow-auto rounded-md border border-border bg-card/40 p-4 font-mono text-xs leading-6 whitespace-pre-wrap text-foreground">
                {packet.markdown}
              </pre>

              <div className="flex justify-end">
                <Button type="button" onClick={downloadMarkdown}>
                  <Download aria-hidden="true" className="h-4 w-4" />
                  {strings.exportsNs.clinician.download}
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
