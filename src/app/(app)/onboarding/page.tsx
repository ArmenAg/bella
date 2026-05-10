import { ShieldCheck } from "lucide-react";
import { OnboardingDisclosure } from "./onboarding-disclosure";
import { strings } from "@/lib/strings";

export const metadata = {
  title: `${strings.onboarding.heading} · ${strings.app.name}`,
};

export default function OnboardingPage() {
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 py-2">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="h-3.5 w-3.5" />
        {strings.app.name}
      </div>
      <OnboardingDisclosure />
    </div>
  );
}
