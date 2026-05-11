const IOS_DEVICE_PATTERN = /iPad|iPhone|iPod/;
const NON_SAFARI_IOS_PATTERN = /CriOS|FxiOS|EdgiOS|OPiOS|DuckDuckGo/;

export function isProbablyIos(): boolean {
  if (typeof window === "undefined") return false;

  const { platform, userAgent, maxTouchPoints } = window.navigator;
  const isClassicIos = IOS_DEVICE_PATTERN.test(platform);
  const isTouchMac = platform === "MacIntel" && maxTouchPoints > 1;

  return isClassicIos || isTouchMac || IOS_DEVICE_PATTERN.test(userAgent);
}

export function isProbablyMobileSafari(): boolean {
  if (typeof window === "undefined") return false;

  const { userAgent } = window.navigator;
  return (
    isProbablyIos() &&
    /Safari/.test(userAgent) &&
    /Mobile/.test(userAgent) &&
    !NON_SAFARI_IOS_PATTERN.test(userAgent)
  );
}
