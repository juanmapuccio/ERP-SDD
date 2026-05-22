"use client";

import React, { useState, useEffect } from "react";
import { useInventoryStore } from "@/features/inventory/store/use-inventory-store";
import { getSupabaseClient } from "@/core/api/supabase";
import { checkDeleteIntegrity } from "@/features/inventory/utils/inventory-utils";

interface TaxonomyManagerDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

type TabType = "rubros" | "marcas" | "vehiculos";

interface DBBrandAuto {
  id: string;
  nombre: string;
}

interface DBModelAuto {
  id: string;
  nombre: string;
  marca_id: string;
}

interface DBVersionAuto {
  id: string;
  motorizacion: string;
  anio_desde: number;
  anio_hasta: number | null;
  modelo_id: string;
}

export function TaxonomyManagerDrawer({ isOpen, onClose }: TaxonomyManagerDrawerProps) {
  const { brands, families, addBrand, deleteBrand, addFamily, deleteFamily, fetchMetadata } = useInventoryStore();
  const [activeTab, setActiveTab] = useState<TabType>("rubros");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Forms state
  const [newFamilyNombre, setNewFamilyNombre] = useState("");
  const [newFamilyDesc, setNewFamilyDesc] = useState("");

  const [newBrandNombre, setNewBrandNombre] = useState("");
  const [newBrandPais, setNewBrandPais] = useState("");

  // Vehicles state
  const [autoBrands, setAutoBrands] = useState<DBBrandAuto[]>([]);
  const [autoModels, setAutoModels] = useState<DBModelAuto[]>([]);
  const [autoVersions, setAutoVersions] = useState<DBVersionAuto[]>([]);

  const [selectedAutoBrandId, setSelectedAutoBrandId] = useState("");
  const [selectedAutoModelId, setSelectedAutoModelId] = useState("");

  const [newAutoBrandNombre, setNewAutoBrandNombre] = useState("");
  const [newAutoModelNombre, setNewAutoModelNombre] = useState("");
  const [newAutoVersionMotor, setNewAutoVersionMotor] = useState("");
  const [newAutoVersionDesde, setNewAutoVersionDesde] = useState("2015");
  const [newAutoVersionHasta, setNewAutoVersionHasta] = useState("");

  // Integrity Block Alert Modal/Overlay state
  const [integrityWarning, setIntegrityWarning] = useState<{
    title: string;
    description: string;
    details: string;
  } | null>(null);

  // Double Confirmation input
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [confirmDeleteType, setConfirmDeleteType] = useState<"family" | "brand" | "auto_brand" | "auto_model" | "auto_version" | null>(null);
  const [confirmTextVal, setConfirmTextVal] = useState("");
  const [confirmTargetName, setConfirmTargetName] = useState("");

  // Load Auto Brands
  const loadAutoBrands = async () => {
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.database
        .from("auto_marca")
        .select("*")
        .order("nombre", { ascending: true });

      if (error) throw error;
      setAutoBrands((data as DBBrandAuto[]) || []);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Auto Models
  const loadAutoModels = async (brandId: string) => {
    if (!brandId) {
      setAutoModels([]);
      setAutoVersions([]);
      return;
    }
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.database
        .from("auto_modelo")
        .select("*")
        .eq("marca_id", brandId)
        .order("nombre", { ascending: true });

      if (error) throw error;
      setAutoModels((data as DBModelAuto[]) || []);
      setAutoVersions([]);
    } catch (err) {
      console.error(err);
    }
  };

  // Load Auto Versions
  const loadAutoVersions = async (modelId: string) => {
    if (!modelId) {
      setAutoVersions([]);
      return;
    }
    try {
      const client = getSupabaseClient();
      const { data, error } = await client.database
        .from("auto_version")
        .select("*")
        .eq("modelo_id", modelId)
        .order("anio_desde", { ascending: false });

      if (error) throw error;
      setAutoVersions((data as DBVersionAuto[]) || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    fetchMetadata();
    loadAutoBrands();
  }, [isOpen]);

  useEffect(() => {
    loadAutoModels(selectedAutoBrandId);
    setSelectedAutoModelId("");
  }, [selectedAutoBrandId]);

  useEffect(() => {
    loadAutoVersions(selectedAutoModelId);
  }, [selectedAutoModelId]);

  const showSuccess = (msg: string) => {
    setSuccessMessage(msg);
    setErrorMessage("");
    setTimeout(() => setSuccessMessage(""), 4000);
  };

  const showError = (msg: string) => {
    setErrorMessage(msg);
    setSuccessMessage("");
  };

  // 1. Rubros Actions
  const handleAddFamilySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFamilyNombre.trim()) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await addFamily(newFamilyNombre.trim(), newFamilyDesc.trim() || null);
      setNewFamilyNombre("");
      setNewFamilyDesc("");
      showSuccess("Familia de repuestos registrada correctamente.");
    } catch (err: any) {
      showError(err.message || "Error al crear la familia.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteFamily = async (id: string, nombre: string) => {
    try {
      const client = getSupabaseClient();
      // Count references in 'articulo' table
      const { count, error } = await client.database
        .from("articulo")
        .select("id", { count: "exact", head: true })
        .eq("familia_id", id);

      if (error) throw error;

      const warning = checkDeleteIntegrity("family", nombre, count || 0);
      if (warning) {
        setIntegrityWarning(warning);
      } else {
        // Open double confirmation prompt
        setConfirmDeleteId(id);
        setConfirmDeleteType("family");
        setConfirmTargetName(nombre);
        setConfirmTextVal("");
      }
    } catch (err: any) {
      showError(err.message || "Error al verificar dependencias.");
    }
  };

  // 2. Marcas Actions
  const handleAddBrandSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBrandNombre.trim()) return;

    setIsSubmitting(true);
    setErrorMessage("");
    try {
      await addBrand(newBrandNombre.trim(), newBrandPais.trim() || null);
      setNewBrandNombre("");
      setNewBrandPais("");
      showSuccess("Marca de repuesto registrada correctamente.");
    } catch (err: any) {
      showError(err.message || "Error al registrar la marca.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteBrand = async (id: string, nombre: string) => {
    try {
      const client = getSupabaseClient();
      // Count references in 'articulo' table
      const { count, error } = await client.database
        .from("articulo")
        .select("id", { count: "exact", head: true })
        .eq("marca_id", id);

      if (error) throw error;

      const warning = checkDeleteIntegrity("brand", nombre, count || 0);
      if (warning) {
        setIntegrityWarning(warning);
      } else {
        setConfirmDeleteId(id);
        setConfirmDeleteType("brand");
        setConfirmTargetName(nombre);
        setConfirmTextVal("");
      }
    } catch (err: any) {
      showError(err.message || "Error al comprobar dependencias.");
    }
  };

  // 3. Vehículos Catalog Actions
  const handleAddAutoBrand = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAutoBrandNombre.trim()) return;

    setIsSubmitting(true);
    try {
      const client = getSupabaseClient();
      const { error } = await client.database
        .from("auto_marca")
        .insert([{ nombre: newAutoBrandNombre.trim() }]);

      if (error) throw error;
      setNewAutoBrandNombre("");
      await loadAutoBrands();
      showSuccess("Marca vehicular creada.");
    } catch (err: any) {
      showError(err.message || "Error al crear marca vehicular.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteAutoBrand = async (id: string, nombre: string) => {
    try {
      const client = getSupabaseClient();
      // Check if it has models associated
      const { count, error } = await client.database
        .from("auto_modelo")
        .select("id", { count: "exact", head: true })
        .eq("marca_id", id);

      if (error) throw error;

      const warning = checkDeleteIntegrity("auto_brand", nombre, count || 0);
      if (warning) {
        setIntegrityWarning(warning);
      } else {
        setConfirmDeleteId(id);
        setConfirmDeleteType("auto_brand");
        setConfirmTargetName(nombre);
        setConfirmTextVal("");
      }
    } catch (err: any) {
      showError("Error de comprobación de integridad.");
    }
  };

  const handleAddAutoModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAutoModelNombre.trim() || !selectedAutoBrandId) return;

    setIsSubmitting(true);
    try {
      const client = getSupabaseClient();
      const { error } = await client.database
        .from("auto_modelo")
        .insert([{ nombre: newAutoModelNombre.trim(), marca_id: selectedAutoBrandId }]);

      if (error) throw error;
      setNewAutoModelNombre("");
      await loadAutoModels(selectedAutoBrandId);
      showSuccess("Modelo creado correctamente.");
    } catch (err: any) {
      showError(err.message || "Error al registrar modelo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteAutoModel = async (id: string, nombre: string) => {
    try {
      const client = getSupabaseClient();
      // Check if it has versions associated
      const { count, error } = await client.database
        .from("auto_version")
        .select("id", { count: "exact", head: true })
        .eq("modelo_id", id);

      if (error) throw error;

      const warning = checkDeleteIntegrity("auto_model", nombre, count || 0);
      if (warning) {
        setIntegrityWarning(warning);
      } else {
        setConfirmDeleteId(id);
        setConfirmDeleteType("auto_model");
        setConfirmTargetName(nombre);
        setConfirmTextVal("");
      }
    } catch (err: any) {
      showError("Error de integridad.");
    }
  };

  const handleAddAutoVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAutoVersionMotor.trim() || !selectedAutoModelId || !newAutoVersionDesde) return;

    setIsSubmitting(true);
    try {
      const client = getSupabaseClient();
      const payload = {
        motorizacion: newAutoVersionMotor.trim(),
        anio_desde: parseInt(newAutoVersionDesde, 10),
        anio_hasta: newAutoVersionHasta ? parseInt(newAutoVersionHasta, 10) : null,
        modelo_id: selectedAutoModelId
      };

      const { error } = await client.database
        .from("auto_version")
        .insert([payload]);

      if (error) throw error;
      setNewAutoVersionMotor("");
      setNewAutoVersionDesde("2015");
      setNewAutoVersionHasta("");
      await loadAutoVersions(selectedAutoModelId);
      showSuccess("Versión vehicular creada.");
    } catch (err: any) {
      showError(err.message || "Error al crear la versión.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const requestDeleteAutoVersion = async (id: string, nombre: string) => {
    try {
      const client = getSupabaseClient();
      // Check if any article compatibilities reference this version
      const { count, error } = await client.database
        .from("articulo_compatibilidad")
        .select("articulo_id", { count: "exact", head: true })
        .eq("auto_version_id", id);

      if (error) throw error;

      const warning = checkDeleteIntegrity("auto_version", nombre, count || 0);
      if (warning) {
        setIntegrityWarning(warning);
      } else {
        setConfirmDeleteId(id);
        setConfirmDeleteType("auto_version");
        setConfirmTargetName(nombre);
        setConfirmTextVal("");
      }
    } catch (err: any) {
      showError("Error de integridad.");
    }
  };

  // Perform safe deletion after double confirmation matches
  const handleConfirmDeletion = async () => {
    if (confirmTextVal.toLowerCase() !== confirmTargetName.toLowerCase()) {
      showError("El nombre ingresado no coincide con el elemento.");
      return;
    }

    if (!confirmDeleteId || !confirmDeleteType) return;

    setIsSubmitting(true);
    try {
      if (confirmDeleteType === "family") {
        await deleteFamily(confirmDeleteId);
        showSuccess("Familia eliminada correctamente.");
      } else if (confirmDeleteType === "brand") {
        await deleteBrand(confirmDeleteId);
        showSuccess("Marca de repuesto eliminada.");
      } else {
        const client = getSupabaseClient();
        if (confirmDeleteType === "auto_brand") {
          const { error } = await client.database.from("auto_marca").delete().eq("id", confirmDeleteId);
          if (error) throw error;
          await loadAutoBrands();
          setSelectedAutoBrandId("");
          showSuccess("Marca vehicular eliminada.");
        } else if (confirmDeleteType === "auto_model") {
          const { error } = await client.database.from("auto_modelo").delete().eq("id", confirmDeleteId);
          if (error) throw error;
          await loadAutoModels(selectedAutoBrandId);
          setSelectedAutoModelId("");
          showSuccess("Modelo eliminado.");
        } else if (confirmDeleteType === "auto_version") {
          const { error } = await client.database.from("auto_version").delete().eq("id", confirmDeleteId);
          if (error) throw error;
          await loadAutoVersions(selectedAutoModelId);
          showSuccess("Versión eliminada.");
        }
      }

      setConfirmDeleteId(null);
      setConfirmDeleteType(null);
    } catch (err: any) {
      showError(err.message || "Error al realizar la eliminación.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      {/* Backdrop */}
      <div onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity" />

      {/* Drawer Body */}
      <div className="relative z-10 flex h-full w-full max-w-3xl flex-col bg-zinc-950 border-l border-zinc-800 text-white shadow-2xl animate-slide-in-right">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 px-6 py-5">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span className="text-amber-500">⚙️</span>
              <span>Centro de Taxonomía Autopartista</span>
            </h2>
            <p className="text-xs text-zinc-400">
              Administrá de forma segura las familias de repuestos, marcas y compatibilidades vehiculares
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 hover:bg-zinc-900 text-zinc-400 hover:text-white"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Tab Headers */}
        <div className="flex border-b border-zinc-800 px-6 bg-zinc-900/30">
          <button
            onClick={() => setActiveTab("rubros")}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === "rubros"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Familias / Rubros
          </button>
          <button
            onClick={() => setActiveTab("marcas")}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === "marcas"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Marcas de Repuesto
          </button>
          <button
            onClick={() => setActiveTab("vehiculos")}
            className={`px-4 py-3 text-xs font-bold uppercase tracking-wider border-b-2 transition ${
              activeTab === "vehiculos"
                ? "border-amber-500 text-amber-400"
                : "border-transparent text-zinc-400 hover:text-zinc-200"
            }`}
          >
            Catálogo Vehicular
          </button>
        </div>

        {/* Alerts Block */}
        <div className="px-6 pt-4">
          {errorMessage && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3 text-xs text-red-400 animate-pulse">
              ⚠️ {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-400">
              ✅ {successMessage}
            </div>
          )}
        </div>

        {/* Scrollable Tab Content */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-6">
          
          {/* TAB 1: FAMILIAS / RUBROS */}
          {activeTab === "rubros" && (
            <div className="space-y-6">
              {/* Form to add a new Rubro */}
              <form onSubmit={handleAddFamilySubmit} className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 space-y-3">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Registrar Nueva Familia</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={newFamilyNombre}
                    onChange={(e) => setNewFamilyNombre(e.target.value)}
                    placeholder="E.g. Frenos, Encendido, Suspensión"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs focus:outline-none focus:border-amber-500/40"
                  />
                  <input
                    type="text"
                    value={newFamilyDesc}
                    onChange={(e) => setNewFamilyDesc(e.target.value)}
                    placeholder="Descripción breve (opcional)"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs focus:outline-none focus:border-amber-500/40"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newFamilyNombre}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-extrabold transition disabled:opacity-40"
                  >
                    + Agregar Familia
                  </button>
                </div>
              </form>

              {/* Rubros List Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Familias Registradas</h3>
                <div className="rounded-xl border border-zinc-850 overflow-hidden bg-zinc-950/60">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-bold uppercase">
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">Descripción</th>
                        <th className="px-4 py-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {families.map((f) => (
                        <tr key={f.id} className="hover:bg-zinc-900/50">
                          <td className="px-4 py-3 font-semibold text-white">{f.nombre}</td>
                          <td className="px-4 py-3 text-zinc-400">{f.descripcion || "—"}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => requestDeleteFamily(f.id, f.nombre)}
                              className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition text-[10px] font-bold"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: MARCAS DE REPUESTOS */}
          {activeTab === "marcas" && (
            <div className="space-y-6">
              {/* Form to add a new Brand */}
              <form onSubmit={handleAddBrandSubmit} className="rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 space-y-3">
                <h3 className="text-xs font-bold text-amber-500 uppercase tracking-wider">Registrar Nueva Marca</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <input
                    type="text"
                    required
                    value={newBrandNombre}
                    onChange={(e) => setNewBrandNombre(e.target.value)}
                    placeholder="E.g. Bosch, FRAM, Brembo"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs focus:outline-none focus:border-amber-500/40"
                  />
                  <input
                    type="text"
                    value={newBrandPais}
                    onChange={(e) => setNewBrandPais(e.target.value)}
                    placeholder="País de Origen (e.g. Alemania, Italia)"
                    className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs focus:outline-none focus:border-amber-500/40"
                  />
                </div>
                <div className="flex justify-end">
                  <button
                    type="submit"
                    disabled={isSubmitting || !newBrandNombre}
                    className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-600 text-black text-xs font-extrabold transition disabled:opacity-40"
                  >
                    + Agregar Marca
                  </button>
                </div>
              </form>

              {/* Brands List Table */}
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400">Marcas Registradas</h3>
                <div className="rounded-xl border border-zinc-850 overflow-hidden bg-zinc-950/60">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-zinc-900 border-b border-zinc-800 text-zinc-400 font-bold uppercase">
                        <th className="px-4 py-3">Nombre</th>
                        <th className="px-4 py-3">País de Origen</th>
                        <th className="px-4 py-3 text-right">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900">
                      {brands.map((b) => (
                        <tr key={b.id} className="hover:bg-zinc-900/50">
                          <td className="px-4 py-3 font-semibold text-white">{b.nombre}</td>
                          <td className="px-4 py-3 text-zinc-400">{b.pais_origen || "—"}</td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => requestDeleteBrand(b.id, b.nombre)}
                              className="px-2.5 py-1 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 hover:text-red-300 transition text-[10px] font-bold"
                            >
                              Eliminar
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: CATALOGO VEHICULAR (MARCAS/MODELOS/VERSIONES) */}
          {activeTab === "vehiculos" && (
            <div className="space-y-6">
              
              {/* Cascade Manager Layout */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                
                {/* Column 1: Marcas Vehiculares */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-3 space-y-3">
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider border-b border-zinc-800 pb-1.5">Marcas de Autos</h4>
                  
                  {/* Form to add vehicle brand */}
                  <form onSubmit={handleAddAutoBrand} className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={newAutoBrandNombre}
                      onChange={(e) => setNewAutoBrandNombre(e.target.value)}
                      placeholder="Nueva Marca..."
                      className="flex-1 px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] focus:outline-none focus:border-amber-500/40 text-white"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !newAutoBrandNombre}
                      className="px-2 py-1 rounded bg-amber-500 text-black text-[11px] font-bold"
                    >
                      +
                    </button>
                  </form>

                  {/* List of car brands */}
                  <div className="h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {autoBrands.map((b) => (
                      <div
                        key={b.id}
                        onClick={() => setSelectedAutoBrandId(b.id)}
                        className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition ${
                          selectedAutoBrandId === b.id
                            ? "bg-amber-500/15 border border-amber-500/45 text-amber-300 font-bold"
                            : "bg-zinc-900/40 hover:bg-zinc-900 border border-transparent text-zinc-300"
                        }`}
                      >
                        <span>{b.nombre}</span>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            requestDeleteAutoBrand(b.id, b.nombre);
                          }}
                          className="text-[9px] font-bold text-red-500 hover:text-red-400 p-0.5"
                        >
                          ✕
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Column 2: Modelos Vehiculares */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-3 space-y-3">
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider border-b border-zinc-800 pb-1.5">Modelos</h4>
                  
                  {/* Form to add model */}
                  <form onSubmit={handleAddAutoModel} className="flex gap-2">
                    <input
                      type="text"
                      required
                      disabled={!selectedAutoBrandId}
                      value={newAutoModelNombre}
                      onChange={(e) => setNewAutoModelNombre(e.target.value)}
                      placeholder="Nuevo Modelo..."
                      className="flex-1 px-2.5 py-1.5 rounded bg-zinc-900 border border-zinc-800 text-[11px] focus:outline-none focus:border-amber-500/40 text-white disabled:opacity-40"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting || !newAutoModelNombre || !selectedAutoBrandId}
                      className="px-2 py-1 rounded bg-amber-500 text-black text-[11px] font-bold disabled:opacity-45"
                    >
                      +
                    </button>
                  </form>

                  {/* Models list */}
                  <div className="h-60 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {!selectedAutoBrandId ? (
                      <div className="text-center text-[10px] text-zinc-500 pt-10">Seleccione una marca auto</div>
                    ) : autoModels.length === 0 ? (
                      <div className="text-center text-[10px] text-zinc-500 pt-10">Sin modelos registrados</div>
                    ) : (
                      autoModels.map((m) => (
                        <div
                          key={m.id}
                          onClick={() => setSelectedAutoModelId(m.id)}
                          className={`flex items-center justify-between px-2.5 py-2 rounded-lg cursor-pointer text-xs transition ${
                            selectedAutoModelId === m.id
                              ? "bg-amber-500/15 border border-amber-500/45 text-amber-300 font-bold"
                              : "bg-zinc-900/40 hover:bg-zinc-900 border border-transparent text-zinc-300"
                          }`}
                        >
                          <span>{m.nombre}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              requestDeleteAutoModel(m.id, m.nombre);
                            }}
                            className="text-[9px] font-bold text-red-500 hover:text-red-400 p-0.5"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Column 3: Versiones / Motorizaciones */}
                <div className="rounded-xl border border-zinc-800 bg-zinc-900/10 p-3 space-y-3">
                  <h4 className="text-xs font-bold text-amber-500 uppercase tracking-wider border-b border-zinc-800 pb-1.5">Motor / Año</h4>
                  
                  {/* Form to add version */}
                  <form onSubmit={handleAddAutoVersion} className="space-y-2">
                    <input
                      type="text"
                      required
                      disabled={!selectedAutoModelId}
                      value={newAutoVersionMotor}
                      onChange={(e) => setNewAutoVersionMotor(e.target.value)}
                      placeholder="Motor (e.g. 1.6 MSI)"
                      className="w-full px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] focus:outline-none focus:border-amber-500/40 text-white disabled:opacity-40"
                    />
                    <div className="grid grid-cols-2 gap-1.5">
                      <input
                        type="number"
                        required
                        disabled={!selectedAutoModelId}
                        value={newAutoVersionDesde}
                        onChange={(e) => setNewAutoVersionDesde(e.target.value)}
                        placeholder="Desde (Año)"
                        className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] focus:outline-none focus:border-amber-500/40 text-white disabled:opacity-40"
                      />
                      <input
                        type="number"
                        disabled={!selectedAutoModelId}
                        value={newAutoVersionHasta}
                        onChange={(e) => setNewAutoVersionHasta(e.target.value)}
                        placeholder="Hasta (Año)"
                        className="px-2 py-1 rounded bg-zinc-900 border border-zinc-800 text-[10px] focus:outline-none focus:border-amber-500/40 text-white disabled:opacity-40"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSubmitting || !newAutoVersionMotor || !selectedAutoModelId}
                      className="w-full py-1.5 rounded bg-amber-500 text-black text-[10px] font-bold disabled:opacity-45"
                    >
                      + Registrar Versión
                    </button>
                  </form>

                  {/* Versions list */}
                  <div className="h-44 overflow-y-auto space-y-1 pr-1 custom-scrollbar">
                    {!selectedAutoModelId ? (
                      <div className="text-center text-[10px] text-zinc-500 pt-10">Seleccione un modelo</div>
                    ) : autoVersions.length === 0 ? (
                      <div className="text-center text-[10px] text-zinc-500 pt-10">Sin versiones registradas</div>
                    ) : (
                      autoVersions.map((v) => (
                        <div
                          key={v.id}
                          className="flex items-center justify-between px-2 py-1.5 rounded bg-zinc-900/60 border border-zinc-850 text-[11px] text-zinc-300"
                        >
                          <span className="truncate">
                            {v.motorizacion} <span className="text-zinc-500 font-mono">({v.anio_desde}{v.anio_hasta ? `-${v.anio_hasta}` : "+"})</span>
                          </span>
                          <button
                            onClick={() => requestDeleteAutoVersion(v.id, `${v.motorizacion} (${v.anio_desde})`)}
                            className="text-[9px] font-bold text-red-500 hover:text-red-400 p-0.5 ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

              </div>

            </div>
          )}

        </div>

        {/* Drawer Footer Actions */}
        <div className="flex items-center justify-end gap-3 border-t border-zinc-800 bg-zinc-950/80 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs font-bold text-zinc-400 hover:text-white transition"
          >
            Cerrar Centro
          </button>
        </div>

      </div>

      {/* 1. GLASSMORPHIC INTEGRITY BLOCKED ALERT OVERLAY */}
      {integrityWarning && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-yellow-500/30 bg-zinc-950 p-6 text-white shadow-2xl relative">
            <div className="h-12 w-12 rounded-full bg-yellow-500/10 flex items-center justify-center text-yellow-500 mb-4 border border-yellow-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                <line x1="12" y1="9" x2="12" y2="13" />
                <line x1="12" y1="17" x2="12.01" y2="17" />
              </svg>
            </div>
            <h3 className="text-base font-bold text-white mb-2">{integrityWarning.title}</h3>
            <p className="text-xs text-zinc-300 leading-relaxed mb-3">{integrityWarning.description}</p>
            <p className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 p-2.5 rounded-lg font-medium leading-relaxed mb-5">
              💡 {integrityWarning.details}
            </p>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setIntegrityWarning(null)}
                className="px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-xs font-bold text-zinc-300 hover:text-white"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. DOUBLE CONFIRMATION SAFETY PROMPT */}
      {confirmDeleteId && confirmDeleteType && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-red-500/30 bg-zinc-950 p-6 text-white shadow-2xl relative space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </div>
            
            <div>
              <h3 className="text-base font-bold text-white mb-1">Confirmar Eliminación Segura</h3>
              <p className="text-xs text-zinc-400">
                Esta acción es irreversible y borrará la propiedad del ecosistema definitivamente.
              </p>
            </div>

            <div className="space-y-2 p-3 bg-red-500/5 rounded-lg border border-red-500/10">
              <label className="text-[11px] font-bold text-red-400 uppercase tracking-wider block">
                Escribí el nombre exacto para confirmar:
              </label>
              <p className="text-xs font-mono font-bold text-white select-none">{confirmTargetName}</p>
              <input
                type="text"
                value={confirmTextVal}
                onChange={(e) => setConfirmTextVal(e.target.value)}
                placeholder="Escribilo acá..."
                className="w-full px-3 py-2 rounded-lg bg-zinc-900 border border-zinc-800 text-xs focus:outline-none focus:border-red-500/40 text-white font-mono"
              />
            </div>

            <div className="flex justify-end gap-3.5">
              <button
                type="button"
                onClick={() => {
                  setConfirmDeleteId(null);
                  setConfirmDeleteType(null);
                }}
                className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-400 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeletion}
                disabled={confirmTextVal.toLowerCase() !== confirmTargetName.toLowerCase() || isSubmitting}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition disabled:opacity-40 disabled:hover:bg-red-600"
              >
                Eliminar Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
