import { PageHeader } from "@/components/shell/page-header";
import { loadActiveFlare } from "@/components/shell/active-flare-loader";

import { VasomotorForm } from "@/components/vasomotor/vasomotor-form";

import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

interface NewVasomotorPageProps {
  searchParams: Promise<{ quick?: string }>;
}

export default async function NewVasomotorPage({
  searchParams,
}: NewVasomotorPageProps) {
  const params = await searchParams;
  const activeFlare = await loadActiveFlare();

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        eyebrow={strings.vasomotor.title}
        title={strings.vasomotor.form.newTitle}
      />
      <VasomotorForm
        mode="create"
        activeFlareEntryId={activeFlare?.entry.id ?? null}
        defaultContext={activeFlare ? "active_flare" : "baseline"}
        defaultLinkToFlare={Boolean(activeFlare)}
        quick={params.quick === "1"}
        redirectOnSuccess="/vasomotor"
      />
    </div>
  );
}
