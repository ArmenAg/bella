import { redirect } from "next/navigation";
import { LoginForm } from "./login-form";
import { loadShellProfile } from "@/components/shell/profile-loader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { strings } from "@/lib/strings";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const profile = await loadShellProfile();

  if (profile) {
    redirect("/dashboard");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <p className="text-sm font-medium text-primary">{strings.app.name}</p>
          <CardTitle>Sign in to continue</CardTitle>
        </CardHeader>
        <CardContent>
          <LoginForm
            showDemoCredentials={process.env.NODE_ENV !== "production"}
          />
        </CardContent>
      </Card>
    </main>
  );
}
