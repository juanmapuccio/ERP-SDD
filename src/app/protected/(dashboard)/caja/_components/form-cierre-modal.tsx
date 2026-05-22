"use client";

import { useState, useEffect } from "react";
import { closeCaja } from "@/features/caja/caja-actions";
import { useCajaStore } from "@/features/caja/caja-store";

interface FormCierreModalProps {
  sesionId: string;
  montoTeorico: number;
  onClose: () => void;
}

interface Denomination {
  value: number;
  count: number;
}

export function FormCierreModal({ sesionId, montoTeorico, onClose }: FormCierreModalProps) {
  const [denominations, setDenominations] = useState<Denomination[]>([
    { value: 20000, count: 0 },
    { value: 10000, count: 0 },
    { value: 2000, count: 0 },
    { value: 1000, count: 0 },
    { value: 500, count: 0 },
    { value: 200, count: 0 },
    { value: 100, count: 0 },
  ]);
  const [montoMonedas, setMontoMonedas] = useState("");
  const [montoOtros, setMontoOtros] = useState("");
  const [montoRealDeclarado, setMontoRealDeclarado] = useState(0);
  const [notas, setNotas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const setSession = useCajaStore((s) => s.setSession);

  useEffect(() => {
    const totalBilletes = denominations.reduce((sum, d) => sum + d.value * d.count, 0);
    setMontoRealDeclarado(totalBilletes + (parseFloat(montoMonedas) || 0) + (parseFloat(montoOtros) || 0));
  }, [denominations, montoMonedas, montoOtros]);

  const handleDenominationChange = (value: number, countStr: string) => {
    const count = parseInt(countStr) || 0;
    if (count < 0) return;
    setDenominations((prev) => prev.map((d) => (d.value === value ? { ...d, count } : d)));
  };

  const difference = montoRealDeclarado - montoTeorico;

  const fmt = (n: number) =>
    n.toLocaleString("es-AR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await closeCaja(sesionId, montoRealDeclarado, notas || undefined);

    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.data) {
      setSession(res.data);
      onClose();
    }

    setIsSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900 w-full max-w-2xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-zinc-800/60 px-6 py-4">
          <div>
            <h3 className="text-sm font-bold uppercase tracking-widest text-zinc-100">
              Arqueo de Caja y Cierre Diario
            </h3>
            <p className="text-[10px] text-zinc-500 font-mono mt-0.5">
              Sesión: {sesionId.substring(0, 8)}…
            </p>
          </div>
          <button onClick={onClose} className="text-zinc-500 hover:text-zinc-300 text-xl leading-none transition-colors">
            &times;
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Bill breakdown */}
            <div>
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400 mb-3">
                Desglose de Billetes (ARS)
              </h4>
              <div className="space-y-2 max-h-[320px] overflow-y-auto rounded-xl border border-zinc-800/80 p-3 bg-zinc-950">
                {denominations.map((d) => (
                  <div key={d.value} className="flex items-center justify-between border-b border-zinc-800/40 last:border-b-0 pb-2 last:pb-0">
                    <span className="text-sm font-mono text-zinc-300 w-20 tabular-nums">
                      $ {d.value.toLocaleString("es-AR")}
                    </span>
                    <span className="text-xs text-zinc-600">×</span>
                    <input
                      type="number"
                      min="0"
                      value={d.count === 0 ? "" : d.count}
                      onChange={(e) => handleDenominationChange(d.value, e.target.value)}
                      placeholder="0"
                      className="w-20 rounded-lg border border-zinc-800 bg-zinc-900 px-2 py-1 text-center font-mono text-zinc-100 text-sm focus:outline-none focus:border-amber-500/50 tabular-nums"
                    />
                    <span className="text-sm font-mono text-zinc-500 w-28 text-right tabular-nums">
                      $ {(d.value * d.count).toLocaleString("es-AR")}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Coins, others, and balance */}
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-zinc-400">
                Monedas y Otros Valores
              </h4>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Monedas ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={montoMonedas}
                    onChange={(e) => setMontoMonedas(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-500/50 tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">Vouchers ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={montoOtros}
                    onChange={(e) => setMontoOtros(e.target.value)}
                    placeholder="0.00"
                    className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm font-mono text-zinc-100 focus:outline-none focus:border-amber-500/50 tabular-nums"
                  />
                </div>
              </div>

              {/* Balance indicator */}
              <div className="rounded-xl border border-zinc-800/80 p-4 bg-zinc-950/50 space-y-2.5">
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Balance Teórico:</span>
                  <span className="font-mono text-zinc-300 tabular-nums">$ {fmt(montoTeorico)}</span>
                </div>
                <div className="flex items-center justify-between text-xs text-zinc-400">
                  <span>Efectivo Físico Arqueado:</span>
                  <span className="font-mono text-zinc-300 font-semibold tabular-nums">$ {fmt(montoRealDeclarado)}</span>
                </div>
                <div className="border-t border-zinc-800/60 pt-2 flex items-center justify-between text-sm">
                  <span className="font-bold text-zinc-100">Diferencia:</span>
                  <span
                    className={`font-mono font-black tabular-nums ${
                      difference === 0 ? "text-emerald-400" : difference > 0 ? "text-sky-400" : "text-red-400"
                    }`}
                  >
                    {difference > 0 ? "+" : ""}
                    {fmt(difference)}
                  </span>
                </div>
              </div>

              {difference !== 0 && (
                <div
                  className={`text-[10px] p-2.5 border rounded-xl leading-relaxed ${
                    difference < 0
                      ? "bg-red-500/10 border-red-500/20 text-red-400"
                      : "bg-sky-500/10 border-sky-500/20 text-sky-400"
                  }`}
                >
                  {difference < 0 ? (
                    <>⚠️ <strong>Faltante:</strong> Se generará un gasto por <strong>${fmt(Math.abs(difference))}</strong>.</>
                  ) : (
                    <>⚠️ <strong>Sobrante:</strong> Se registrará un ingreso por <strong>${fmt(Math.abs(difference))}</strong>.</>
                  )}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold uppercase text-zinc-500 mb-1">
                  Comentarios del arqueo
                </label>
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Justificar diferencias o aclarar novedades..."
                  rows={2}
                  className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-xs text-zinc-100 focus:outline-none focus:border-amber-500/50 resize-none"
                />
              </div>
            </div>
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3">
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800/60">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl border border-zinc-800 text-xs font-bold text-zinc-400 hover:bg-zinc-800 transition-all disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-xs font-extrabold text-white transition-all flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Confirmar Arqueo y Cerrar"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
