export function isStandaloneDisplay(): boolean {
  if (typeof window === "undefined") return false;

  const iosNavigator = window.navigator as Navigator & {
    standalone?: boolean;
  };

  return (
    window.matchMedia?.("(display-mode: standalone)").matches === true ||
    iosNavigator.standalone === true
  );
}
