import { Badge } from "@/components/ui/badge";
import { strings } from "@/lib/strings";
import { mobileFeatureFlags } from "@/lib/mobile/feature-flags";

const FLAGS = [
  {
    id: "install-prompt",
    label: strings.mobile.flags.installPrompt,
    enabled: mobileFeatureFlags.mobileInstallPromptEnabled,
  },
  {
    id: "offline-capture",
    label: strings.mobile.flags.offlineCapture,
    enabled: mobileFeatureFlags.offlineCaptureEnabled,
  },
  {
    id: "web-push",
    label: strings.mobile.flags.webPush,
    enabled: mobileFeatureFlags.webPushEnabled,
  },
];

export function MobileFeatureFlagsStatus() {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {strings.mobile.flags.title}
      </p>
      <ul className="flex flex-col gap-2">
        {FLAGS.map((flag) => (
          <li
            key={flag.id}
            className="flex items-center justify-between gap-3 rounded-md border border-border px-3 py-2"
          >
            <span className="text-sm">{flag.label}</span>
            <Badge variant={flag.enabled ? "primary" : "muted"}>
              {flag.enabled
                ? strings.mobile.flags.enabled
                : strings.mobile.flags.disabled}
            </Badge>
          </li>
        ))}
      </ul>
      <p className="text-xs leading-5 text-muted-foreground">
        {strings.mobile.flags.boundaryNote}
      </p>
    </div>
  );
}
