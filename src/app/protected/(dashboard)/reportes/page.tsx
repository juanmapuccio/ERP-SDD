import { TrendingUp, FileSpreadsheet, Download, RefreshCw, BarChart2 } from "lucide-react";

export default function ReportesPage() {
  return (
    <div className="space-y-8 animate-fade-in-up">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-800/60 pb-6">
        <div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">Reportes y Estadísticas</h1>
          <p className="text-sm text-zinc-400">Descarga de IVA Ventas/Compras, libro digital AFIP y análisis de rentabilidad</p>
        </div>
        <button className="px-4 py-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 hover:bg-zinc-800 text-xs font-bold text-zinc-300 transition-all flex items-center gap-1.5 shrink-0 self-start">
          <RefreshCw className="w-4 h-4" />
          <span>Actualizar Datos</span>
        </button>
      </div>

      {/* Report Cards Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            title: "IVA Ventas AFIP",
            desc: "Archivos .TXT comprimidos listos para importar en el portal de AFIP (Libro de IVA Digital).",
            type: "AFIP / Fiscal",
          },
          {
            title: "Ranking de Repuestos",
            desc: "Análisis de artículos con mayor rotación, marcas más vendidas y rentabilidad por familia.",
            type: "Comercial",
          },
          {
            title: "Cuentas Corrientes",
            desc: "Detalle de saldos pendientes de clientes, vencimientos y antigüedad de deuda acumulada.",
            type: "Financiero",
          },
        ].map((rep) => (
          <div
            key={rep.title}
            className="p-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 space-y-4 flex flex-col justify-between"
          >
            <div className="space-y-2">
              <span className="inline-block rounded bg-zinc-800 border border-zinc-700/60 px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-zinc-400">
                {rep.type}
              </span>
              <h3 className="text-lg font-bold text-white">{rep.title}</h3>
              <p className="text-xs text-zinc-400 leading-normal">{rep.desc}</p>
            </div>
            <button className="w-full mt-4 py-2 rounded-xl bg-zinc-850 border border-zinc-800 text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5">
              <Download className="w-3.5 h-3.5" /> Descargar Excel
            </button>
          </div>
        ))}
      </div>

      {/* Premium Placeholder State */}
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/10 p-12 text-center space-y-4 backdrop-blur-xl">
        <div className="p-4 rounded-full bg-zinc-900 border border-zinc-800 text-amber-500 w-16 h-16 flex items-center justify-center mx-auto shadow-inner shadow-black">
          <BarChart2 className="w-8 h-8" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <h2 className="text-xl font-bold text-white">Análisis de Negocios</h2>
          <p className="text-sm text-zinc-400 leading-normal">
            Aquí vas a disponer de gráficos analíticos sobre márgenes brutos, facturación diaria consolidada y descargas de IVA listas para tu estudio contable.
          </p>
        </div>
      </div>
    </div>
  );
}
