import { ErrorState } from "@/components/feedback/error-state";
import { PageHeader } from "@/components/shell/page-header";
import { loadActiveFlare } from "@/components/shell/active-flare-loader";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { FlarePageClient } from "@/components/flares/flare-page-client";
import { listReferenceData } from "@/server/actions/reference";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

function canWriteRole(role: string | undefined): boolean {
  return role === "primary" || role === "caregiver";
}

export default async function FlareModePage() {
  const [profile, activeFlare, reference] = await Promise.all([
    loadShellProfile(),
    loadActiveFlare(),
    listReferenceData(),
  ]);

  const canWrite = canWriteRole(profile?.role);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.flare.title}
        description={strings.flare.subtitle}
      />

      {!reference.ok ? (
        <ErrorState message={reference.error.message} />
      ) : (
        <FlarePageClient
          initialSession={activeFlare}
          bodyRegions={reference.data.body_regions}
          symptoms={reference.data.symptoms}
          triggers={reference.data.triggers}
          canWrite={canWrite}
        />
      )}
    </div>
  );
}
