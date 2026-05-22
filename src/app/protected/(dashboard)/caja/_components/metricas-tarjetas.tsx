"use client";

import { DollarSign, ArrowUpRight, ArrowDownRight, Coins } from "lucide-react";
import type { CajaSession, CajaMovimiento } from "@/features/caja/caja-store";

interface MetricasTarjetasProps {
  session: CajaSession;
  movimientos: CajaMovimiento[];
}

export function MetricasTarjetas({ session, movimientos }: MetricasTarjetasProps) {
  const montoInicial = Number(session.monto_inicial);

  const totalIngresos = movimientos
    .filter((m) => m.tipo === "ingreso")
    .reduce((sum, m) => sum + Number(m.monto), 0);

  const totalEgresos = movimientos
    .filter((m) => m.tipo === "egreso")
    .reduce((sum, m) => sum + Number(m.monto), 0);

  const montoTeorico = montoInicial + totalIngresos - totalEgresos;

  const fmt = (n: number) =>
    n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  return (
    <div className="grid gap-6 sm:grid-cols-4">
      {/* Saldo Inicial */}
      <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/20 space-y-2">
        <div className="flex justify-between items-center text-zinc-500 text-xs font-bold uppercase tracking-wider">
          <span>Saldo Inicial</span>
          <DollarSign className="w-4 h-4" />
        </div>
        <p className="text-2xl font-black text-white tabular-nums">${fmt(montoInicial)}</p>
        <p className="text-xs text-zinc-500">
          Apertura: {new Date(session.fecha_apertura).toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit" })} hs
        </p>
      </div>

      {/* Ingresos */}
      <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/20 space-y-2">
        <div className="flex justify-between items-center text-zinc-500 text-xs font-bold uppercase tracking-wider">
          <span>Total Ingresos</span>
          <ArrowUpRight className="w-4 h-4 text-emerald-500" />
        </div>
        <p className="text-2xl font-black text-emerald-400 tabular-nums">+${fmt(totalIngresos)}</p>
        <p className="text-xs text-zinc-400">
          {movimientos.filter((m) => m.tipo === "ingreso").length} movimiento(s)
        </p>
      </div>

      {/* Egresos */}
      <div className="p-6 rounded-2xl border border-zinc-800/80 bg-zinc-900/20 space-y-2">
        <div className="flex justify-between items-center text-zinc-500 text-xs font-bold uppercase tracking-wider">
          <span>Total Egresos</span>
          <ArrowDownRight className="w-4 h-4 text-red-500" />
        </div>
        <p className="text-2xl font-black text-red-400 tabular-nums">-${fmt(totalEgresos)}</p>
        <p className="text-xs text-zinc-400">
          {movimientos.filter((m) => m.tipo === "egreso").length} movimiento(s)
        </p>
      </div>

      {/* Saldo Teórico */}
      <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 space-y-2">
        <div className="flex justify-between items-center text-amber-500 text-xs font-bold uppercase tracking-wider">
          <span>Saldo Teórico</span>
          <Coins className="w-4 h-4" />
        </div>
        <p className="text-2xl font-black text-amber-400 tabular-nums">${fmt(montoTeorico)}</p>
        <p className="text-xs text-zinc-400">Balance en tiempo real</p>
      </div>
    </div>
  );
}
