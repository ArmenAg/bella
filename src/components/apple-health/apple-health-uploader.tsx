"use client";

import * as React from "react";
import {
  AlertTriangle,
  CheckCircle2,
  CloudUpload,
  HeartPulse,
  Loader2,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  createAttachment,
  createUploadUrl,
} from "@/server/actions/attachments";
import { importAppleHealthExport } from "@/server/actions/apple-health";
import type { AppleHealthImport } from "@/server/contracts";
import { formatDate, formatDateTime } from "@/lib/format";
import { format, strings } from "@/lib/strings";
import { userFacingErrorMessage } from "@/lib/result";

const MAX_BYTES = 500 * 1024 * 1024;
const ZIP_MIME_TYPES = new Set([
  "application/zip",
  "application/x-zip-compressed",
]);

type Phase = "idle" | "uploading" | "importing" | "done" | "error";

interface AppleHealthUploaderProps {
  canWrite: boolean;
  onImported: (next: AppleHealthImport) => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  if (bytes < 1024 * 1024 * 1024)
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function uploadFileToSignedUrl(
  signedUrl: string,
  file: File,
  mimeType: string,
  onProgress: (pct: number) => void,
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl, true);
    xhr.setRequestHeader("Content-Type", mimeType);
    xhr.setRequestHeader("x-upsert", "false");
    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        onProgress(Math.round((event.loaded / event.total) * 100));
      }
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve();
      else reject(new Error(`Upload failed (${xhr.status})`));
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new Error("Upload aborted"));
    xhr.send(file);
  });
}

export function AppleHealthUploader({
  canWrite,
  onImported,
}: AppleHealthUploaderProps) {
  const [file, setFile] = React.useState<File | null>(null);
  const [phase, setPhase] = React.useState<Phase>("idle");
  const [progress, setProgress] = React.useState(0);
  const [error, setError] = React.useState<string | null>(null);
  const [lastImport, setLastImport] = React.useState<AppleHealthImport | null>(
    null,
  );
  const inputRef = React.useRef<HTMLInputElement | null>(null);

  const handlePick = (picked: File | null) => {
    setError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    if (picked.size > MAX_BYTES) {
      setError(strings.appleHealth.upload.tooLarge);
      setFile(null);
      return;
    }
    const looksZip =
      picked.name.toLowerCase().endsWith(".zip") ||
      ZIP_MIME_TYPES.has(picked.type);
    if (!looksZip) {
      setError(strings.appleHealth.upload.notZip);
      setFile(null);
      return;
    }
    setFile(picked);
  };

  const handleSubmit = async () => {
    if (!file || !canWrite) return;
    setPhase("uploading");
    setProgress(0);
    setError(null);

    const mimeType = ZIP_MIME_TYPES.has(file.type)
      ? file.type
      : "application/zip";

    try {
      const urlResult = await createUploadUrl({
        file_name: file.name,
        mime_type: mimeType as
          | "application/zip"
          | "application/x-zip-compressed",
        size_bytes: file.size,
      });
      if (!urlResult.ok)
        throw new Error(userFacingErrorMessage(urlResult.error));

      await uploadFileToSignedUrl(
        urlResult.data.signed_url,
        file,
        mimeType,
        (pct) => setProgress(pct),
      );

      const attachmentResult = await createAttachment({
        file_name: file.name,
        mime_type: mimeType as
          | "application/zip"
          | "application/x-zip-compressed",
        size_bytes: file.size,
        file_path: urlResult.data.file_path,
        gps_stripped: false,
        metadata: { apple_health_export: true },
      });
      if (!attachmentResult.ok) {
        throw new Error(userFacingErrorMessage(attachmentResult.error));
      }

      setPhase("importing");
      const importResult = await importAppleHealthExport({
        attachment_id: attachmentResult.data.id,
      });
      if (!importResult.ok) {
        throw new Error(userFacingErrorMessage(importResult.error));
      }

      setLastImport(importResult.data.import);
      setPhase("done");
      onImported(importResult.data.import);
    } catch (err) {
      setError(err instanceof Error ? err.message : strings.errors.generic);
      setPhase("error");
    }
  };

  const handleReset = () => {
    setFile(null);
    setLastImport(null);
    setProgress(0);
    setError(null);
    setPhase("idle");
    if (inputRef.current) inputRef.current.value = "";
  };

  const busy = phase === "uploading" || phase === "importing";

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <HeartPulse aria-hidden="true" className="h-4 w-4 text-primary" />
          {strings.appleHealth.upload.title}
        </CardTitle>
        <CardDescription>
          {strings.appleHealth.upload.instructions}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <Alert variant="warning">
          <AlertTriangle aria-hidden="true" />
          <AlertTitle>{strings.appleHealth.upload.warningTitle}</AlertTitle>
          <AlertDescription>
            {strings.appleHealth.upload.warningBody}
          </AlertDescription>
        </Alert>

        <p className="text-sm leading-6 text-muted-foreground">
          {strings.appleHealth.upload.safe}
        </p>

        {phase !== "done" ? (
          <div className="flex flex-col gap-3 rounded-md border border-dashed border-border bg-card/40 px-4 py-4">
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={!canWrite || busy}
                onClick={() => inputRef.current?.click()}
                className="gap-1.5"
              >
                <CloudUpload aria-hidden="true" className="h-3.5 w-3.5" />
                {strings.appleHealth.upload.browse}
              </Button>
              <span className="text-xs text-muted-foreground">
                {strings.appleHealth.upload.fileTypes}
              </span>
            </div>
            {file ? (
              <div className="flex items-center gap-3 rounded-sm border border-border bg-card px-3 py-2">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatBytes(file.size)}
                  </p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  disabled={busy}
                  onClick={() => void handleSubmit()}
                >
                  {busy
                    ? strings.appleHealth.upload.submitting
                    : strings.appleHealth.upload.submit}
                </Button>
              </div>
            ) : null}
            <input
              ref={inputRef}
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              className="hidden"
              onChange={(event) => handlePick(event.target.files?.[0] ?? null)}
            />
          </div>
        ) : null}

        {phase === "uploading" ? (
          <div className="flex flex-col gap-1.5">
            <p className="text-sm text-muted-foreground">
              {format(strings.appleHealth.upload.uploading, {
                name: file?.name ?? "",
              })}
              {" · "}
              {progress}%
            </p>
            <Progress value={progress} />
          </div>
        ) : null}

        {phase === "importing" ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 aria-hidden="true" className="h-4 w-4 animate-spin" />
            {strings.appleHealth.upload.importing}
          </div>
        ) : null}

        {phase === "error" && error ? (
          <Alert variant="destructive">
            <AlertTriangle aria-hidden="true" />
            <AlertTitle>{strings.appleHealth.upload.failedTitle}</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : null}

        {phase === "done" && lastImport ? (
          <ImportResultPanel
            data={lastImport}
            onReset={canWrite ? handleReset : undefined}
          />
        ) : null}
      </CardContent>
    </Card>
  );
}

