import { redirect } from "next/navigation";
import { getCurrentUserDetails, getCurrentViewer } from "@/core/auth/auth-state";
import { getActiveCuitCookie } from "@/core/company/company-cookies";
import { fetchCompaniesAction } from "@/core/company/company-actions";
import { DashboardShellClient } from "./dashboard-shell-client";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  const viewer = await getCurrentViewer();

  if (!viewer.isAuthenticated) {
    redirect("/auth/sign-in");
  }

  // Securely enforce that the CUIT is selected
  const activeCuit = await getActiveCuitCookie();
  if (!activeCuit) {
    redirect("/protected/onboarding");
  }

  const user = await getCurrentUserDetails();
  const companiesRes = await fetchCompaniesAction();
  const companies = companiesRes.success ? companiesRes.data : [];
  const activeCompany = companies.find((c) => c.cuit === activeCuit);

  // If the selected CUIT cookie is invalid or doesn't match any company, redirect to onboarding
  if (!activeCompany) {
    redirect("/protected/onboarding");
  }

  return (
    <DashboardShellClient
      activeCompany={activeCompany}
      companies={companies}
      userData={user ?? viewer}
    >
      {children}
    </DashboardShellClient>
  );
}
