import Link from "next/link";

import { AuthShell } from "@/components/auth-shell";
import { SignUpForm } from "@/components/sign-up-form";
import { getAuthConfig } from "@/core/auth/auth-actions";

export default async function SignUpPage() {
  const config = await getAuthConfig();

  return (
    <AuthShell
      footer={
        <p className="text-center text-sm text-[var(--muted-foreground)]">
          ¿Ya tenés una cuenta?{" "}
          <Link href="/auth/sign-in" className="text-[var(--foreground)] underline-offset-4 hover:underline">
            Iniciá sesión
          </Link>
        </p>
      }
    >
      <div className="space-y-6">
        <SignUpForm providers={config.oAuthProviders ?? []} />
      </div>
    </AuthShell>
  );
}