function ImportResultPanel({
  data,
  onReset,
}: {
  data: AppleHealthImport;
  onReset?: () => void;
}) {
  const range =
    data.export_started_at && data.export_ended_at
      ? `${formatDate(data.export_started_at)} → ${formatDate(data.export_ended_at)}`
      : strings.appleHealth.result.noRange;

  return (
    <div className="flex flex-col gap-3 rounded-md border border-primary/30 bg-primary/5 px-4 py-3">
      <div className="flex items-center gap-2 text-sm font-medium text-primary">
        <CheckCircle2 aria-hidden="true" className="h-4 w-4" />
        {strings.appleHealth.upload.completedTitle}
      </div>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
        <Stat label={strings.appleHealth.result.status}>
          <Badge variant="primary">
            {strings.appleHealth.history.statuses[data.status]}
          </Badge>
        </Stat>
        <Stat label={strings.appleHealth.result.fileName}>
          <span className="truncate font-mono text-xs">
            {data.file_name ?? "—"}
          </span>
        </Stat>
        <Stat label={strings.appleHealth.result.dateRange}>{range}</Stat>
        <Stat label={strings.appleHealth.result.scanned}>
          {data.scanned_record_count.toLocaleString()}
        </Stat>
        <Stat label={strings.appleHealth.result.imported}>
          {data.imported_sample_count.toLocaleString()}
        </Stat>
        <Stat label={strings.appleHealth.result.duplicates}>
          {data.duplicate_sample_count.toLocaleString()}
        </Stat>
        <Stat label={strings.appleHealth.result.skipped}>
          {data.skipped_record_count.toLocaleString()}
        </Stat>
        <Stat label={strings.appleHealth.result.summaries}>
          {data.daily_summary_count.toLocaleString()}
        </Stat>
      </dl>
      <p className="text-xs text-muted-foreground">
        {formatDateTime(data.created_at)}
      </p>
      {onReset ? (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onReset}
          className="self-start"
        >
          {strings.appleHealth.upload.newImport}
        </Button>
      ) : null}
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] uppercase tracking-wider text-muted-foreground">
        {label}
      </dt>
      <dd className="text-sm font-medium text-foreground">{children}</dd>
    </div>
  );
}
