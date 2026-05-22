"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Coins,
  Calculator,
  TrendingUp,
  Settings,
  Building2,
  ChevronDown,
  LogOut,
  Menu,
  X,
  User,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  ChevronsLeft,
  ChevronsRight,
  Users,
  Truck,
  FileText,
} from "lucide-react";
import type { CompanyProfile } from "@/core/company/company-store";
import { useCompanyStore } from "@/core/company/company-store";
import { selectCompanyAction, clearCompanyAction } from "@/core/company/company-actions";

interface DashboardShellClientProps {
  children: React.ReactNode;
  activeCompany: CompanyProfile;
  companies: CompanyProfile[];
  userData: any;
}

export function DashboardShellClient({
  children,
  activeCompany,
  companies,
  userData,
}: DashboardShellClientProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [companyDropdownOpen, setCompanyDropdownOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);

  const setCompanyStore = useCompanyStore((state) => state.setCompany);
  const clearCompanyStore = useCompanyStore((state) => state.clearCompany);

  // Sync server activeCompany to client-side Zustand store on load/change
  useEffect(() => {
    setCompanyStore(activeCompany);
  }, [activeCompany, setCompanyStore]);

  const handleCompanyChange = async (company: CompanyProfile) => {
    if (company.cuit === activeCompany.cuit) return;
    setCompanyDropdownOpen(false);
    toast.info(`Cambiando de empresa a ${company.razon_social}...`);

    const result = await selectCompanyAction(company);
    if (result.success) {
      setCompanyStore(company);
      toast.success(`Entorno cambiado: ${company.nombre_fantasia || company.razon_social}`);
      
      // Forzar un reload completo de la ventana para reiniciar Zustand y rehidratar todo el árbol de forma limpia.
      // Esto previene que se mezclen datos en memoria entre empresas y evita bugs de hidratación en Next.js.
      window.location.href = "/protected";
    } else {
      toast.error(result.error || "No se pudo cambiar de empresa.");
    }
  };

  const handleClearCompany = async () => {
    toast.info("Cerrando sesión de empresa...");
    const result = await clearCompanyAction();
    if (result.success) {
      clearCompanyStore();
      window.location.href = "/protected/onboarding";
    } else {
      toast.error("Error al salir del entorno.");
    }
  };

  const handleLogout = async () => {
    toast.info("Cerrando sesión del ERP...");
    
    // Clear the company cookie
    await clearCompanyAction();
    
    // Call the sign-out POST endpoint to clear auth cookies and sign out from InsForge
    const response = await fetch("/auth/sign-out", { method: "POST" });
    
    if (response.ok) {
      toast.success("Sesión finalizada.");
      window.location.href = "/auth/sign-in";
    } else {
      toast.error("Error al cerrar sesión.");
    }
  };

  const menuItems = [
    { name: "Inicio / Resumen", href: "/protected", icon: LayoutDashboard },
    { name: "Inventario", href: "/protected/inventario", icon: Package },
    { name: "Ventas", href: "/protected/ventas", icon: ShoppingCart },
    { name: "Facturas", href: "/protected/facturas", icon: FileText },
    { name: "Clientes", href: "/protected/clientes", icon: Users },
    { name: "Proveedores", href: "/protected/proveedores", icon: Truck },
    { name: "Caja Diaria", href: "/protected/caja", icon: Coins },
    { name: "Contabilidad", href: "/protected/contabilidad", icon: Calculator },
    { name: "Reportes", href: "/protected/reportes", icon: TrendingUp },
    { name: "Configuración", href: "/protected/configuracion", icon: Settings },
  ];

  // AFIP cert indicator
  const hasAfipCert = activeCompany.afip_mode !== null;

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col font-sans">
      {/* Top Navigation Header */}
      <header className="sticky top-0 z-40 bg-zinc-900/60 border-b border-zinc-800/80 backdrop-blur-md px-4 sm:px-6 h-16 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-zinc-800 text-zinc-400 hover:text-white"
          >
            <Menu className="w-6 h-6" />
          </button>
          
          <Link href="/protected" className="flex items-center gap-2">
            <span className="text-xl font-extrabold tracking-tight bg-gradient-to-r from-amber-400 to-amber-600 bg-clip-text text-transparent">
              ERP NODO SUR
            </span>
          </Link>

          <span className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/60 px-3 py-1 text-xs text-zinc-400 font-mono">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            CUIT: {activeCompany.cuit}
          </span>
        </div>

        {/* Header Right Actions */}
        <div className="flex items-center gap-3">
          {/* Active Company Selector */}
          <div className="relative">
            <button
              onClick={() => {
                setCompanyDropdownOpen(!companyDropdownOpen);
                setProfileDropdownOpen(false);
              }}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-zinc-800/40 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all text-xs font-semibold"
            >
              <Building2 className="w-4 h-4 text-amber-400" />
              <span className="max-w-[120px] sm:max-w-[160px] truncate">
                {activeCompany.nombre_fantasia || activeCompany.razon_social}
              </span>
              <ChevronDown className="w-3 h-3 text-zinc-500" />
            </button>

            {companyDropdownOpen && (
              <div className="absolute right-0 mt-2 w-72 rounded-xl bg-zinc-900 border border-zinc-800 p-2 shadow-2xl space-y-1 animate-fade-in z-50">
                <div className="px-3 py-2 text-xs font-bold text-zinc-500 uppercase tracking-widest border-b border-zinc-800/60">
                  Seleccionar Empresa
                </div>
                {companies.map((company) => (
                  <button
                    key={company.cuit}
                    onClick={() => handleCompanyChange(company)}
                    className={`w-full text-left px-3 py-2.5 rounded-lg flex flex-col gap-0.5 hover:bg-zinc-800/60 transition-colors ${
                      company.cuit === activeCompany.cuit ? "bg-amber-500/10 text-amber-300 font-semibold" : "text-zinc-300"
                    }`}
                  >
                    <span className="text-sm truncate">{company.nombre_fantasia || company.razon_social}</span>
                    <span className="text-xs text-zinc-500 font-mono">CUIT: {company.cuit}</span>
                  </button>
                ))}
                <div className="border-t border-zinc-800/60 pt-1 mt-1">
                  <button
                    onClick={handleClearCompany}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-bold text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors flex items-center justify-between"
                  >
                    <span>Cambiar de Entorno</span>
                    <Building2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* User Profile */}
          <div className="relative">
            <button
              onClick={() => {
                setProfileDropdownOpen(!profileDropdownOpen);
                setCompanyDropdownOpen(false);
              }}
              className="p-2 rounded-full bg-zinc-800/60 border border-zinc-700/50 hover:bg-zinc-800 hover:border-zinc-600 transition-all"
            >
              <User className="w-4 h-4 text-zinc-300" />
            </button>

            {profileDropdownOpen && (
              <div className="absolute right-0 mt-2 w-56 rounded-xl bg-zinc-900 border border-zinc-800 p-2 shadow-2xl animate-fade-in z-50">
                <div className="px-3 py-2 border-b border-zinc-800/60">
                  <p className="text-sm font-semibold text-white truncate">{userData?.email || "Usuario"}</p>
                  <p className="text-xs text-zinc-500 capitalize">Rol: Administrador (DB)</p>
                </div>
                <div className="p-1 space-y-1">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs font-semibold text-red-400 hover:bg-red-500/10 transition-colors flex items-center justify-between"
                  >
                    <span>Cerrar Sesión</span>
                    <LogOut className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* Main Layout Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar (Collapsible Solid Obsidian Flat) */}
        <aside
          className={`hidden md:flex flex-col bg-[#0f0f13] border-r border-[#1e1e24] p-4 space-y-6 transition-all duration-300 ease-in-out shrink-0 ${
            collapsed ? "w-20" : "w-64"
          }`}
        >
          {/* Sidebar Toggle Header */}
          <div
            className={`flex items-center ${
              collapsed ? "justify-center" : "justify-between"
            } pb-2 border-b border-[#1e1e24]/60`}
          >
            {!collapsed && (
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                Navegación
              </span>
            )}
            <button
              onClick={() => setCollapsed(!collapsed)}
              className="p-1.5 rounded-lg hover:bg-zinc-800/80 text-zinc-500 hover:text-white transition-all duration-200"
              title={collapsed ? "Expandir menú" : "Colapsar menú"}
            >
              {collapsed ? (
                <ChevronsRight className="w-4 h-4 text-amber-500" />
              ) : (
                <ChevronsLeft className="w-4 h-4" />
              )}
            </button>
          </div>

          {/* AFIP Status Box */}
          <div
            className={`rounded-xl border border-[#1e1e24] bg-[#121217] p-3 space-y-3 transition-all duration-300 ${
              collapsed ? "items-center flex flex-col justify-center" : ""
            }`}
          >
            {collapsed ? (
              <div className="relative group">
                <div
                  className={`p-1.5 rounded-lg ${
                    hasAfipCert
                      ? "bg-green-500/10 border border-green-500/20 text-green-400"
                      : "bg-red-500/10 border border-red-500/20 text-red-400"
                  }`}
                >
                  {hasAfipCert ? (
                    <ShieldCheck className="w-5 h-5" />
                  ) : (
                    <ShieldAlert className="w-5 h-5" />
                  )}
                </div>
                {/* Micro Tooltip */}
                <div className="absolute left-12 top-1/2 -translate-y-1/2 ml-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-2xl z-50">
                  AFIP: {hasAfipCert ? "Habilitado" : "Simulación"}
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                    Servicio AFIP
                  </span>
                  {hasAfipCert ? (
                    <span className="flex items-center gap-1 rounded bg-green-500/10 px-2 py-0.5 text-[10px] font-bold text-green-400">
                      <ShieldCheck className="w-3 h-3" /> Producción
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 rounded bg-red-500/10 px-2 py-0.5 text-[10px] font-bold text-red-400">
                      <ShieldAlert className="w-3 h-3" /> Desconectado
                    </span>
                  )}
                </div>
                <div className="space-y-1">
                  <p className="text-sm font-bold text-white leading-tight">
                    {activeCompany.nombre_fantasia || activeCompany.razon_social}
                  </p>
                  <p className="text-xs text-zinc-500 font-mono">
                    CUIT: {activeCompany.cuit}
                  </p>
                </div>
              </>
            )}
          </div>

          {/* Navigation Links */}
          <nav className="flex-1 space-y-1.5">
            {menuItems.map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center rounded-xl text-sm font-medium transition-all duration-200 group border ${
                    active
                      ? "bg-amber-500/10 text-amber-300 border-amber-500/20"
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 border-transparent"
                  } ${collapsed ? "justify-center p-3" : "px-3 py-2.5 gap-3"}`}
                  title={collapsed ? item.name : undefined}
                >
                  <item.icon
                    className={`w-4 h-4 shrink-0 transition-transform group-hover:scale-110 duration-200 ${
                      active ? "text-amber-400" : "text-zinc-400"
                    }`}
                  />
                  {!collapsed && <span className="truncate">{item.name}</span>}
                </Link>
              );
            })}
          </nav>

          {/* User Footer */}
          <div
            className={`border-t border-[#1e1e24]/80 pt-4 flex items-center justify-between text-xs text-zinc-500 ${
              collapsed ? "flex-col gap-3 justify-center" : ""
            }`}
          >
            {collapsed ? (
              <div className="relative group">
                <button
                  onClick={handleLogout}
                  className="p-2 rounded-lg hover:bg-zinc-800 hover:text-red-400 transition-colors bg-zinc-900/50 border border-zinc-800"
                >
                  <LogOut className="w-4 h-4" />
                </button>
                <div className="absolute left-12 bottom-2 ml-2 px-3 py-1.5 rounded-lg bg-zinc-950 border border-zinc-800 text-[10px] text-zinc-300 font-bold whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-2xl z-50">
                  Cerrar Sesión ({userData?.email})
                </div>
              </div>
            ) : (
              <>
                <span className="truncate max-w-[140px]">{userData?.email}</span>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-red-400 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </>
            )}
          </div>
        </aside>

        {/* Mobile Sidebar Modal overlay */}
        {sidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            {/* Overlay background */}
            <div
              onClick={() => setSidebarOpen(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            />

            {/* Sidebar drawer content */}
            <aside className="relative flex-1 flex flex-col max-w-xs w-full bg-zinc-950 border-r border-zinc-800 p-4 space-y-8 animate-slide-in">
              <div className="flex justify-between items-center">
                <span className="text-lg font-black tracking-tight text-white">
                  MENÚ ERP
                </span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="p-2 rounded-lg hover:bg-zinc-800 text-zinc-400"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Navigation Links */}
              <nav className="flex-1 space-y-1">
                {menuItems.map((item) => {
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setSidebarOpen(false)}
                      className={`flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all group ${
                        active
                          ? "bg-amber-500/10 text-amber-300 border border-amber-500/20"
                          : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/40 border border-transparent"
                      }`}
                    >
                      <item.icon
                        className={`w-4 h-4 ${
                          active ? "text-amber-400" : "text-zinc-400"
                        }`}
                      />
                      <span>{item.name}</span>
                    </Link>
                  );
                })}
              </nav>

              {/* User Footer */}
              <div className="border-t border-zinc-800/80 pt-4 flex items-center justify-between text-xs text-zinc-500">
                <span className="truncate">{userData?.email}</span>
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg hover:bg-zinc-800 hover:text-red-400"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* Main Work Area - Refactored to max-w-[1400px] for widescreen high-density tables */}
        <main className="flex-1 overflow-auto p-6 sm:p-8">
          <div className="max-w-[1400px] mx-auto space-y-8 animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
