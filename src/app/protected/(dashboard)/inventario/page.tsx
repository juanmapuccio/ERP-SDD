"use client";

import React, { useEffect, useState } from "react";
import { 
  Package, 
  Search, 
  Plus, 
  AlertTriangle, 
  Layers, 
  UploadCloud, 
  X, 
  TrendingUp,
  Settings,
  Trash2,
  Loader2
} from "lucide-react";
import { useInventoryStore } from "@/features/inventory/store/use-inventory-store";
import { InventoryTable } from "@/features/inventory/components/inventory-table";
import { AddPartDrawer } from "@/features/inventory/components/add-part-drawer";
import { BulkImporter } from "@/features/inventory/components/bulk-importer";
import { TaxonomyManagerDrawer } from "@/features/inventory/components/taxonomy-manager-drawer";

export default function InventarioPage() {
  const {
    articles,
    brands,
    families,
    searchQuery,
    selectedBrandId,
    selectedFamilyId,
    stockFilter,
    setSearchQuery,
    setBrandFilter,
    setFamilyFilter,
    setStockFilter,
    fetchArticles,
    fetchMetadata,
    deleteAllArticles
  } = useInventoryStore();

  // Local state to toggle filters accordion
  const [showFilters, setShowFilters] = useState(false);

  // Modal and Drawer active states
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isImporterOpen, setIsImporterOpen] = useState(false);
  const [isTaxonomyOpen, setIsTaxonomyOpen] = useState(false);
  const [selectedArticleId, setSelectedArticleId] = useState<string | null>(null);

  // Delete all confirmation state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchMetadata();
    fetchArticles();
  }, [fetchMetadata, fetchArticles]);

  // Compute local metrics
  const totalArticles = articles.length;
  const lowStockCount = articles.filter(art => art.stock_actual <= art.stock_minimo && art.stock_actual > 0).length;
  const outOfStockCount = articles.filter(art => art.stock_actual === 0).length;
  const totalValuation = articles.reduce((acc, art) => acc + (parseFloat(art.precio_costo) || 0) * art.stock_actual, 0);

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* 1. Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Inventario de Repuestos</h1>
          <p className="text-sm text-zinc-400">Control de stock, costos, marcas y familias de artículos autopartistas</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Ecosistema Taxonomía button */}
          <button 
            type="button"
            onClick={() => setIsTaxonomyOpen(true)}
            className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-zinc-400 hover:text-white transition-all flex items-center gap-1.5 shadow-lg shadow-black/10 group"
            title="Centro de Taxonomía y Ecosistema Autopartista"
          >
            <Settings className="w-4 h-4 transition-transform group-hover:rotate-45" />
          </button>

          {/* Carga masiva button */}
          <button 
            type="button"
            onClick={() => setIsImporterOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 hover:bg-zinc-800 text-xs font-bold text-zinc-300 transition-all flex items-center gap-1.5 shadow-lg shadow-black/10"
          >
            <UploadCloud className="w-4 h-4 text-zinc-400" />
            <span>Importar CSV</span>
          </button>
          
          {/* Add Part button */}
          <button 
            type="button"
            onClick={() => {
              setSelectedArticleId(null);
              setIsDrawerOpen(true);
            }}
            className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-xs font-extrabold text-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10"
          >
            <Plus className="w-4 h-4" />
            <span>Nuevo Artículo</span>
          </button>

          {/* Delete all inventory button — only visible when there are articles */}
          {totalArticles > 0 && (
            <button 
              type="button"
              onClick={() => setIsDeleteModalOpen(true)}
              className="p-2.5 rounded-xl bg-zinc-900 border border-red-900/40 hover:bg-red-950/60 hover:border-red-500/50 text-zinc-500 hover:text-red-400 transition-all flex items-center gap-1.5 shadow-lg shadow-black/10 group"
              title="Vaciar todo el inventario"
            >
              <Trash2 className="w-4 h-4 transition-transform group-hover:scale-110" />
            </button>
          )}
        </div>
      </div>

      {/* 2. KPI Cards Section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Repuestos */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Total Repuestos</span>
            <div className="rounded-lg bg-blue-500/10 p-2 text-blue-500">
              <Package className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white">{totalArticles}</span>
            <span className="ml-2 text-xs text-zinc-500">artículos en grilla</span>
          </div>
        </div>

        {/* Bajo Stock */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Bajo Stock</span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-500">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-amber-500">{lowStockCount}</span>
            <span className="ml-2 text-xs text-zinc-500">requieren reposición</span>
          </div>
        </div>

        {/* Sin Stock */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Sin Stock (Quiebre)</span>
            <div className="rounded-lg bg-red-500/10 p-2 text-red-500">
              <X className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-red-500">{outOfStockCount}</span>
            <span className="ml-2 text-xs text-zinc-500">artículos agotados</span>
          </div>
        </div>

        {/* Valoración Costo */}
        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Valoración Costo</span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-500">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-bold text-white">
              ${totalValuation.toLocaleString("es-AR", { maximumFractionDigits: 0 })}
            </span>
            <span className="ml-2 text-xs text-zinc-500">capital en stock</span>
          </div>
        </div>
      </div>

      {/* 3. Search and Quick Filters Bar */}
      <div className="space-y-4 rounded-xl border border-zinc-800 bg-zinc-900/20 p-4 backdrop-blur-xl">
        <div className="flex flex-col md:flex-row md:items-center gap-4">
          {/* Main search bar */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por código de barras, código fabricante, descripción, marcas de auto..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-zinc-950 border border-zinc-850 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-amber-500/40 transition-colors"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-0.5 hover:bg-zinc-800 text-zinc-400"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Stock filters */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setStockFilter("all")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
                stockFilter === "all"
                  ? "bg-zinc-800 border-zinc-700 text-white"
                  : "bg-zinc-900/50 border-zinc-850 text-zinc-400 hover:bg-zinc-850"
              }`}
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("normal")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
                stockFilter === "normal"
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-400"
                  : "bg-zinc-900/50 border-zinc-850 text-zinc-400 hover:bg-zinc-850"
              }`}
            >
              Stock Normal
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("low")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
                stockFilter === "low"
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-zinc-900/50 border-zinc-850 text-zinc-400 hover:bg-zinc-850"
              }`}
            >
              Stock Bajo
            </button>
            <button
              type="button"
              onClick={() => setStockFilter("none")}
              className={`px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
                stockFilter === "none"
                  ? "bg-red-500/10 border-red-500/30 text-red-400"
                  : "bg-zinc-900/50 border-zinc-850 text-zinc-400 hover:bg-zinc-850"
              }`}
            >
              Agotados
            </button>

            {/* Brands/Families toggle */}
            <button
              type="button"
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg text-xs font-semibold border transition ${
                showFilters || selectedBrandId || selectedFamilyId
                  ? "bg-amber-500/10 border-amber-500/30 text-amber-400"
                  : "bg-zinc-900/50 border-zinc-850 text-zinc-400 hover:bg-zinc-850"
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Categorías</span>
            </button>
          </div>
        </div>

        {/* 4. Expanded Filter Accordion (Brands / Families Dropdowns) */}
        {(showFilters || selectedBrandId || selectedFamilyId) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-zinc-800/50 animate-fade-in">
            {/* Brand filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Filtrar por Marca</label>
              <select
                value={selectedBrandId || ""}
                onChange={(e) => setBrandFilter(e.target.value || null)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-850 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/40"
              >
                <option value="">Todas las marcas de repuestos</option>
                {brands.map((br) => (
                  <option key={br.id} value={br.id}>
                    {br.nombre} {br.pais_origen ? `(${br.pais_origen})` : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Family filter */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase tracking-wider text-zinc-500">Filtrar por Rubro/Familia</label>
              <select
                value={selectedFamilyId || ""}
                onChange={(e) => setFamilyFilter(e.target.value || null)}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-850 text-xs text-zinc-300 focus:outline-none focus:border-amber-500/40"
              >
                <option value="">Todas las familias de repuestos</option>
                {families.map((fa) => (
                  <option key={fa.id} value={fa.id}>
                    {fa.nombre}
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 5. Inventory Table Section */}
      <InventoryTable 
        onEditArticle={(id) => {
          setSelectedArticleId(id);
          setIsDrawerOpen(true);
        }} 
      />

      {/* 6. Form Drawer and CSV Importer Modals */}
      <AddPartDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
        articleId={selectedArticleId}
      />

      <BulkImporter 
        isOpen={isImporterOpen} 
        onClose={() => setIsImporterOpen(false)} 
      />

      <TaxonomyManagerDrawer
        isOpen={isTaxonomyOpen}
        onClose={() => setIsTaxonomyOpen(false)}
      />

      {/* 7. Delete All Confirmation Modal */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md mx-4 rounded-2xl border border-red-900/50 bg-zinc-950 p-6 shadow-2xl shadow-red-500/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="rounded-xl bg-red-500/10 p-3">
                <AlertTriangle className="w-6 h-6 text-red-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Vaciar Inventario</h3>
                <p className="text-xs text-zinc-400">Esta acción es irreversible</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 mb-1">
              Estás a punto de eliminar <strong className="text-red-400">{totalArticles} artículo{totalArticles !== 1 ? 's' : ''}</strong> del inventario.
              Las marcas y familias de repuestos NO serán afectadas.
            </p>
            <p className="text-xs text-zinc-500 mb-4">
              Escribí <strong className="text-red-400 font-mono">BORRAR</strong> para confirmar.
            </p>

            <input
              type="text"
              value={deleteConfirmText}
              onChange={(e) => setDeleteConfirmText(e.target.value)}
              placeholder="Escribí BORRAR aquí..."
              className="w-full px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-sm text-white placeholder-zinc-600 focus:outline-none focus:border-red-500/50 mb-4 font-mono"
              autoFocus
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setDeleteConfirmText("");
                }}
                disabled={isDeleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-xs font-bold text-zinc-400 hover:bg-zinc-800 transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={deleteConfirmText !== "BORRAR" || isDeleting}
                onClick={async () => {
                  setIsDeleting(true);
                  try {
                    await deleteAllArticles();
                    setIsDeleteModalOpen(false);
                    setDeleteConfirmText("");
                  } catch (err) {
                    console.error("Failed to delete all articles:", err);
                  } finally {
                    setIsDeleting(false);
                  }
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 disabled:bg-zinc-800 disabled:text-zinc-600 text-xs font-extrabold text-white transition-all flex items-center justify-center gap-2"
              >
                {isDeleting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Eliminando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Eliminar Todo</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
