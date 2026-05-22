"use client";

import React, { useState } from "react";
import { useInventoryStore, Article } from "@/features/inventory/store/use-inventory-store";
import { 
  Edit2, 
  Check, 
  X, 
  Sparkles, 
  Trash2, 
  Layers, 
  ChevronRight, 
  AlertTriangle,
  Sliders,
  CheckSquare,
  Square,
  Loader2
} from "lucide-react";

interface InventoryTableProps {
  onEditArticle: (articleId: string) => void;
}

export function InventoryTable({ onEditArticle }: InventoryTableProps) {
  const { articles, isLoading, updateStock, updateStockMinimo, updateStockMinimoBulk } = useInventoryStore();
  
  // Selection mode toggle
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Stock Actual editing states
  const [editingStockId, setEditingStockId] = useState<string | null>(null);
  const [tempStockValue, setTempStockValue] = useState<string>("");
  
  // Stock Mínimo editing states
  const [editingMinStockId, setEditingMinStockId] = useState<string | null>(null);
  const [tempMinStockValue, setTempMinStockValue] = useState<string>("");
  
  // Selection states
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Bulk action states
  const [bulkMinStock, setBulkMinStock] = useState<string>("");
  const [isBulkApplying, setIsBulkApplying] = useState(false);
  
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Trigger inline stock save
  const handleSaveStock = async (id: string) => {
    const val = parseInt(tempStockValue, 10);
    if (isNaN(val) || val < 0) {
      setEditingStockId(null);
      return;
    }
    setUpdatingId(id);
    try {
      await updateStock(id, val);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
      setEditingStockId(null);
    }
  };

  const handleStockClick = (id: string, currentStock: number) => {
    setEditingStockId(id);
    setTempStockValue(currentStock.toString());
  };

  const handleStockIncrement = async (id: string, currentStock: number, diff: number) => {
    const newVal = Math.max(0, currentStock + diff);
    setUpdatingId(id);
    try {
      await updateStock(id, newVal);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Trigger inline stock minimo save
  const handleSaveMinStock = async (id: string) => {
    const val = parseInt(tempMinStockValue, 10);
    if (isNaN(val) || val < 0) {
      setEditingMinStockId(null);
      return;
    }
    setUpdatingId(id);
    try {
      await updateStockMinimo(id, val);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
      setEditingMinStockId(null);
    }
  };

  const handleMinStockClick = (id: string, currentMinStock: number) => {
    setEditingMinStockId(id);
    setTempMinStockValue(currentMinStock.toString());
  };

  const handleMinStockIncrement = async (id: string, currentMinStock: number, diff: number) => {
    const newVal = Math.max(0, currentMinStock + diff);
    setUpdatingId(id);
    try {
      await updateStockMinimo(id, newVal);
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingId(null);
    }
  };

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(articles.map((art) => art.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectOne = (id: string, checked: boolean) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((x) => x !== id));
    }
  };

  // Bulk Apply Handler
  const handleBulkApplyMinStock = async () => {
    const val = parseInt(bulkMinStock, 10);
    if (isNaN(val) || val < 0) return;
    setIsBulkApplying(true);
    try {
      await updateStockMinimoBulk(selectedIds, val);
      setSelectedIds([]);
      setBulkMinStock("");
      setIsSelectionMode(false); // Auto exit selection mode upon successful apply
    } catch (err) {
      console.error(err);
    } finally {
      setIsBulkApplying(false);
    }
  };

  if (isLoading && articles.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-950 p-8 shadow-inner shadow-black/50">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-amber-500 border-t-transparent"></div>
          <span className="text-sm text-zinc-400 font-medium">Cargando catálogo de repuestos...</span>
        </div>
      </div>
    );
  }

  if (articles.length === 0) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-4 rounded-xl border border-zinc-800 bg-zinc-950/40 p-8 text-center backdrop-blur-xl">
        <div className="rounded-2xl bg-zinc-900 border border-zinc-850 p-4 text-zinc-500">
          <Layers className="w-8 h-8" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">No se encontraron artículos</h3>
          <p className="mt-1 text-xs text-zinc-500">
            Ajustá los filtros de búsqueda o cargá un nuevo repuesto.
          </p>
        </div>
      </div>
    );
  }

  const allSelected = articles.length > 0 && selectedIds.length === articles.length;
  const someSelected = selectedIds.length > 0 && selectedIds.length < articles.length;

  return (
    <div className="relative space-y-4">
      {/* Barra superior de control de la tabla */}
      <div className="flex items-center justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => {
              const nextMode = !isSelectionMode;
              setIsSelectionMode(nextMode);
              if (!nextMode) setSelectedIds([]);
            }}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2 text-xs font-bold transition-all shadow-md active:scale-95 ${
              isSelectionMode
                ? "bg-amber-500/10 border-amber-500/35 text-amber-400 hover:bg-amber-500/20"
                : "bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
            }`}
          >
            <CheckSquare className={`w-4 h-4 transition-transform ${isSelectionMode ? "scale-110" : ""}`} />
            <span>{isSelectionMode ? "Salir de Selección" : "Selección Masiva"}</span>
          </button>

          {isSelectionMode && (
            <span className="text-xs text-zinc-500 font-semibold animate-fade-in">
              Habilitado: Hacé clic en los checkboxes para editar en lote
            </span>
          )}
        </div>

        <div className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
          {articles.length} repuesto{articles.length !== 1 ? "s" : ""}
        </div>
      </div>

      {/* Grilla principal */}
      <div className="overflow-x-auto rounded-xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/55">
        <table className="w-full border-collapse text-left text-sm">
          <thead className="border-b border-zinc-850 bg-zinc-900/60 text-[10px] font-bold text-zinc-400 uppercase tracking-widest sticky top-0 backdrop-blur-md">
            <tr>
              {/* Select All Checkbox Column */}
              {isSelectionMode && (
                <th className="px-4 py-4 w-10 text-center animate-fade-in">
                  <label className="relative flex items-center justify-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      ref={(el) => {
                        if (el) el.indeterminate = someSelected;
                      }}
                      onChange={handleSelectAll}
                      className="sr-only peer"
                    />
                    <div className="w-4 h-4 rounded border border-zinc-700 bg-zinc-950 peer-checked:bg-amber-500 peer-checked:border-amber-600 flex items-center justify-center transition-all peer-checked:scale-105">
                      {allSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                      {!allSelected && someSelected && <div className="w-2 h-0.5 bg-amber-500 rounded" />}
                    </div>
                  </label>
                </th>
              )}
              <th className="px-4 py-4">Código / SKU</th>
              <th className="px-4 py-4">Descripción</th>
              <th className="px-4 py-4">Marca / Rubro</th>
              <th className="px-4 py-4 text-right">Costo</th>
              <th className="px-4 py-4 text-right">P. Minorista</th>
              <th className="px-4 py-4 text-right">Margen</th>
              <th className="px-4 py-4 text-center">Stock Mín.</th>
              <th className="px-4 py-4 text-center">Stock</th>
              <th className="px-4 py-4 text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-850 bg-zinc-950/20">
            {articles.map((art) => {
              const costo = parseFloat(art.precio_costo) || 0;
              const minorista = parseFloat(art.precio_minorista) || 0;
              const margen = costo > 0 ? ((minorista - costo) / costo) * 100 : 0;
              const isSelected = selectedIds.includes(art.id);

              // Determine stock level style
              let stockBadgeClass = "bg-emerald-500/10 text-emerald-400 border-emerald-500/20";
              if (art.stock_actual === 0) {
                stockBadgeClass = "bg-red-500/10 text-red-400 border-red-500/20";
              } else if (art.stock_actual <= art.stock_minimo) {
                stockBadgeClass = "bg-amber-500/10 text-amber-400 border-amber-500/20";
              }

              return (
                <tr
                  key={art.id}
                  className={`transition hover:bg-zinc-900/35 group ${
                    isSelected && isSelectionMode ? "bg-amber-500/[0.02]" : ""
                  } ${updatingId === art.id ? "opacity-60" : ""}`}
                >
                  {/* Select One Checkbox Column */}
                  {isSelectionMode && (
                    <td className="px-4 py-3.5 text-center animate-fade-in">
                      <label className="relative flex items-center justify-center cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => handleSelectOne(art.id, e.target.checked)}
                          className="sr-only peer"
                        />
                        <div className="w-4 h-4 rounded border border-zinc-800 bg-zinc-950 peer-checked:bg-amber-500 peer-checked:border-amber-600 flex items-center justify-center transition-all peer-checked:scale-105 group-hover:border-zinc-600">
                          {isSelected && <Check className="w-3 h-3 text-black stroke-[3]" />}
                        </div>
                      </label>
                    </td>
                  )}

                  {/* SKU */}
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <span className="inline-flex rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs font-bold font-mono text-white">
                      {art.codigo_fabricante}
                    </span>
                  </td>

                  {/* Description */}
                  <td className="px-4 py-3.5 min-w-[240px]">
                    <div className="font-semibold text-zinc-100 group-hover:text-white transition-colors">
                      {art.descripcion}
                    </div>
                    {art.ubicacion_deposito && (
                      <div className="mt-1 text-xs text-zinc-500 flex items-center gap-1">
                        <span className="text-zinc-600">📍 Ubicación:</span>
                        <span className="font-semibold text-zinc-400">{art.ubicacion_deposito}</span>
                      </div>
                    )}
                  </td>

                  {/* Brand & Category */}
                  <td className="whitespace-nowrap px-4 py-3.5">
                    <div className="flex flex-col gap-1.5">
                      <span className="inline-flex max-w-fit items-center rounded-full bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-bold text-blue-400 border border-blue-500/25">
                        {art.marca?.nombre || "Sin marca"}
                      </span>
                      <span className="text-xs text-zinc-500 font-medium">
                        {art.familia?.nombre || "Sin rubro"}
                      </span>
                    </div>
                  </td>

                  {/* Prices */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono font-semibold text-zinc-400">
                    ${costo.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono font-bold text-zinc-200">
                    ${minorista.toLocaleString("es-AR", { minimumFractionDigits: 2 })}
                  </td>

                  {/* Markup Percentage */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-mono text-xs">
                    <span
                      className={`inline-flex rounded px-1.5 py-0.5 font-bold ${
                        margen >= 35
                          ? "bg-emerald-500/15 text-emerald-400"
                          : margen >= 20
                          ? "bg-blue-500/15 text-blue-400"
                          : "bg-amber-500/15 text-amber-400"
                      }`}
                    >
                      +{margen.toFixed(0)}%
                    </span>
                  </td>

                  {/* Stock Mínimo (Márgenes) editable */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5 opacity-80 hover:opacity-100 transition-opacity">
                      {/* Decrement */}
                      <button
                        type="button"
                        disabled={updatingId === art.id || art.stock_minimo <= 0}
                        onClick={() => handleMinStockIncrement(art.id, art.stock_minimo, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition disabled:opacity-30 disabled:hover:bg-zinc-900"
                      >
                        -
                      </button>

                      {/* Input / Badge */}
                      {editingMinStockId === art.id ? (
                        <input
                          type="number"
                          min="0"
                          value={tempMinStockValue}
                          onChange={(e) => setTempMinStockValue(e.target.value)}
                          onBlur={() => handleSaveMinStock(art.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveMinStock(art.id);
                            if (e.key === "Escape") setEditingMinStockId(null);
                          }}
                          autoFocus
                          className="h-7 w-12 rounded border border-amber-500/70 bg-zinc-900 text-center text-xs font-bold font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <span
                          onClick={() => handleMinStockClick(art.id, art.stock_minimo)}
                          className="inline-flex min-w-[32px] cursor-pointer rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 px-2 py-0.5 text-center text-xs font-bold font-mono text-zinc-300 transition hover:scale-105 hover:bg-zinc-850"
                          title="Click para ajustar individualmente"
                        >
                          {art.stock_minimo}
                        </span>
                      )}

                      {/* Increment */}
                      <button
                        type="button"
                        disabled={updatingId === art.id}
                        onClick={() => handleMinStockIncrement(art.id, art.stock_minimo, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </td>

                  {/* Stock Actual Controls */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {/* Decrement */}
                      <button
                        type="button"
                        disabled={updatingId === art.id || art.stock_actual <= 0}
                        onClick={() => handleStockIncrement(art.id, art.stock_actual, -1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition disabled:opacity-30 disabled:hover:bg-zinc-900"
                      >
                        -
                      </button>

                      {/* Stock Value / Input */}
                      {editingStockId === art.id ? (
                        <input
                          type="number"
                          min="0"
                          value={tempStockValue}
                          onChange={(e) => setTempStockValue(e.target.value)}
                          onBlur={() => handleSaveStock(art.id)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleSaveStock(art.id);
                            if (e.key === "Escape") setEditingStockId(null);
                          }}
                          autoFocus
                          className="h-7 w-12 rounded border border-amber-500/70 bg-zinc-900 text-center text-xs font-bold font-mono text-white focus:outline-none focus:ring-1 focus:ring-amber-500/50 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                      ) : (
                        <span
                          onClick={() => handleStockClick(art.id, art.stock_actual)}
                          className={`inline-flex min-w-[32px] cursor-pointer rounded-full border px-2 py-0.5 text-center text-xs font-extrabold font-mono transition hover:scale-105 ${stockBadgeClass}`}
                          title="Click para ajustar stock"
                        >
                          {art.stock_actual}
                        </span>
                      )}

                      {/* Increment */}
                      <button
                        type="button"
                        disabled={updatingId === art.id}
                        onClick={() => handleStockIncrement(art.id, art.stock_actual, 1)}
                        className="flex h-6 w-6 items-center justify-center rounded border border-zinc-800 bg-zinc-900 text-xs font-bold text-zinc-400 hover:bg-zinc-800 hover:text-white transition disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>
                  </td>

                  {/* Action Buttons */}
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <button
                      type="button"
                      onClick={() => onEditArticle(art.id)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 hover:border-zinc-700 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:text-white transition-all shadow-md hover:shadow-black/20"
                    >
                      <Edit2 className="w-3 h-3 text-zinc-500 group-hover:text-amber-400 transition-colors" />
                      <span>Ficha</span>
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Barra flotante de acciones masivas (Bulk Actions Bar) */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[90] w-full max-w-lg px-4 transition-all duration-350 transform ${
          selectedIds.length > 0 && isSelectionMode
            ? "translate-y-0 opacity-100 pointer-events-auto" 
            : "translate-y-12 opacity-0 pointer-events-none"
        }`}
      >
        <div className="rounded-2xl border border-zinc-850 bg-zinc-950/80 p-4 shadow-2xl shadow-black/90 backdrop-blur-xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20 animate-pulse">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs font-extrabold text-white uppercase tracking-wider">Acción Masiva</div>
              <div className="text-[11px] text-zinc-400 font-semibold">
                <span className="text-amber-400">{selectedIds.length}</span> seleccionados
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-1 justify-end">
            <div className="relative w-28">
              <input
                type="number"
                min="0"
                value={bulkMinStock}
                onChange={(e) => setBulkMinStock(e.target.value)}
                placeholder="Stock Mín..."
                disabled={isBulkApplying}
                className="w-full px-3 py-1.5 rounded-lg bg-zinc-900 border border-zinc-800 text-xs font-bold font-mono text-white placeholder-zinc-600 focus:outline-none focus:border-amber-500/40 focus:ring-1 focus:ring-amber-500/30"
              />
            </div>

            <button
              type="button"
              disabled={bulkMinStock === "" || isBulkApplying}
              onClick={handleBulkApplyMinStock}
              className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-xs font-extrabold text-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10 disabled:opacity-40 disabled:from-zinc-800 disabled:to-zinc-800 disabled:text-zinc-500"
            >
              {isBulkApplying ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Aplicando...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Aplicar</span>
                </>
              )}
            </button>

            {/* Clear Selection */}
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              disabled={isBulkApplying}
              className="p-1.5 rounded-lg bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all"
              title="Cancelar selección"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
