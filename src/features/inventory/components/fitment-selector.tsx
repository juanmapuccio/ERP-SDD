"use client";

import React, { useState, useEffect } from "react";
import { getSupabaseClient } from "@/core/api/supabase";

export interface VehicleFitment {
  id: string; // auto_version_id
  marca: string;
  modelo: string;
  motorizacion: string;
  anioDesde: number;
  anioHasta?: number;
}

interface FitmentSelectorProps {
  selectedFitments: VehicleFitment[];
  onChange: (fitments: VehicleFitment[]) => void;
}

interface DBBrand {
  id: string;
  nombre: string;
}

interface DBModel {
  id: string;
  nombre: string;
}

interface DBVersion {
  id: string;
  motorizacion: string;
  anio_desde: number;
  anio_hasta: number | null;
}

export function FitmentSelector({ selectedFitments, onChange }: FitmentSelectorProps) {
  const [brands, setBrands] = useState<DBBrand[]>([]);
  const [models, setModels] = useState<DBModel[]>([]);
  const [versions, setVersions] = useState<DBVersion[]>([]);

  const [selectedBrandId, setSelectedBrandId] = useState<string>("");
  const [selectedModelId, setSelectedModelId] = useState<string>("");
  const [selectedVersionId, setSelectedVersionId] = useState<string>("");

  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Load auto brands on mount
  useEffect(() => {
    const loadBrands = async () => {
      try {
        const client = getSupabaseClient();
        const { data, error } = await client.database
          .from("auto_marca")
          .select("id, nombre")
          .order("nombre", { ascending: true });

        if (error) throw error;
        setBrands((data as DBBrand[]) || []);
      } catch (err) {
        console.error("Error loading car brands:", err);
      }
    };
    loadBrands();
  }, []);

  // Load models when brand changes
  useEffect(() => {
    if (!selectedBrandId) {
      setModels([]);
      setVersions([]);
      setSelectedModelId("");
      setSelectedVersionId("");
      return;
    }

    const loadModels = async () => {
      setIsLoading(true);
      try {
        const client = getSupabaseClient();
        const { data, error } = await client.database
          .from("auto_modelo")
          .select("id, nombre")
          .eq("marca_id", selectedBrandId)
          .order("nombre", { ascending: true });

        if (error) throw error;
        setModels((data as DBModel[]) || []);
        setVersions([]);
        setSelectedModelId("");
        setSelectedVersionId("");
      } catch (err) {
        console.error("Error loading car models:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadModels();
  }, [selectedBrandId]);

  // Load versions when model changes
  useEffect(() => {
    if (!selectedModelId) {
      setVersions([]);
      setSelectedVersionId("");
      return;
    }

    const loadVersions = async () => {
      setIsLoading(true);
      try {
        const client = getSupabaseClient();
        const { data, error } = await client.database
          .from("auto_version")
          .select("id, motorizacion, anio_desde, anio_hasta")
          .eq("modelo_id", selectedModelId)
          .order("anio_desde", { ascending: false });

        if (error) throw error;
        setVersions((data as DBVersion[]) || []);
        setSelectedVersionId("");
      } catch (err) {
        console.error("Error loading car versions:", err);
      } finally {
        setIsLoading(false);
      }
    };
    loadVersions();
  }, [selectedModelId]);

  // Add compatibility to selected list
  const handleAddFitment = () => {
    if (!selectedVersionId) return;

    // Check if already exists in selection
    if (selectedFitments.some((f) => f.id === selectedVersionId)) {
      return;
    }

    const brandName = brands.find((b) => b.id === selectedBrandId)?.nombre || "";
    const modelName = models.find((m) => m.id === selectedModelId)?.nombre || "";
    const versionObj = versions.find((v) => v.id === selectedVersionId);

    if (!versionObj) return;

    const newFitment: VehicleFitment = {
      id: selectedVersionId,
      marca: brandName,
      modelo: modelName,
      motorizacion: versionObj.motorizacion,
      anioDesde: versionObj.anio_desde,
      anioHasta: versionObj.anio_hasta || undefined,
    };

    onChange([...selectedFitments, newFitment]);
    setSelectedVersionId("");
  };

  // Remove compatibility tag
  const handleRemoveFitment = (id: string) => {
    onChange(selectedFitments.filter((f) => f.id !== id));
  };

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--surface-muted)]/20 p-4">
      <div className="flex flex-col gap-1">
        <label className="text-xs font-bold uppercase tracking-wider text-zinc-400">
          Compatibilidades con Vehículos
        </label>
        <span className="text-[11px] text-[var(--muted-foreground)]">
          Especificá qué autos llevan este repuesto (soporta múltiples asignaciones)
        </span>
      </div>

      {/* Selectors grid */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Brand */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase">Marca Auto</label>
          <select
            value={selectedBrandId}
            onChange={(e) => setSelectedBrandId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-850 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/40"
          >
            <option value="">Seleccionar marca...</option>
            {brands.map((b) => (
              <option key={b.id} value={b.id}>
                {b.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Model */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase">Modelo</label>
          <select
            value={selectedModelId}
            disabled={!selectedBrandId || isLoading}
            onChange={(e) => setSelectedModelId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-850 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/40 disabled:opacity-50"
          >
            <option value="">Seleccionar modelo...</option>
            {models.map((m) => (
              <option key={m.id} value={m.id}>
                {m.nombre}
              </option>
            ))}
          </select>
        </div>

        {/* Version */}
        <div className="flex flex-col gap-1">
          <label className="text-[10px] font-bold text-zinc-500 uppercase">Motorización / Año</label>
          <select
            value={selectedVersionId}
            disabled={!selectedModelId || isLoading}
            onChange={(e) => setSelectedVersionId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-850 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/40 disabled:opacity-50"
          >
            <option value="">Seleccionar versión...</option>
            {versions.map((v) => (
              <option key={v.id} value={v.id}>
                {v.motorizacion} ({v.anio_desde}
                {v.anio_hasta ? ` - ${v.anio_hasta}` : " +"})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Add Button */}
      <div className="flex justify-end">
        <button
          type="button"
          disabled={!selectedVersionId}
          onClick={handleAddFitment}
          className="px-3.5 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-300 transition disabled:opacity-40 flex items-center gap-1"
        >
          <span>+</span>
          <span>Asignar Vehículo</span>
        </button>
      </div>

      {/* Compatibility Tags List */}
      <div className="pt-2">
        <label className="text-[10px] font-bold text-zinc-500 uppercase block mb-2">
          Vehículos Compatibles Asignados ({selectedFitments.length})
        </label>
        {selectedFitments.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-800 p-3 text-center text-xs text-[var(--muted-foreground)]">
            Sin compatibilidades asignadas (repuesto universal o sin detallar)
          </div>
        ) : (
          <div className="flex flex-wrap gap-2">
            {selectedFitments.map((fit) => (
              <span
                key={fit.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-950/60 pl-2.5 pr-1.5 py-1 text-xs font-medium text-white transition hover:border-red-500/30 group"
              >
                <span>
                  {fit.marca} {fit.modelo} <span className="text-zinc-500">[{fit.motorizacion}]</span>
                </span>
                <button
                  type="button"
                  onClick={() => handleRemoveFitment(fit.id)}
                  className="rounded p-0.5 text-zinc-500 hover:bg-red-500/10 hover:text-red-500"
                  aria-label="Remove vehicle fitment"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
