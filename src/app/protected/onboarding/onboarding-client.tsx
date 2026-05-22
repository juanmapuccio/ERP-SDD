"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { 
  Building2, 
  Landmark, 
  MapPin, 
  BadgePercent, 
  ArrowRight, 
  Plus, 
  X, 
  Save, 
  FileText, 
  Calendar, 
  Activity, 
  Hash,
  Phone,
  Mail,
  Check,
  Sparkles,
  ChevronRight,
  ChevronLeft
} from "lucide-react";
import type { CompanyProfile } from "@/core/company/company-store";
import { selectCompanyAction, createCompanyAction } from "@/core/company/company-actions";
import { useCompanyStore } from "@/core/company/company-store";

interface OnboardingClientProps {
  companies: CompanyProfile[];
  userEmail: string | null;
  forceWizard?: boolean;
}

interface WizardCompany {
  cuit: string;
  razon_social: string;
  nombre_fantasia: string;
  condicion_iva: string;
  ingresos_brutos: string;
  inicio_actividades: string;
  direccion: string;
  punto_venta: number;
  afip_mode: string;
  celular: string;
  email: string;
}

const DEFAULT_COMPANY_TEMPLATE = (index: number): WizardCompany => ({
  cuit: "",
  razon_social: "",
  nombre_fantasia: "",
  condicion_iva: "Responsable Inscripto",
  ingresos_brutos: "",
  inicio_actividades: "",
  direccion: "",
  punto_venta: 1,
  afip_mode: "edge_simulation",
  celular: "",
  email: "",
});

