import { afterEach, describe, expect, it, vi } from "vitest";
import { isProbablyIos, isProbablyMobileSafari } from "./platform";
import { isStandaloneDisplay } from "./standalone";

function setNavigatorValue<T extends keyof Navigator>(
  key: T,
  value: Navigator[T],
) {
  Object.defineProperty(window.navigator, key, {
    configurable: true,
    value,
  });
}

const originalPlatform = window.navigator.platform;
const originalUserAgent = window.navigator.userAgent;

afterEach(() => {
  setNavigatorValue("platform", originalPlatform);
  setNavigatorValue("userAgent", originalUserAgent);
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("mobile platform detection", () => {
  it("detects iPhone Safari", () => {
    setNavigatorValue("platform", "iPhone");
    setNavigatorValue(
      "userAgent",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
    );

    expect(isProbablyIos()).toBe(true);
    expect(isProbablyMobileSafari()).toBe(true);
  });

  it("does not treat iOS Chrome as Safari", () => {
    setNavigatorValue("platform", "iPhone");
    setNavigatorValue(
      "userAgent",
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/123.0.0.0 Mobile/15E148 Safari/604.1",
    );

    expect(isProbablyMobileSafari()).toBe(false);
  });

  it("detects standalone display mode", () => {
    vi.stubGlobal("matchMedia", vi.fn().mockReturnValue({ matches: true }));

    expect(isStandaloneDisplay()).toBe(true);
  });
});
