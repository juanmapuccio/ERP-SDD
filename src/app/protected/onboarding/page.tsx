import { redirect } from "next/navigation";
import { getCurrentViewer } from "@/core/auth/auth-state";
import { fetchCompaniesAction } from "@/core/company/company-actions";
import { getActiveCuitCookie } from "@/core/company/company-cookies";
import { OnboardingClient } from "./onboarding-client";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ wizard?: string }>;
}) {
  const viewer = await getCurrentViewer();

  if (!viewer.isAuthenticated) {
    redirect("/auth/sign-in");
  }

  const resolvedParams = await searchParams;
  const forceWizard = resolvedParams.wizard === "true";

  const result = await fetchCompaniesAction();
  const companies = result.success ? result.data : [];

  // If CUIT is already selected and exists in the DB, let them go straight to the dashboard
  // Unless we are forcing the wizard for E2E testing
  const activeCuit = await getActiveCuitCookie();
  if (!forceWizard && activeCuit && companies.some((c) => c.cuit === activeCuit)) {
    redirect("/protected");
  }

  return (
    <main className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
      <div className="w-full max-w-3xl">
        <OnboardingClient 
          companies={companies} 
          userEmail={viewer.email} 
          userRole={viewer.role} 
          forceWizard={forceWizard} 
        />
      </div>
    </main>
  );
}
