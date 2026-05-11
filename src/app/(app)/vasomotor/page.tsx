import Link from "next/link";
import { canWrite } from "@/lib/auth";
import { Camera, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/feedback/empty-state";
import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { loadShellProfile } from "@/components/shell/profile-loader";

import { VasomotorListRow } from "@/components/vasomotor/vasomotor-list-row";

import { getSignedAttachmentUrl } from "@/server/actions/attachments";
import { listVasomotorMeasurements } from "@/server/actions/vasomotor";

import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

async function resolveSignedUrlMap(
  ids: string[],
): Promise<Record<string, string>> {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (unique.length === 0) return {};
  const results = await Promise.all(
    unique.map((id) =>
      getSignedAttachmentUrl({ attachment_id: id }).then((r) =>
        r.ok ? ([id, r.data.signed_url] as const) : null,
      ),
    ),
  );
  const map: Record<string, string> = {};
  for (const entry of results) {
    if (entry) map[entry[0]] = entry[1];
  }
  return map;
}

export default async function VasomotorPage() {
  const profile = await loadShellProfile();
  const showNew = canWrite(profile?.role);

  const result = await listVasomotorMeasurements({ page_size: 50 });
  const attachmentIds = result.ok
    ? result.data.items.flatMap((m) =>
        [m.left_attachment_id, m.right_attachment_id].filter(
          (id): id is string => Boolean(id),
        ),
      )
    : [];
  const signedUrls = await resolveSignedUrlMap(attachmentIds);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={strings.vasomotor.title}
        title={strings.vasomotor.title}
        description={strings.vasomotor.subtitle}
        actions={
          showNew ? (
            <Button asChild size="sm">
              <Link href="/vasomotor/new">
                <Plus aria-hidden="true" className="h-4 w-4" />
                {strings.vasomotor.newCta}
              </Link>
            </Button>
          ) : null
        }
      />

      {!result.ok ? (
        <ErrorState message={result.error.message} />
      ) : result.data.items.length === 0 ? (
        <EmptyState
          icon={Camera}
          title={strings.vasomotor.list.empty.title}
          description={strings.vasomotor.list.empty.body}
          action={
            showNew ? (
              <Button asChild size="sm">
                <Link href="/vasomotor/new">
                  <Plus aria-hidden="true" className="h-4 w-4" />
                  {strings.vasomotor.newCta}
                </Link>
              </Button>
            ) : null
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {result.data.items.map((measurement) => (
            <li key={measurement.id}>
              <VasomotorListRow
                measurement={measurement}
                href={`/vasomotor/${measurement.id}/edit`}
                leftThumbUrl={
                  measurement.left_attachment_id
                    ? (signedUrls[measurement.left_attachment_id] ?? null)
                    : null
                }
                rightThumbUrl={
                  measurement.right_attachment_id
                    ? (signedUrls[measurement.right_attachment_id] ?? null)
                    : null
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
