export interface MobileFeatureFlags {
  mobileInstallPromptEnabled: boolean;
  offlineCaptureEnabled: boolean;
  webPushEnabled: boolean;
}

function parsePublicBoolean(
  value: string | undefined,
  defaultValue: boolean,
): boolean {
  if (value === undefined || value.trim() === "") return defaultValue;

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) return true;
  if (["0", "false", "no", "off"].includes(normalized)) return false;

  return defaultValue;
}

// Public flags can hide unfinished UI, but they are not security boundaries.
// Server contracts and actions must continue to validate every write.
export const mobileFeatureFlags: MobileFeatureFlags = {
  mobileInstallPromptEnabled: parsePublicBoolean(
    process.env.NEXT_PUBLIC_MOBILE_INSTALL_PROMPT_ENABLED,
    true,
  ),
  offlineCaptureEnabled: parsePublicBoolean(
    process.env.NEXT_PUBLIC_OFFLINE_CAPTURE_ENABLED,
    false,
  ),
  webPushEnabled: parsePublicBoolean(
    process.env.NEXT_PUBLIC_WEB_PUSH_ENABLED,
    false,
  ),
};

export { parsePublicBoolean };
