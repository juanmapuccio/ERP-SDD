import { create } from "zustand";

export interface CompanyProfile {
  cuit: string;
  razon_social: string;
  nombre_fantasia: string | null;
  condicion_iva: string;
  monotributo_categoria?: string | null;
  ingresos_brutos: string | null;
  inicio_actividades: string | null;
  direccion: string | null;
  punto_venta: number | null;
  afip_mode: string | null;
  celular: string | null;
  email: string | null;
  tipo_juridico?: string | null;
}

interface CompanyState {
  currentCuit: string | null;
  currentCompany: CompanyProfile | null;
  setCompany: (company: CompanyProfile) => void;
  clearCompany: () => void;
}

// Utility to parse active cuit cookie in browser
const getCuitFromCookie = (): string | null => {
  if (typeof window === "undefined") return null;
  const match = document.cookie.match(/(^|;)\s*erp_active_cuit\s*=\s*([^;]+)/);
  return match ? decodeURIComponent(match[2]) : null;
};

export const useCompanyStore = create<CompanyState>((set) => ({
  currentCuit: getCuitFromCookie(),
  currentCompany: null,
  setCompany: (company) =>
    set({
      currentCuit: company.cuit,
      currentCompany: company,
    }),
  clearCompany: () =>
    set({
      currentCuit: null,
      currentCompany: null,
    }),
}));
