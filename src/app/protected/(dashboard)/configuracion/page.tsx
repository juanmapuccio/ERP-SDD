import { ShieldAlert } from "lucide-react";
import { getActiveCuitCookie } from "@/core/company/company-cookies";
import { fetchCompaniesAction } from "@/core/company/company-actions";
import { getSupabaseClient } from "@/core/api/supabase";
import { ArcaSettingsManager } from "@/features/arca/components/arca-settings-manager";

export default async function ConfiguracionPage() {
  const activeCuit = await getActiveCuitCookie();
  const companiesRes = await fetchCompaniesAction();
  const companies = companiesRes.success ? companiesRes.data : [];
  const activeCompany = companies.find((c) => c.cuit === activeCuit);

  // Fetch ARCA credentials from database
  const client = getSupabaseClient();
  const { data: arcaCred } = await client.database
    .from("arca_credentials")
    .select("certificate, environment")
    .eq("company_cuit", activeCuit ?? "")
    .maybeSingle();

  if (!activeCompany) {
    return (
      <div className="space-y-8 animate-fade-in-up">
        {/* Header section */}
        <div className="border-b border-zinc-800/60 pb-6">
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Configuración del ERP</h1>
          <p className="text-sm text-zinc-400">Administración de credenciales de AFIP, certificados, punto de venta y parámetros generales</p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-8 text-center space-y-4 max-w-xl mx-auto mt-12">
          <div className="rounded-full bg-amber-500/10 p-4 border border-amber-500/20 text-amber-400 w-14 h-14 mx-auto flex items-center justify-center animate-pulse">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-lg font-bold text-white">No hay empresa activa seleccionada</h2>
            <p className="text-xs text-zinc-400">
              Por favor, seleccione una distribuidora en la barra de navegación o cree una nueva empresa para poder configurar los parámetros de facturación fiscal.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header section */}
      <div className="border-b border-zinc-800/60 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight text-white">Configuración del ERP</h1>
        <p className="text-sm text-zinc-400">Administración de credenciales de AFIP, certificados, punto de venta y parámetros generales</p>
      </div>

      {/* Main Settings Manager */}
      <ArcaSettingsManager 
        activeCompany={activeCompany} 
        arcaCred={arcaCred} 
      />
    </div>
  );
}