export function OnboardingClient({ companies, userEmail, forceWizard }: OnboardingClientProps) {
  const router = useRouter();
  const setCompanyStore = useCompanyStore((state) => state.setCompany);
  
  // Decide flow based on DB state: if no companies exist, force wizard. Otherwise, standard selection.
  const [isOnboardingFlow, setIsOnboardingFlow] = useState(!!forceWizard || companies.length === 0);
  const [localCompanies, setLocalCompanies] = useState<CompanyProfile[]>(companies);
  const [selectedCuit, setSelectedCuit] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showStandardAddForm, setShowStandardAddForm] = useState(false);

  // Wizard States
  const [wizardStep, setWizardStep] = useState(1); // 1: CUIT Qty, 2: Forms, 3: Saving/Finished
  const [companyCount, setCompanyCount] = useState<1 | 2 | 3>(1);
  const [activeFormTab, setActiveFormTab] = useState(0);
  const [wizardCompanies, setWizardCompanies] = useState<WizardCompany[]>([
    DEFAULT_COMPANY_TEMPLATE(0),
    DEFAULT_COMPANY_TEMPLATE(1),
    DEFAULT_COMPANY_TEMPLATE(2),
  ]);

  // Standard Form State (for adding a company when some already exist)
  const [standardForm, setStandardForm] = useState({
    cuit: "",
    razon_social: "",
    nombre_fantasia: "",
    condicion_iva: "Responsable Inscripto",
    ingresos_brutos: "",
    inicio_actividades: "",
    direccion: "",
    punto_venta: 1,
    afip_mode: "edge_simulation",
    celular: "",
    email: "",
  });

  // --- Handlers for Wizard ---
  const handleWizardCuitChange = (index: number, val: string) => {
    const numericVal = val.replace(/\D/g, "").slice(0, 11);
    setWizardCompanies((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], cuit: numericVal };
      return updated;
    });
  };

  const handleWizardInputChange = (index: number, field: keyof WizardCompany, val: any) => {
    setWizardCompanies((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: val };
      return updated;
    });
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const isFormTabValid = (index: number) => {
    const comp = wizardCompanies[index];
    return (
      comp.cuit.length === 11 &&
      comp.razon_social.trim().length > 0 &&
      comp.direccion.trim().length > 0 &&
      comp.celular.trim().length > 0 &&
      validateEmail(comp.email.trim())
    );
  };

  const isAllWizardFormsValid = () => {
    for (let i = 0; i < companyCount; i++) {
      if (!isFormTabValid(i)) return false;
    }
    return true;
  };

  const handleWizardSubmit = async () => {
    if (!isAllWizardFormsValid()) {
      toast.error("Por favor, completá correctamente todos los campos obligatorios de cada CUIT.");
      return;
    }

    setLoading(true);
    setWizardStep(3); // Go to loader page
    toast.info("Registrando tus empresas y configurando el entorno...");

    try {
      const createdProfiles: CompanyProfile[] = [];

      for (let i = 0; i < companyCount; i++) {
        const comp = wizardCompanies[i];
        const profile: CompanyProfile = {
          cuit: comp.cuit,
          razon_social: comp.razon_social.trim(),
          nombre_fantasia: comp.nombre_fantasia.trim() || null,
          condicion_iva: comp.condicion_iva,
          ingresos_brutos: comp.ingresos_brutos.trim() || null,
          inicio_actividades: comp.inicio_actividades.trim() || null,
          direccion: comp.direccion.trim(),
          punto_venta: Number(comp.punto_venta) || 1,
          afip_mode: comp.afip_mode || "edge_simulation",
          celular: comp.celular.trim(),
          email: comp.email.trim(),
        };

        const result = await createCompanyAction(profile);

        if (!result.success) {
          throw new Error(`Error al registrar CUIT ${comp.cuit}: ${result.error}`);
        }
        createdProfiles.push(result.data);
      }

      toast.success("¡Todas las empresas se configuraron correctamente!");
      
      // Select the first company to login
      const firstCompany = createdProfiles[0];
      const selectRes = await selectCompanyAction(firstCompany);

      if (selectRes.success) {
        setCompanyStore(firstCompany);
        toast.success(`Entorno inicializado: ${firstCompany.nombre_fantasia || firstCompany.razon_social}`);
        setTimeout(() => {
          window.location.href = "/protected";
        }, 1000);
      } else {
        toast.error("Error al seleccionar la empresa principal.");
        setLoading(false);
        setWizardStep(2);
      }
    } catch (err: any) {
      toast.error(err.message || "Ocurrió un error en la configuración.");
      setLoading(false);
      setWizardStep(2);
    }
  };

  // --- Handlers for Standard Flow ---
  const handleSelectCompany = async (company: CompanyProfile) => {
    setSelectedCuit(company.cuit);
    setLoading(true);
    toast.info(`Configurando entorno para ${company.razon_social}...`);

    const result = await selectCompanyAction(company);

    if (result.success) {
      setCompanyStore(company);
      toast.success(`Entorno inicializado: ${company.nombre_fantasia || company.razon_social}`);
      setTimeout(() => {
        window.location.href = "/protected";
      }, 800);
    } else {
      toast.error(result.error || "Fallo al seleccionar la empresa.");
      setLoading(false);
    }
  };

  const handleStandardCuitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/\D/g, "").slice(0, 11);
    setStandardForm((prev) => ({ ...prev, cuit: val }));
  };

  const handleStandardInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setStandardForm((prev) => ({
      ...prev,
      [name]: name === "punto_venta" ? Number(value) || 1 : value,
    }));
  };

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (standardForm.cuit.length !== 11) {
      toast.error("El CUIT debe tener exactamente 11 dígitos numéricos.");
      return;
    }
    if (!standardForm.razon_social.trim()) {
      toast.error("La Razón Social es requerida.");
      return;
    }
    if (!standardForm.direccion.trim()) {
      toast.error("El Domicilio Fiscal es requerido.");
      return;
    }
    if (!standardForm.celular.trim()) {
      toast.error("El celular es requerido.");
      return;
    }
    if (!validateEmail(standardForm.email.trim())) {
      toast.error("Por favor, ingresá un mail válido.");
      return;
    }

    setLoading(true);
    toast.info("Registrando perfil de empresa en InsForge...");

    const companyToSave: CompanyProfile = {
      cuit: standardForm.cuit,
      razon_social: standardForm.razon_social.trim(),
      nombre_fantasia: standardForm.nombre_fantasia.trim() || null,
      condicion_iva: standardForm.condicion_iva,
      ingresos_brutos: standardForm.ingresos_brutos.trim() || null,
      inicio_actividades: standardForm.inicio_actividades.trim() || null,
      direccion: standardForm.direccion.trim(),
      punto_venta: Number(standardForm.punto_venta) || 1,
      afip_mode: standardForm.afip_mode || "edge_simulation",
      celular: standardForm.celular.trim(),
      email: standardForm.email.trim(),
    };

    const result = await createCompanyAction(companyToSave);

    if (result.success) {
      toast.success("¡Empresa registrada con éxito!");
      const savedCompany = result.data;
      setLocalCompanies((prev) => [...prev, savedCompany]);
      
      setStandardForm({
        cuit: "",
        razon_social: "",
        nombre_fantasia: "",
        condicion_iva: "Responsable Inscripto",
        ingresos_brutos: "",
        inicio_actividades: "",
        direccion: "",
        punto_venta: 1,
        afip_mode: "edge_simulation",
        celular: "",
        email: "",
      });

      setShowStandardAddForm(false);
      await handleSelectCompany(savedCompany);
    } else {
      toast.error(result.error || "Error al registrar la empresa.");
      setLoading(false);
    }
  };

  // --- RENDER WIZARD FLOW (FRESH DB) ---
  if (isOnboardingFlow) {
    return (
      <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
        {/* Header con Aura Dorada */}
        <div className="relative text-center py-4 space-y-2">
          <div className="absolute inset-0 flex items-center justify-center -z-10">
            <div className="w-56 h-56 bg-amber-500/10 blur-[120px] rounded-full animate-pulse" />
          </div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full border border-amber-500/20 bg-amber-500/5 text-amber-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" /> Proceso de Configuración Inicial obligatorio
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
            ERP <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">Nodo Sur</span>
          </h1>
          <p className="text-zinc-400 max-w-lg mx-auto text-sm">
            ¡Hola! Para acceder a tu panel, tenés que registrar las primeras empresas con las que vas a operar.
          </p>
        </div>

        {/* Wizard Progress Steps Indicator */}
        <div className="flex justify-between items-center bg-zinc-900/40 border border-zinc-800 p-4 rounded-2xl max-w-xl mx-auto">
          {[1, 2, 3].map((step) => (
            <div key={step} className="flex items-center flex-1 last:flex-initial">
              <div className={`flex items-center justify-center w-8 h-8 rounded-full border font-bold text-xs transition-all duration-300 ${
                wizardStep === step 
                  ? "bg-amber-500 border-amber-500 text-black shadow-lg shadow-amber-500/25 scale-110" 
                  : wizardStep > step
                  ? "bg-emerald-500 border-emerald-500 text-black"
                  : "bg-zinc-950 border-zinc-850 text-zinc-500"
              }`}>
                {wizardStep > step ? <Check className="w-4 h-4" /> : step}
              </div>
              <span className={`ml-2 text-xs font-bold ${wizardStep === step ? "text-amber-400" : "text-zinc-500"}`}>
                {step === 1 ? "CUITs" : step === 2 ? "Formulario" : "Ingresar"}
              </span>
              {step < 3 && (
                <div className={`h-0.5 flex-1 mx-4 transition-all duration-500 ${
                  wizardStep > step ? "bg-emerald-500/50" : "bg-zinc-850"
                }`} />
              )}
            </div>
          ))}
        </div>

        {/* STEP 1: QUANTITY SELECTION */}
        {wizardStep === 1 && (
          <div className="space-y-6 max-w-2xl mx-auto">
            <div className="text-center space-y-1">
              <h2 className="text-xl font-bold text-zinc-100">¿Con cuántos CUITs vas a comenzar?</h2>
              <p className="text-xs text-zinc-400">Podés registrar 1, 2 o hasta 3 empresas en este asistente. Luego podrás añadir más.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {([1, 2, 3] as const).map((num) => (
                <button
                  key={num}
                  onClick={() => setCompanyCount(num)}
                  className={`group relative overflow-hidden text-left p-6 rounded-2xl border transition-all duration-300 ${
                    companyCount === num
                      ? "border-amber-500 ring-2 ring-amber-500/20 bg-zinc-900/40"
                      : "border-zinc-850 bg-zinc-900/10 hover:border-amber-500/50 hover:bg-zinc-900/20"
                  }`}
                >
                  <div className="absolute -inset-px bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  <div className="space-y-4 relative z-10">
                    <div className="flex justify-between items-start">
                      <div className={`p-2.5 rounded-xl border transition-colors ${
                        companyCount === num
                          ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                          : "bg-zinc-850 border-zinc-800 text-zinc-400 group-hover:text-amber-400"
                      }`}>
                        <Building2 className="w-5 h-5" />
                      </div>
                      {companyCount === num && (
                        <span className="bg-amber-500 text-black p-0.5 rounded-full">
                          <Check className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        {num === 1 ? "1 CUIT" : `${num} CUITs`}
                      </h3>
                      <p className="text-[11px] text-zinc-400 leading-normal mt-1">
                        {num === 1 
                          ? "Ideal si operás bajo una sola firma fiscal." 
                          : `Configurá ${num} razones sociales distintas.`}
                      </p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            <div className="flex justify-center pt-4">
              <button
                onClick={() => setWizardStep(2)}
                className="flex items-center gap-2 px-8 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:brightness-110 shadow-lg shadow-amber-500/10 transition-all active:scale-98"
              >
                Configurar Datos <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: COMPANY DATA INPUTS */}
        {wizardStep === 2 && (
          <div className="relative rounded-2xl border border-zinc-800 bg-zinc-900/10 p-6 sm:p-8 backdrop-blur-xl space-y-6">
            <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none">
              <div className="w-72 h-72 bg-amber-500/5 blur-[120px] rounded-full" />
            </div>

            {/* TAB SELECTION IF > 1 CUIT */}
            {companyCount > 1 && (
              <div className="flex gap-2 border-b border-zinc-800 pb-3">
                {Array.from({ length: companyCount }).map((_, idx) => {
                  const isValid = isFormTabValid(idx);
                  return (
                    <button
                      key={idx}
                      onClick={() => setActiveFormTab(idx)}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold border transition-all ${
                        activeFormTab === idx
                          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
                          : "border-zinc-850 bg-zinc-950/20 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      <Landmark className="w-3.5 h-3.5" />
                      Empresa {idx + 1}
                      {isValid ? (
                        <span className="w-4 h-4 rounded-full bg-emerald-500 text-black flex items-center justify-center text-[9px] font-extrabold ml-1">
                          ✓
                        </span>
                      ) : (
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500/50 ml-1 animate-ping" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Render selected form fields */}
            <div className="space-y-6">
              <div className="border-b border-zinc-850/50 pb-3">
                <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                  <FileText className="w-4 h-4" /> Datos de Empresa {activeFormTab + 1} de {companyCount}
                </h3>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna Izquierda */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                      CUIT <span className="text-amber-500">*</span>
                    </label>
                    <div className="relative mt-1.5 font-mono">
                      <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={wizardCompanies[activeFormTab].cuit}
                        onChange={(e) => handleWizardCuitChange(activeFormTab, e.target.value)}
                        placeholder="CUIT de 11 dígitos sin guiones"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-850 bg-zinc-950/60 text-white placeholder-zinc-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300"
                      />
                    </div>
                    {wizardCompanies[activeFormTab].cuit.length > 0 && wizardCompanies[activeFormTab].cuit.length !== 11 && (
                      <span className="text-[10px] text-amber-500 mt-1 block">El CUIT debe tener exactamente 11 dígitos.</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Razón Social <span className="text-amber-500">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={wizardCompanies[activeFormTab].razon_social}
                        onChange={(e) => handleWizardInputChange(activeFormTab, "razon_social", e.target.value)}
                        placeholder="Ej. Distribuidora Sur S.R.L."
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-850 bg-zinc-950/60 text-white placeholder-zinc-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Domicilio Fiscal <span className="text-amber-500">*</span>
                    </label>
                    <div className="relative mt-1.5">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={wizardCompanies[activeFormTab].direccion}
                        onChange={(e) => handleWizardInputChange(activeFormTab, "direccion", e.target.value)}
                        placeholder="Dirección fiscal completa"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-850 bg-zinc-950/60 text-white placeholder-zinc-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300"
                      />
                    </div>
                  </div>
                </div>

                {/* Columna Derecha */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Celular <span className="text-amber-500">*</span>
                    </label>
                    <div className="relative mt-1.5 font-mono">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="text"
                        required
                        value={wizardCompanies[activeFormTab].celular}
                        onChange={(e) => handleWizardInputChange(activeFormTab, "celular", e.target.value)}
                        placeholder="Celular de contacto (sin guiones)"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-850 bg-zinc-950/60 text-white placeholder-zinc-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                      Mail <span className="text-amber-500">*</span>
                    </label>
                    <div className="relative mt-1.5 font-mono">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                      <input
                        type="email"
                        required
                        value={wizardCompanies[activeFormTab].email}
                        onChange={(e) => handleWizardInputChange(activeFormTab, "email", e.target.value)}
                        placeholder="correo@empresa.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-850 bg-zinc-950/60 text-white placeholder-zinc-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300"
                      />
                    </div>
                    {wizardCompanies[activeFormTab].email.length > 0 && !validateEmail(wizardCompanies[activeFormTab].email) && (
                      <span className="text-[10px] text-amber-500 mt-1 block">El formato del correo es inválido.</span>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-zinc-550">
                      Nombre Fantasía <span className="text-zinc-600">(Opcional)</span>
                    </label>
                    <input
                      type="text"
                      value={wizardCompanies[activeFormTab].nombre_fantasia}
                      onChange={(e) => handleWizardInputChange(activeFormTab, "nombre_fantasia", e.target.value)}
                      placeholder="Ej. Repuestos Nodo Sur"
                      className="w-full mt-1.5 px-4 py-3 rounded-xl border border-zinc-850 bg-zinc-950/60 text-white placeholder-zinc-700 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Prev/Next form tabs and save trigger buttons */}
            <div className="flex justify-between items-center border-t border-zinc-800/80 pt-6">
              <button
                type="button"
                onClick={() => setWizardStep(1)}
                className="flex items-center gap-1 px-5 py-2.5 rounded-xl font-bold border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 text-zinc-300 transition-all"
              >
                <ChevronLeft className="w-4 h-4" /> Cantidad
              </button>

              <div className="flex gap-3">
                {companyCount > 1 && activeFormTab > 0 && (
                  <button
                    type="button"
                    onClick={() => setActiveFormTab((prev) => prev - 1)}
                    className="px-4 py-2.5 rounded-xl font-semibold border border-zinc-800 text-zinc-400 hover:text-zinc-200 text-xs transition-all"
                  >
                    Anterior Empresa
                  </button>
                )}

                {companyCount > 1 && activeFormTab < companyCount - 1 ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (!isFormTabValid(activeFormTab)) {
                        toast.error("Completá todos los campos obligatorios antes de cambiar.");
                        return;
                      }
                      setActiveFormTab((prev) => prev + 1);
                    }}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold bg-amber-500 text-black hover:brightness-110 transition-all text-xs"
                  >
                    Siguiente Empresa <ChevronRight className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleWizardSubmit}
                    disabled={!isAllWizardFormsValid() || loading}
                    className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:brightness-110 shadow-lg shadow-amber-500/10 transition-all disabled:opacity-40 disabled:cursor-not-allowed text-sm"
                  >
                    <Save className="w-4.5 h-4.5" /> Finalizar e Ingresar
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: CREATING & REDIRECTING */}
        {wizardStep === 3 && (
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/10 p-12 text-center space-y-6 max-w-xl mx-auto backdrop-blur-xl">
            <div className="relative w-16 h-16 mx-auto">
              <div className="absolute inset-0 rounded-full border-4 border-amber-500/10" />
              <div className="absolute inset-0 rounded-full border-4 border-amber-500 border-t-transparent animate-spin" />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-bold text-white">Configurando entorno operativo...</h2>
              <p className="text-xs text-zinc-400">
                Insertando credenciales iniciales, preparando punto de venta AFIP y sincronizando tablas operativas. Esto tomará sólo unos segundos.
              </p>
            </div>
          </div>
        )}

        <div className="text-center text-xs text-zinc-650">
          Módulo de Facturación AFIP Edge • ZenERP v1.0 • Nodo Sur Distribuciones
        </div>
      </div>
    );
  }

  // --- RENDER STANDARD SELECTOR/ADD FLOW (FALLBACK IF COMPANIES EXIST) ---
  return (
    <div className="space-y-8 animate-fade-in max-w-4xl mx-auto">
      {/* Header section with radial gold aura */}
      <div className="relative text-center py-6 space-y-3">
        <div className="absolute inset-0 flex items-center justify-center -z-10">
          <div className="w-48 h-48 bg-amber-500/10 blur-[100px] rounded-full" />
        </div>
        <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl">
          ERP <span className="bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 bg-clip-text text-transparent">Nodo Sur</span>
        </h1>
        <p className="text-zinc-400 max-w-lg mx-auto text-sm sm:text-base">
          Hola <span className="text-amber-300 font-semibold">{userEmail}</span>, para comenzar a facturar y gestionar el stock, por favor seleccioná la empresa/CUIT con el que vas a operar hoy.
        </p>
      </div>

      {/* Selector/Header for section */}
      <div className="flex justify-between items-center border-b border-zinc-800/80 pb-4">
        <h2 className="text-xl font-bold text-zinc-100">
          {showStandardAddForm ? "Registrar Nueva Empresa" : "Empresas Disponibles"}
        </h2>
        <button
          onClick={() => setShowStandardAddForm(!showStandardAddForm)}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 hover:border-amber-500/50 transition-all duration-300 disabled:opacity-50"
        >
          {showStandardAddForm ? (
            <>
              <X className="w-4 h-4" /> Cancelar
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" /> Agregar Empresa
            </>
          )}
        </button>
      </div>

      {/* Body content (Form or Grid) */}
      {showStandardAddForm ? (
        <form onSubmit={handleStandardSubmit} className="relative rounded-2xl border border-zinc-800 bg-zinc-900/20 p-8 backdrop-blur-xl space-y-6">
          <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none">
            <div className="w-72 h-72 bg-amber-500/5 blur-[120px] rounded-full" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Columna Izquierda: Datos Básicos */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <Landmark className="w-4 h-4" /> Datos de Identificación
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  CUIT <span className="text-amber-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={standardForm.cuit}
                    onChange={handleStandardCuitChange}
                    placeholder="Solo números (11 dígitos)"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-650 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Razón Social <span className="text-amber-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={standardForm.razon_social}
                    onChange={handleStandardInputChange}
                    name="razon_social"
                    placeholder="Ej. Distribuidora Sur S.R.L."
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-650 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Domicilio Fiscal <span className="text-amber-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={standardForm.direccion}
                    onChange={handleStandardInputChange}
                    name="direccion"
                    placeholder="Ej. Av. Hipólito Yrigoyen 1234"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-650 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Condición IVA <span className="text-amber-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <BadgePercent className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <select
                    name="condicion_iva"
                    value={standardForm.condicion_iva}
                    onChange={handleStandardInputChange}
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-805 bg-zinc-950 text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300 appearance-none"
                  >
                    <option value="Responsable Inscripto">Responsable Inscripto</option>
                    <option value="Monotributista">Monotributista</option>
                    <option value="Exento">Exento</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Columna Derecha: Datos de contacto y fiscales */}
            <div className="space-y-4">
              <h3 className="text-sm font-bold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <FileText className="w-4 h-4" /> Contacto y Configuración
              </h3>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Celular <span className="text-amber-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="text"
                    required
                    value={standardForm.celular}
                    onChange={handleStandardInputChange}
                    name="celular"
                    placeholder="Celular de contacto"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-850 bg-zinc-950/60 text-white placeholder-zinc-650 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                  Mail <span className="text-amber-500">*</span>
                </label>
                <div className="relative mt-1.5">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <input
                    type="email"
                    required
                    value={standardForm.email}
                    onChange={handleStandardInputChange}
                    name="email"
                    placeholder="correo@empresa.com"
                    className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-850 bg-zinc-950/60 text-white placeholder-zinc-650 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Punto de Venta
                  </label>
                  <input
                    type="number"
                    name="punto_venta"
                    min="1"
                    value={standardForm.punto_venta}
                    onChange={handleStandardInputChange}
                    className="w-full mt-1.5 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-650 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Entorno AFIP
                  </label>
                  <div className="relative mt-1.5">
                    <Activity className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
                    <select
                      name="afip_mode"
                      value={standardForm.afip_mode}
                      onChange={handleStandardInputChange}
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950 text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300 appearance-none"
                    >
                      <option value="edge_simulation">Simulador AFIP</option>
                      <option value="production">Homologación (Real)</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Nombre Fantasía
                </label>
                <input
                  type="text"
                  name="nombre_fantasia"
                  value={standardForm.nombre_fantasia}
                  onChange={handleStandardInputChange}
                  placeholder="Ej. Distribuidora Repuestos Sur (Opcional)"
                  className="w-full mt-1.5 px-4 py-3 rounded-xl border border-zinc-800 bg-zinc-950/60 text-white placeholder-zinc-650 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/10 focus:outline-none transition-all duration-300"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 border-t border-zinc-800/60 pt-6">
            <button
              type="button"
              onClick={() => setShowStandardAddForm(false)}
              disabled={loading}
              className="px-6 py-3 rounded-xl font-bold border border-zinc-800 hover:border-zinc-700 bg-zinc-900/40 text-zinc-300 transition-all duration-300 disabled:opacity-50"
            >
              Volver
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold bg-gradient-to-r from-amber-500 to-yellow-500 text-black hover:brightness-110 shadow-lg shadow-amber-500/10 transition-all duration-300 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? "Procesando..." : "Guardar e Ingresar"}
            </button>
          </div>
        </form>
      ) : (
        <div className="grid gap-6 md:grid-cols-2">
          {localCompanies.map((company) => {
            const isPending = loading && selectedCuit === company.cuit;
            return (
              <button
                key={company.cuit}
                onClick={() => !loading && handleSelectCompany(company)}
                disabled={loading}
                className={`group text-left relative overflow-hidden rounded-2xl border bg-zinc-900/30 p-6 backdrop-blur-xl transition-all duration-300 ${
                  selectedCuit === company.cuit
                    ? "border-amber-500 ring-2 ring-amber-500/20 bg-zinc-900/60"
                    : "border-zinc-800 hover:border-amber-500/50 hover:bg-zinc-900/50"
                } ${loading && selectedCuit !== company.cuit ? "opacity-50 pointer-events-none" : ""}`}
              >
                {/* Background glow */}
                <div className="absolute -inset-px bg-gradient-to-br from-amber-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                
                <div className="space-y-4 relative z-10">
                  <div className="flex justify-between items-start">
                    <div className="p-3 rounded-xl bg-zinc-800/80 border border-zinc-700 text-amber-400 group-hover:text-amber-300 transition-colors">
                      <Landmark className="w-6 h-6" />
                    </div>
                    <span className="inline-flex items-center rounded-full bg-zinc-800/80 border border-zinc-700 px-3 py-1 text-xs font-semibold text-zinc-300">
                      CUIT: {company.cuit}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <h3 className="text-xl font-bold text-white group-hover:text-amber-300 transition-colors">
                      {company.nombre_fantasia || company.razon_social}
                    </h3>
                    <p className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">
                      {company.razon_social}
                    </p>
                  </div>

                  <div className="border-t border-zinc-800/60 pt-4 space-y-2 text-sm text-zinc-400">
                    <div className="flex items-center gap-2">
                      <BadgePercent className="w-4 h-4 text-zinc-500 shrink-0" />
                      <span>{company.condicion_iva}</span>
                    </div>
                    {company.direccion && (
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="truncate">{company.direccion}</span>
                      </div>
                    )}
                    {company.celular && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span>{company.celular}</span>
                      </div>
                    )}
                    {company.email && (
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-zinc-500 shrink-0" />
                        <span className="truncate">{company.email}</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-amber-400 group-hover:text-amber-300 group-hover:translate-x-1 transition-all duration-300">
                    <span>{isPending ? "Inicializando..." : "Ingresar con este CUIT"}</span>
                    <ArrowRight className={`w-4 h-4 transition-transform duration-300 ${isPending ? "animate-pulse" : "group-hover:translate-x-1"}`} />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Footer support */}
      <div className="text-center text-xs text-zinc-600">
        Comercio Autopartista • Sistema Multi-Empresa AFIP • Nodo Sur ERP v1.0
      </div>
    </div>
  );
}
