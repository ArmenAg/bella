"use client";

import * as React from "react";
import {
  CloudUpload,
  Camera,
  FileText,
  Film,
  ImageIcon,
  Loader2,
  X,
  AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  createAttachment,
  createUploadUrl,
  getSignedAttachmentUrl,
  linkAttachment,
  softDeleteAttachment,
} from "@/server/actions/attachments";
import type {
  AttachmentDTO,
  AttachmentLinkedType,
  CreateUploadUrlInput,
} from "@/server/contracts";
import { strings, format } from "@/lib/strings";
import { cn } from "@/lib/utils";
import {
  MAX_UPLOAD_BYTES,
  formatFileSize,
  isAllowedMimeType,
  isImageMime,
  isPdfMime,
  isVideoMime,
} from "./file-utils";
import type { AttachmentItem, AttachmentUploaderHandle } from "./types";

type AttachmentLinkedTypeInput = AttachmentLinkedType;

export interface AttachmentUploaderProps {
  /** Linked entity type. When provided with linkedId, attachments link as soon as createAttachment succeeds. */
  linkedType?: AttachmentLinkedTypeInput;
  linkedId?: string;
  /** Existing attachments to seed the list (e.g. when editing). */
  initialAttachments?: AttachmentDTO[];
  /** Notified when ready attachment ids change. */
  onReadyChange?: (attachmentIds: string[]) => void;
  className?: string;
  disabled?: boolean;
}

function makeLocalId() {
  return `att-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

function detectMimeType(file: File): string {
  if (file.type) return file.type;
  const ext = file.name.toLowerCase().split(".").pop() ?? "";
  switch (ext) {
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "webp":
      return "image/webp";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    case "mp4":
      return "video/mp4";
    case "mov":
      return "video/quicktime";
    case "pdf":
      return "application/pdf";
    case "txt":
      return "text/plain";
    case "md":
      return "text/markdown";
    default:
      return "application/octet-stream";
  }
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
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed (${xhr.status})`));
      }
    };
    xhr.onerror = () => reject(new Error("Upload failed"));
    xhr.onabort = () => reject(new Error("Upload aborted"));
    xhr.send(file);
  });
}

function FileTypeIcon({ mime }: { mime: string }) {
  const className = "h-5 w-5 text-muted-foreground";
  if (isImageMime(mime))
    return <ImageIcon aria-hidden="true" className={className} />;
  if (isVideoMime(mime))
    return <Film aria-hidden="true" className={className} />;
  if (isPdfMime(mime))
    return <FileText aria-hidden="true" className={className} />;
  return <FileText aria-hidden="true" className={className} />;
}

function ItemPreview({
  attachment,
  previewUrl,
}: {
  attachment: AttachmentDTO;
  previewUrl?: string;
}) {
  if (!previewUrl) {
    return (
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted">
        <FileTypeIcon mime={attachment.mime_type} />
      </div>
    );
  }
  if (isImageMime(attachment.mime_type)) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={previewUrl}
        alt={attachment.file_name}
        className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
      />
    );
  }
  if (isVideoMime(attachment.mime_type)) {
    return (
      <video
        src={previewUrl}
        className="h-12 w-12 shrink-0 rounded-md border border-border object-cover"
        muted
        playsInline
      />
    );
  }
  return (
    <a
      href={previewUrl}
      target="_blank"
      rel="noreferrer"
      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground hover:bg-muted/70"
      aria-label={attachment.file_name}
    >
      <FileTypeIcon mime={attachment.mime_type} />
    </a>
  );
}

export const AttachmentUploader = React.forwardRef<
  AttachmentUploaderHandle,
  AttachmentUploaderProps
