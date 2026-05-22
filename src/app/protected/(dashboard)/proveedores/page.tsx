import { Truck, Search, Plus, BadgePercent, ShieldCheck, Clock } from "lucide-react";

export default function ProveedoresPage() {
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white flex items-center gap-2.5">
            <Truck className="w-8 h-8 text-amber-400" />
            <span>Gestión de Proveedores</span>
          </h1>
          <p className="text-sm text-zinc-400">
            Control de cuentas corrientes de fabricantes, compras mayoristas, reposiciones y remitos de mercadería.
          </p>
        </div>
        <button className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-xs font-extrabold text-black transition-all flex items-center gap-1.5 shadow-lg shadow-amber-500/10 self-start hover:scale-[1.02] duration-200">
          <Plus className="w-4 h-4" />
          <span>Nuevo Proveedor (F3)</span>
        </button>
      </div>

      {/* Overview Cards */}
      <div className="grid gap-6 sm:grid-cols-3">
        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute -inset-px bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Proveedores Activos</span>
            <ShieldCheck className="w-4 h-4 text-emerald-500" />
          </div>
          <p className="text-2xl font-black text-white">0 Proveedores</p>
          <p className="text-xs text-zinc-500 mt-1">Registrados en la base de datos.</p>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute -inset-px bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Deuda Corriente</span>
            <BadgePercent className="w-4 h-4 text-amber-500" />
          </div>
          <p className="text-2xl font-black text-amber-400">$0.00</p>
          <p className="text-xs text-zinc-500 mt-1">Saldo pendiente con proveedores.</p>
        </div>

        <div className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/20 backdrop-blur-md relative overflow-hidden group">
          <div className="absolute -inset-px bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="flex items-center justify-between pb-2 border-b border-zinc-800/60 mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-500">Remitos Pendientes</span>
            <Clock className="w-4 h-4 text-blue-500" />
          </div>
          <p className="text-2xl font-black text-white">0 Entradas</p>
          <p className="text-xs text-zinc-500 mt-1">Pendientes de control de stock y auditoría.</p>
        </div>
      </div>

      {/* Main Empty State Content */}
      <div className="relative rounded-2xl border border-zinc-800/80 bg-zinc-900/10 p-12 text-center space-y-6 backdrop-blur-xl overflow-hidden">
        {/* Radial amber glow aura */}
        <div className="absolute inset-0 flex items-center justify-center -z-10 pointer-events-none">
          <div className="w-96 h-96 bg-amber-500/5 blur-[120px] rounded-full animate-pulse" />
        </div>

        <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 text-amber-400 w-16 h-16 flex items-center justify-center mx-auto shadow-inner shadow-black group-hover:scale-110 duration-300">
          <Truck className="w-8 h-8" />
        </div>

        <div className="space-y-2 max-w-md mx-auto">
          <h2 className="text-xl font-bold text-white">Módulo de Proveedores</h2>
          <p className="text-sm text-zinc-400 leading-relaxed">
            Aquí podrás administrar las compras mayoristas, realizar órdenes de compra automáticas basadas en el stock mínimo de repuestos y controlar el ingreso de mercadería a las estanterías de depósito de forma trazable.
          </p>
        </div>

        <div className="pt-4 flex justify-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-zinc-800/60 border border-zinc-700/60 px-3 py-1 text-xs text-zinc-500 font-mono">
            <span className="w-1.5 h-1.5 bg-amber-500 rounded-full animate-pulse" />
            Integración de Remitos y Compras Mayoristas
          </span>
        </div>
      </div>
    </div>
  );
}
