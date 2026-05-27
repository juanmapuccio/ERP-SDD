"use client";

import React, { useState } from "react";
import { 
  Building2, 
  ShieldCheck, 
  ShieldAlert, 
  Save, 
  Zap, 
  Key, 
  CheckCircle2, 
  AlertTriangle,
  Loader2
} from "lucide-react";
import type { CompanyProfile } from "@/core/company/company-store";
import { OnboardingWizard } from "./onboarding-wizard";
import { updateCompanyAction, activateArcaBypassAction } from "@/core/company/company-actions";

interface ArcaSettingsManagerProps {
  activeCompany: CompanyProfile;
  arcaCred: {
    certificate?: string;
    environment?: string;
  } | null;
}

export function ArcaSettingsManager({ activeCompany, arcaCred }: ArcaSettingsManagerProps) {
  // Input states
  const [razonSocial, setRazonSocial] = useState(activeCompany.razon_social);
  const [nombreFantasia, setNombreFantasia] = useState(activeCompany.nombre_fantasia || "");
  const [puntoVenta, setPuntoVenta] = useState(activeCompany.punto_venta?.toString() || "1");
  const [ingresosBrutos, setIngresosBrutos] = useState(activeCompany.ingresos_brutos || "");
  const [condicionIva, setCondicionIva] = useState(activeCompany.condicion_iva || "Responsable Inscripto");
  const [monotributoCategoria, setMonotributoCategoria] = useState(activeCompany.monotributo_categoria || "");
  const [tipoJuridico, setTipoJuridico] = useState(activeCompany.tipo_juridico || "Unipersonal");
  
  // UX states
  const [activeTab, setActiveTab] = useState<"bypass" | "official">("bypass");
  const [saving, setSaving] = useState(false);
  const [bypassing, setBypassing] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Helper flags
  const hasAfipCert = !!arcaCred?.certificate;
  // If it has a certificate and it is NOT our mock bypass certificate
  const isRealCert = hasAfipCert && arcaCred?.certificate !== "MOCK_SIMULATED_CERTIFICATE_PEM_BYPASS_MODE";
  const isSimulation = arcaCred?.environment === "simulation";

  // Action: Save company profile details
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage(null);

    const isMonotributista = condicionIva === "Monotributista" || condicionIva === "Monotributo";
    if (isMonotributista && !monotributoCategoria) {
      setMessage({ type: "error", text: "Por favor, selecciona una categoría de Monotributo." });
      setSaving(false);
      return;
    }
    
    try {
      const res = await updateCompanyAction({
        cuit: activeCompany.cuit,
        razon_social: razonSocial,
        nombre_fantasia: nombreFantasia || null,
        punto_venta: Number(puntoVenta) || 1,
        ingresos_brutos: ingresosBrutos || null,
        condicion_iva: condicionIva === "Autonomo" ? "Responsable Inscripto" : (condicionIva === "Monotributo" ? "Monotributista" : condicionIva),
        monotributo_categoria: isMonotributista ? monotributoCategoria : null,
        tipo_juridico: tipoJuridico
      });

      if (!res.success) {
        throw new Error(res.error);
      }
      
      setMessage({ type: "success", text: "Datos fiscales de la empresa guardados de forma exitosa." });
      setTimeout(() => setMessage(null), 4000);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falla al guardar los datos fiscales." });
    } finally {
      setSaving(false);
    }
  };

  // Action: Fast Bypass Simulation Mode (one-click)
  const handleActivateBypass = async () => {
    setBypassing(true);
    setMessage(null);

    try {
      const res = await activateArcaBypassAction(activeCompany.cuit, Number(puntoVenta) || 1);
      
      if (!res.success) {
        throw new Error(res.error);
      }

      setMessage({ 
        type: "success", 
        text: "⚡ ¡Simulación Local Activada! El POS ya está listo para emitir facturas con CAE simulados de forma inmediata." 
      });
      
      // Reload page to refresh Server Component data
      setTimeout(() => {
        window.location.reload();
      }, 1500);
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Falla al activar el simulador." });
      setBypassing(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast message rendering */}
      {message && (
        <div className={`flex gap-3 rounded-xl p-4 text-xs animate-fade-in-up border ${
          message.type === "success" 
            ? "bg-green-500/10 border-green-500/25 text-green-400" 
            : "bg-red-500/10 border-red-500/25 text-red-400"
        }`}>
          {message.type === "success" ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertTriangle className="w-5 h-5 shrink-0" />}
          <div>
            <p className="font-bold">{message.type === "success" ? "Operación Exitosa" : "Falla en Operación"}</p>
            <p className="mt-1 opacity-90 leading-normal">{message.text}</p>
          </div>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left/Middle Pane: Form details and tabs */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section 1: Edit Company Details */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-5">
            <div className="flex items-center gap-2 border-b border-zinc-800/60 pb-3">
              <Building2 className="w-5 h-5 text-amber-500" />
              <h2 className="text-base font-bold text-white">Perfil e Identidad de Facturación</h2>
            </div>

            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">CUIT de la Distribuidora</label>
                  <input
                    type="text"
                    disabled
                    value={activeCompany.cuit}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950/60 border border-zinc-850 text-sm text-zinc-500 font-mono cursor-not-allowed opacity-70"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Razón Social</label>
                  <input
                    type="text"
                    required
                    value={razonSocial}
                    onChange={(e) => setRazonSocial(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Nombre de Fantasía</label>
                  <input
                    type="text"
                    value={nombreFantasia}
                    onChange={(e) => setNombreFantasia(e.target.value)}
                    placeholder="Ej: Repuestos Nodo Sur"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Condición de IVA</label>
                  <select
                    value={condicionIva === "Monotributo" ? "Monotributista" : condicionIva}
                    onChange={(e) => {
                      const val = e.target.value;
                      setCondicionIva(val);
                      if (val !== "Monotributista") {
                        setMonotributoCategoria("");
                      } else if (!monotributoCategoria) {
                        setMonotributoCategoria("A");
                      }
                      if (val === "Monotributista" || val === "Autonomo") {
                        setTipoJuridico("Unipersonal");
                      }
                    }}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none transition-colors"
                  >
                    <option value="Responsable Inscripto">Responsable Inscripto</option>
                    <option value="Monotributista">Monotributista</option>
                    <option value="Autonomo">Autónomo (Régimen General)</option>
                    <option value="Exento">Sujeto Exento</option>
                    <option value="No Alcanzado">IVA No Alcanzado</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Forma Jurídica / Tipo Societario</label>
                  <select
                    value={tipoJuridico || "Unipersonal"}
                    disabled={condicionIva === "Monotributista" || condicionIva === "Monotributo" || condicionIva === "Autonomo"}
                    onChange={(e) => setTipoJuridico(e.target.value)}
                    className={`w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none transition-colors ${
                      (condicionIva === "Monotributista" || condicionIva === "Monotributo" || condicionIva === "Autonomo")
                        ? "opacity-60 cursor-not-allowed bg-zinc-900/40 border-zinc-850"
                        : ""
                    }`}
                  >
                    <option value="Unipersonal">Persona Humana / Unipersonal</option>
                    <option value="S.R.L.">Sociedad de Responsabilidad Limitada (S.R.L.)</option>
                    <option value="S.A.">Sociedad Anónima (S.A.)</option>
                    <option value="S.A.S.">Sociedad por Acciones Simplificada (S.A.S.)</option>
                    <option value="S.H.">Sociedad de Hecho (S.H.)</option>
                  </select>
                  {(condicionIva === "Monotributista" || condicionIva === "Monotributo" || condicionIva === "Autonomo") && (
                    <p className="text-[10px] text-zinc-550 leading-tight select-none">
                      {condicionIva === "Autonomo" 
                        ? "Autónomos ejercen a título personal (Persona Humana / Unipersonal)."
                        : "Régimen Simplificado (Monotributo) requiere obligatoriamente tipo societario Unipersonal."}
                    </p>
                  )}
                </div>

                {/* Monotributo Categoria Desplegable Dinámico */}
                {(condicionIva === "Monotributista" || condicionIva === "Monotributo") && (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Categoría de Monotributo</label>
                    <select
                      value={monotributoCategoria}
                      onChange={(e) => setMonotributoCategoria(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none transition-colors font-mono"
                    >
                      <option value="A">Categoría A (Límite: $6.45M anuales)</option>
                      <option value="B">Categoría B (Límite: $9.64M anuales)</option>
                      <option value="C">Categoría C (Límite: $13.20M anuales)</option>
                      <option value="D">Categoría D (Límite: $16.40M anuales)</option>
                      <option value="E">Categoría E (Límite: $19.30M anuales)</option>
                      <option value="F">Categoría F (Límite: $24.20M anuales)</option>
                      <option value="G">Categoría G (Límite: $29.00M anuales)</option>
                      <option value="H">Categoría H (Límite: $44.00M anuales)</option>
                      <option value="I">Categoría I (Límite: $49.20M anuales)</option>
                      <option value="J">Categoría J (Límite: $56.40M anuales)</option>
                      <option value="K">Categoría K (Límite: $68.00M anuales)</option>
                    </select>
                  </div>
                )}

                {condicionIva === "Autonomo" && (
                  <div className="sm:col-span-2 p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-400 font-semibold animate-fade-in leading-relaxed select-none">
                    💡 <strong>Aviso de ARCA:</strong> Los Autónomos facturan fiscalmente bajo la condición de <strong>Responsable Inscripto</strong> (Facturas A y B). El sistema autoconfigurará tu entorno bajo esta condición fiscal.
                  </div>
                )}

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Punto de Venta Fiscal</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={puntoVenta}
                    onChange={(e) => setPuntoVenta(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none transition-colors font-mono"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] text-zinc-400 font-bold uppercase tracking-wider">Ingresos Brutos (IIBB)</label>
                  <input
                    type="text"
                    value={ingresosBrutos}
                    onChange={(e) => setIngresosBrutos(e.target.value)}
                    placeholder="Ej: 901-123456-7"
                    className="w-full px-3 py-2 rounded-xl bg-zinc-950 border border-zinc-800 text-sm text-zinc-100 focus:border-amber-500/50 focus:outline-none transition-colors"
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2.5 rounded-xl bg-zinc-800 hover:bg-zinc-755 text-xs text-white border border-zinc-700 font-bold flex items-center gap-1.5 transition-colors shadow-lg active:scale-95 disabled:opacity-50"
                >
                  {saving ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      Guardar Datos Fiscales
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Section 2: Tabs for Sim vs Real connection */}
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-6">
            
            {/* Elegant Tab Headers with glassmorphism styling */}
            <div className="flex border-b border-zinc-800/80">
              <button
                onClick={() => setActiveTab("bypass")}
                className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                  activeTab === "bypass" 
                    ? "border-amber-500 text-amber-400 bg-amber-500/5" 
                    : "border-transparent text-zinc-400 hover:text-zinc-300"
                }`}
              >
                <Zap className="w-4 h-4 shrink-0" />
                Bypass Simulado (Rápido)
              </button>
              <button
                onClick={() => setActiveTab("official")}
                className={`px-5 py-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 ${
                  activeTab === "official" 
                    ? "border-amber-500 text-amber-400 bg-amber-500/5" 
                    : "border-transparent text-zinc-400 hover:text-zinc-300"
                }`}
              >
                <Key className="w-4 h-4 shrink-0" />
                Modo Oficial / Homologación
              </button>
            </div>

            {/* Tab 1 Content: Bypass Simulator */}
            {activeTab === "bypass" && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white">Facturación Fiscal Simulada en 1-Click</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Si no contás con credenciales reales ni certificados provistos por ARCA, podés activar el simulador local instantáneo. El sistema generará credenciales virtuales seguras y habilitará la emisión de facturas electrónicas A, B y C con CAE y códigos QR en caliente.
                  </p>
                </div>

                <div className="rounded-xl border border-amber-500/10 bg-amber-500/5 p-4 text-xs text-amber-400 flex items-start gap-2.5">
                  <ShieldAlert className="w-4.5 h-4.5 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <span className="font-bold text-white">Bypass Activo:</span> El simulador replica de manera idéntica los esquemas SOAP reales de AFIP. No es necesario realizar ningún trámite fiscal ni descargar/subir llaves. Apto para demostraciones y pruebas del POS.
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={handleActivateBypass}
                    disabled={bypassing}
                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-xs font-bold text-black flex items-center gap-1.5 transition-all shadow-lg shadow-amber-500/10 active:scale-97 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {bypassing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Activando Simulación Express...
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        Activar Simulación al Instante
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Tab 2 Content: Official Homologation / Onboarding Wizard */}
            {activeTab === "official" && (
              <div className="space-y-4 animate-fade-in">
                <div className="space-y-2">
                  <h3 className="text-sm font-bold text-white">Conexión Homologación y Producción Real</h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Para emitir facturas con validez fiscal o realizar pruebas de homologación reales con WSASS, debés generar tu clave privada criptográfica de 2048-bits, descargar el requerimiento CSR y cargar el certificado digital (.crt) firmado por la AFIP.
                  </p>
                </div>

                {/* Real credentials status block */}
                {isRealCert ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2.5 text-xs text-green-400 bg-green-500/5 p-4 rounded-xl border border-green-500/15">
                      <ShieldCheck className="w-5 h-5 shrink-0 text-green-400" />
                      <span>Certificado Digital Oficial cargado e indexado en la base de datos de forma segura.</span>
                    </div>
                    
                    <div className="flex gap-2">
                      <OnboardingWizard 
                        initialCuit={activeCompany.cuit}
                        initialPuntoVenta={activeCompany.punto_venta || 1}
                        initialRazonSocial={razonSocial}
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="flex items-center gap-2.5 text-xs text-amber-400 bg-amber-500/5 p-4 rounded-xl border border-amber-500/15">
                      <ShieldAlert className="w-5 h-5 shrink-0 text-amber-400" />
                      <span>No se detectaron certificados oficiales de AFIP vinculados a este CUIT. Habilitá la simulación rápida o iniciá el asistente de onboarding formal.</span>
                    </div>

                    <div className="flex gap-2">
                      <OnboardingWizard 
                        initialCuit={activeCompany.cuit}
                        initialPuntoVenta={activeCompany.punto_venta || 1}
                        initialRazonSocial={razonSocial}
                      />
                    </div>
                  </div>
                )}
              </div>
            )}

          </div>

        </div>

        {/* Right Pane: Connection State Card */}
        <div className="space-y-6">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-6 space-y-5">
            <div>
              <h2 className="text-base font-bold text-white">Estado de Integración</h2>
              <p className="text-xs text-zinc-400">Verificación de conexión en tiempo real</p>
            </div>

            <div className="rounded-xl bg-zinc-950/80 p-4 border border-zinc-850 space-y-4">
              <div className="flex justify-between items-center text-xs border-b border-zinc-850 pb-3">
                <span className="text-zinc-500">CUIT de Empresa</span>
                <span className="text-zinc-300 font-mono">{activeCompany.cuit}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-zinc-850 pb-3">
                <span className="text-zinc-500">Punto de Venta</span>
                <span className="text-zinc-300 font-mono">{activeCompany.punto_venta ?? 1}</span>
              </div>
              <div className="flex justify-between items-center text-xs border-b border-zinc-850 pb-3">
                <span className="text-zinc-500">Servicio AFIP</span>
                <span className="text-zinc-300 font-bold uppercase">WSFEv1 / WSAA</span>
              </div>
              <div className="flex justify-between items-center text-xs pb-1">
                <span className="text-zinc-500">Entorno Activo</span>
                {arcaCred?.environment === "simulation" ? (
                  <span className="rounded bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 border border-amber-500/20 uppercase tracking-wider">
                    Simulador Local
                  </span>
                ) : hasAfipCert ? (
                  <span className="rounded bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-400 border border-green-500/20 uppercase tracking-wider">
                    {arcaCred?.environment || "homologation"}
                  </span>
                ) : (
                  <span className="rounded bg-zinc-800 px-2 py-0.5 text-[10px] font-bold text-zinc-400 uppercase tracking-wider">
                    Desactivado
                  </span>
                )}
              </div>
            </div>

            <div className="text-[11px] text-zinc-500 leading-relaxed">
              El estado de conexión se valida de forma atómica en el POS. Si el simulador local está activo, todas las operaciones de checkout autorizarán en caliente inmediatamente simulando el WSFE con inmutabilidad en la base de datos de InsForge.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