>(function AttachmentUploader(
  {
    linkedType,
    linkedId,
    initialAttachments = [],
    onReadyChange,
    className,
    disabled,
  },
  ref,
) {
  const [items, setItems] = React.useState<AttachmentItem[]>(() =>
    initialAttachments.map((attachment) => ({
      kind: "ready" as const,
      localId: attachment.id,
      attachment,
      description: attachment.description ?? "",
    })),
  );
  const itemsRef = React.useRef(items);
  React.useEffect(() => {
    itemsRef.current = items;
  }, [items]);

  const [previewUrls, setPreviewUrls] = React.useState<Record<string, string>>(
    {},
  );
  const [dragActive, setDragActive] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);
  const cameraInputRef = React.useRef<HTMLInputElement | null>(null);

  const readyAttachmentIds = React.useMemo(
    () =>
      items
        .filter(
          (item): item is Extract<AttachmentItem, { kind: "ready" }> =>
            item.kind === "ready",
        )
        .map((item) => item.attachment.id),
    [items],
  );

  React.useEffect(() => {
    onReadyChange?.(readyAttachmentIds);
  }, [readyAttachmentIds, onReadyChange]);

  React.useImperativeHandle(
    ref,
    () => ({
      getReadyAttachmentIds: () =>
        items
          .filter(
            (item): item is Extract<AttachmentItem, { kind: "ready" }> =>
              item.kind === "ready",
          )
          .map((item) => item.attachment.id),
      hasPendingUploads: () => items.some((item) => item.kind === "pending"),
    }),
    [items],
  );

  // Resolve preview URLs lazily for ready items. Fetched in parallel and
  // committed in a single state update so each batch only re-renders once.
  React.useEffect(() => {
    const missing = items
      .filter(
        (item): item is Extract<AttachmentItem, { kind: "ready" }> =>
          item.kind === "ready" && !previewUrls[item.attachment.id],
      )
      .map((item) => item.attachment.id);
    if (missing.length === 0) return;

    let cancelled = false;
    void Promise.all(
      missing.map((id) =>
        getSignedAttachmentUrl({ attachment_id: id }).then((result) =>
          result.ok ? ([id, result.data.signed_url] as const) : null,
        ),
      ),
    ).then((entries) => {
      if (cancelled) return;
      const resolved = entries.filter(
        (entry): entry is readonly [string, string] => entry !== null,
      );
      if (resolved.length === 0) return;
      setPreviewUrls((prev) => {
        const next = { ...prev };
        for (const [id, url] of resolved) next[id] = url;
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [items, previewUrls]);

  const startUploads = React.useCallback(
    async (files: File[]) => {
      for (const file of files) {
        if (file.size > MAX_UPLOAD_BYTES) {
          setItems((prev) => [
            ...prev,
            {
              kind: "error",
              localId: makeLocalId(),
              file,
              message: strings.upload.fileTooLarge,
              description: "",
            },
          ]);
          continue;
        }

        const detected = detectMimeType(file);
        if (!isAllowedMimeType(detected)) {
          setItems((prev) => [
            ...prev,
            {
              kind: "error",
              localId: makeLocalId(),
              file,
              message: strings.upload.fileTypeUnsupported,
              description: "",
            },
          ]);
          continue;
        }

        const localId = makeLocalId();
        setItems((prev) => [
          ...prev,
          {
            kind: "pending",
            localId,
            file,
            progress: 0,
            description: "",
          },
        ]);

        const uploadInput: CreateUploadUrlInput = {
          file_name: file.name,
          mime_type: detected,
          size_bytes: file.size,
        };

        try {
          const urlResult = await createUploadUrl(uploadInput);
          if (!urlResult.ok) throw new Error(urlResult.error.message);

          await uploadFileToSignedUrl(
            urlResult.data.signed_url,
            file,
            detected,
            (progress) => {
              setItems((prev) =>
                prev.map((item) =>
                  item.kind === "pending" && item.localId === localId
                    ? { ...item, progress }
                    : item,
                ),
              );
            },
          );

          const latestDescription =
            itemsRef.current.find((entry) => entry.localId === localId)
              ?.description ?? "";
          const attachmentResult = await createAttachment({
            ...uploadInput,
            ...(latestDescription.trim()
              ? { description: latestDescription.trim() }
              : {}),
            file_path: urlResult.data.file_path,
            gps_stripped: false,
            metadata: {},
          });
          if (!attachmentResult.ok) {
            throw new Error(attachmentResult.error.message);
          }

          const attachment = attachmentResult.data;

          if (linkedType && linkedId) {
            const linkResult = await linkAttachment({
              attachment_id: attachment.id,
              linked_type: linkedType,
              linked_id: linkedId,
            });
            if (!linkResult.ok) {
              throw new Error(linkResult.error.message);
            }
          }

          setItems((prev) =>
            prev.map((item) =>
              item.kind === "pending" && item.localId === localId
                ? {
                    kind: "ready",
                    localId,
                    attachment,
                    description: item.description,
                  }
                : item,
            ),
          );
        } catch (error) {
          setItems((prev) =>
            prev.map((item) =>
              item.kind === "pending" && item.localId === localId
                ? {
                    kind: "error",
                    localId,
                    file,
                    message:
                      error instanceof Error
                        ? error.message
                        : strings.upload.uploadFailed,
                    description: item.description,
                  }
                : item,
            ),
          );
        }
      }
    },
    [linkedId, linkedType],
  );

  const handleFiles = (fileList: FileList | null) => {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (files.length > 0) {
      void startUploads(files);
    }
  };

  const removeItem = async (item: AttachmentItem) => {
    if (item.kind === "ready") {
      await softDeleteAttachment(
        item.attachment.id,
        "Removed from attachment uploader",
      );
    }
    setItems((prev) => prev.filter((it) => it.localId !== item.localId));
  };

  const updateDescription = (localId: string, description: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.localId === localId ? { ...item, description } : item,
      ),
    );
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setDragActive(false);
    if (!disabled) handleFiles(event.dataTransfer.files);
  };

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setDragActive(true);
        }}
        onDragLeave={() => setDragActive(false)}
        onDrop={onDrop}
        className={cn(
          "flex flex-col items-center justify-center gap-2 rounded-md border border-dashed border-border bg-card/40 px-4 py-6 text-center transition-colors",
          dragActive && "border-primary bg-primary/5",
          disabled && "opacity-60",
        )}
      >
        <CloudUpload
          aria-hidden="true"
          className="h-5 w-5 text-muted-foreground"
        />
        <p className="hidden text-sm leading-6 text-muted-foreground sm:block">
          {strings.upload.dropHint}{" "}
          <button
            type="button"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="font-medium text-primary hover:underline disabled:no-underline"
          >
            {strings.upload.browse}
          </button>
        </p>
        <p className="block text-sm leading-6 text-muted-foreground sm:hidden">
          {strings.upload.orMobile}
        </p>
        <p className="text-xs text-muted-foreground">
          {strings.upload.fileTypes}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => fileInputRef.current?.click()}
            className="gap-1.5"
          >
            <CloudUpload aria-hidden="true" className="h-3.5 w-3.5" />
            {strings.actions.upload}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={disabled}
            onClick={() => cameraInputRef.current?.click()}
            className="gap-1.5 sm:hidden"
          >
            <Camera aria-hidden="true" className="h-3.5 w-3.5" />
            Camera
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/*,video/*,application/pdf,text/plain,.md"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
        <input
          ref={cameraInputRef}
          type="file"
          accept="image/*,video/*"
          capture="environment"
          className="hidden"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>

      {items.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li
              key={item.localId}
              className="flex flex-col gap-2 rounded-md border border-border bg-card px-3 py-3"
            >
              <div className="flex items-center gap-3">
                {item.kind === "ready" ? (
                  <ItemPreview
                    attachment={item.attachment}
                    previewUrl={previewUrls[item.attachment.id]}
                  />
                ) : (
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-md border border-border bg-muted text-muted-foreground">
                    {item.kind === "error" ? (
                      <AlertTriangle
                        aria-hidden="true"
                        className="h-5 w-5 text-destructive"
                      />
                    ) : (
                      <Loader2
                        aria-hidden="true"
                        className="h-5 w-5 animate-spin"
                      />
                    )}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">
                    {item.kind === "ready"
                      ? item.attachment.file_name
                      : item.file.name}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {item.kind === "ready"
                      ? formatFileSize(item.attachment.size_bytes)
                      : formatFileSize(item.file.size)}
                    {item.kind === "pending"
                      ? ` · ${format(strings.upload.uploading, { name: "" })}${item.progress}%`
                      : ""}
                    {item.kind === "error" ? ` · ${item.message}` : ""}
                  </p>
                  {item.kind === "pending" ? (
                    <Progress value={item.progress} className="mt-1.5" />
                  ) : null}
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={strings.actions.removeAttachment}
                  onClick={() => {
                    void removeItem(item);
                  }}
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </Button>
              </div>
              {item.kind === "pending" ? (
                <div className="flex flex-col gap-1">
                  <Label
                    htmlFor={`desc-${item.localId}`}
                    className="text-xs uppercase tracking-wider text-muted-foreground"
                  >
                    {strings.upload.captureDescriptionLabel}
                  </Label>
                  <Input
                    id={`desc-${item.localId}`}
                    value={item.description}
                    onChange={(event) =>
                      updateDescription(item.localId, event.target.value)
                    }
                    placeholder={strings.upload.captureDescriptionPlaceholder}
                    disabled={disabled}
                  />
                </div>
              ) : null}
              {item.kind === "ready" && item.description ? (
                <p className="text-sm leading-6 text-muted-foreground">
                  {item.description}
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
});
