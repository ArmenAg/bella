"use client";

import * as React from "react";
import Link from "next/link";
import { ImageOff, Link2, Paperclip } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getSignedAttachmentUrl } from "@/server/actions/attachments";
import type { VasomotorMeasurementDTO } from "@/server/contracts";
import { formatDateTime } from "@/lib/format";
import { strings } from "@/lib/strings";
import { cn } from "@/lib/utils";

export interface VasomotorListRowProps {
  measurement: VasomotorMeasurementDTO;
  href: string;
}

function Thumb({
  attachmentId,
  alt,
  fallbackLabel,
}: {
  attachmentId: string | null;
  alt: string;
  fallbackLabel: string;
}) {
  const [url, setUrl] = React.useState<string | null>(null);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    if (!attachmentId) return;
    void getSignedAttachmentUrl({ attachment_id: attachmentId }).then(
      (result) => {
        if (cancelled) return;
        if (!result.ok) {
          setFailed(true);
          return;
        }
        setUrl(result.data.signed_url);
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [attachmentId]);

  if (!attachmentId || failed) {
    return (
      <div
        aria-label={fallbackLabel}
        className="flex h-14 w-14 shrink-0 items-center justify-center rounded-md border border-dashed border-border bg-muted/40 text-muted-foreground"
      >
        <ImageOff aria-hidden="true" className="h-4 w-4" />
      </div>
    );
  }

  if (!url) {
    return (
      <div
        aria-label={fallbackLabel}
        className="h-14 w-14 shrink-0 animate-pulse rounded-md border border-border bg-muted"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="h-14 w-14 shrink-0 rounded-md border border-border object-cover"
    />
  );
}

export function VasomotorListRow({ measurement, href }: VasomotorListRowProps) {
  const listStrings = strings.vasomotor.list;
  const contextLabel =
    strings.vasomotor.contexts[measurement.context] ?? measurement.context;
  const delta = measurement.delta_c;
  const linkedToFlare = Boolean(measurement.entry_id);
  const hasAnyTemp =
    measurement.left_temp_c != null || measurement.right_temp_c != null;

  return (
    <Link
      href={href}
      aria-label={listStrings.openComparison}
      className={cn(
        "flex flex-col gap-3 rounded-md border border-border bg-card px-3 py-3 transition-colors hover:bg-muted/40",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
      )}
    >
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <div className="relative flex flex-col items-center gap-1">
            <Thumb
              attachmentId={measurement.left_attachment_id}
              alt={listStrings.leftAlt}
              fallbackLabel={listStrings.noPhotoLeft}
            />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {listStrings.leftLabel}
            </span>
          </div>
          <div className="relative flex flex-col items-center gap-1">
            <Thumb
              attachmentId={measurement.right_attachment_id}
              alt={listStrings.rightAlt}
              fallbackLabel={listStrings.noPhotoRight}
            />
            <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
              {listStrings.rightLabel}
            </span>
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {formatDateTime(measurement.measured_at)}
          </p>
          <p className="truncate text-sm font-semibold text-foreground">
            {measurement.site}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs">
            <Badge variant="muted">{contextLabel}</Badge>
            {hasAnyTemp ? (
              <span className="font-mono text-muted-foreground">
                {measurement.left_temp_c != null
                  ? `${measurement.left_temp_c.toFixed(1)}°C`
                  : "—"}
                {" / "}
                {measurement.right_temp_c != null
                  ? `${measurement.right_temp_c.toFixed(1)}°C`
                  : "—"}
              </span>
            ) : null}
            {delta != null ? (
              <Badge variant="primary">
                {listStrings.deltaLabel} {delta > 0 ? "+" : ""}
                {delta.toFixed(2)}°C
              </Badge>
            ) : null}
            {linkedToFlare ? (
              <span
                className="inline-flex items-center gap-1 text-muted-foreground"
                aria-label={listStrings.linkedToFlare}
                title={listStrings.linkedToFlare}
              >
                <Link2 aria-hidden="true" className="h-3 w-3" />
              </span>
            ) : null}
            {measurement.lighting_notes ? (
              <span
                className="inline-flex items-center gap-1 text-muted-foreground"
                title={measurement.lighting_notes}
              >
                <Paperclip aria-hidden="true" className="h-3 w-3" />
              </span>
            ) : null}
          </div>
        </div>
      </div>
      {measurement.notes ? (
        <p className="line-clamp-2 text-sm leading-6 text-muted-foreground">
          {measurement.notes}
        </p>
      ) : null}
    </Link>
  );
}
