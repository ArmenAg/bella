import { ActiveFlareBanner } from "@/components/shell/active-flare-banner";
import { ActiveFlareProvider } from "@/components/shell/active-flare-context";
import { loadActiveFlare } from "@/components/shell/active-flare-loader";
import {
  CommandPalette,
  CommandPaletteProvider,
} from "@/components/shell/command-palette";
import { DesktopNav } from "@/components/shell/desktop-nav";
import { MobileNav } from "@/components/shell/mobile-nav";
import { OnboardingGate } from "@/components/shell/onboarding-gate";
import { ShellProfileProvider } from "@/components/shell/shell-context";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { EmptyState } from "@/components/feedback/empty-state";
import { Button } from "@/components/ui/button";
import { strings } from "@/lib/strings";
import Link from "next/link";

export default async function AppShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [profile, activeFlare] = await Promise.all([
    loadShellProfile(),
    loadActiveFlare(),
  ]);

  if (!profile) {
    return (
      <ShellProfileProvider profile={null}>
        <ActiveFlareProvider flare={null}>
          <CommandPaletteProvider>
            <div className="flex min-h-screen lg:flex-row">
              <DesktopNav />
              <div className="flex min-h-screen flex-1 flex-col">
                <MobileNav />
                <main className="flex flex-1 items-center justify-center px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-10 lg:pt-6">
                  <div className="w-full max-w-md">
                    <EmptyState
                      title={strings.auth.signedOutTitle}
                      description={strings.auth.signedOutBody}
                      action={
                        <Button asChild>
                          <Link href="/login">Sign in</Link>
                        </Button>
                      }
                    />
                  </div>
                </main>
              </div>
            </div>
            <CommandPalette />
          </CommandPaletteProvider>
        </ActiveFlareProvider>
      </ShellProfileProvider>
    );
  }

  return (
    <ShellProfileProvider profile={profile}>
      <ActiveFlareProvider flare={activeFlare}>
        <CommandPaletteProvider>
          <div className="flex min-h-screen lg:flex-row">
            <DesktopNav />
            <div className="flex min-h-screen flex-1 flex-col">
              <MobileNav />
              <OnboardingGate>
                <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pt-6 lg:pb-10">
                  <div className="mx-auto flex w-full max-w-5xl flex-col gap-4">
                    <ActiveFlareBanner />
                    {children}
                  </div>
                </main>
              </OnboardingGate>
            </div>
          </div>
          <CommandPalette />
        </CommandPaletteProvider>
      </ActiveFlareProvider>
    </ShellProfileProvider>
  );
}
