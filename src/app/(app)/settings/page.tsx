import { loadShellProfile } from "@/components/shell/profile-loader";
import { PageHeader } from "@/components/shell/page-header";
import { strings } from "@/lib/strings";
import { SettingsClient } from "./settings-client";

export const metadata = {
  title: `${strings.settings.title} · ${strings.app.name}`,
};

export default async function SettingsPage() {
  const profile = await loadShellProfile();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title={strings.settings.title}
        description={strings.settings.subtitle}
      />
      <SettingsClient profile={profile} />
    </div>
  );
}
