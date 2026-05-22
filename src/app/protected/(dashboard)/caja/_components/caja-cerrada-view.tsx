"use client";

import { useState } from "react";
import { DollarSign } from "lucide-react";
import { openCaja } from "@/features/caja/caja-actions";
import { useCajaStore } from "@/features/caja/caja-store";

interface CajaCerradaViewProps {
  userId: string;
}

export function CajaCerradaView({ userId }: CajaCerradaViewProps) {
  const [montoInicial, setMontoInicial] = useState("0");
  const [notas, setNotas] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const setSession = useCajaStore((s) => s.setSession);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const val = montoInicial.trim();
    const monto = val === "" ? 0 : parseFloat(val);

    if (isNaN(monto) || monto < 0) {
      setErrorMsg("Ingresá un monto inicial válido (mayor o igual a 0).");
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const res = await openCaja(userId, monto, notas || undefined);

    if (res.error) {
      setErrorMsg(res.error);
    } else if (res.data) {
      setSession(res.data);
    }

    setIsSubmitting(false);
  };

  return (
    <div className="flex items-center justify-center min-h-[480px]">
      <div className="rounded-2xl border border-zinc-800/80 bg-zinc-900/20 p-8 w-full max-w-md shadow-xl backdrop-blur-xl">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-zinc-900 border border-zinc-800 text-amber-500 shadow-inner shadow-black">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Caja Diaria Cerrada</h2>
            <p className="text-[11px] text-zinc-500">Sin sesión activa para esta sucursal</p>
          </div>
        </div>

        <p className="text-sm text-zinc-400 mb-6 leading-relaxed">
          Ingresá el saldo en efectivo disponible en el cajón físico para iniciar la jornada.
        </p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Monto Inicial en Efectivo ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={montoInicial}
              onChange={(e) => setMontoInicial(e.target.value)}
              placeholder="0.00"
              disabled={isSubmitting}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-3 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-amber-500/50 text-lg font-mono tabular-nums transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-zinc-500 mb-2">
              Notas de Apertura (Opcional)
            </label>
            <textarea
              value={notas}
              onChange={(e) => setNotas(e.target.value)}
              placeholder="Ej. Billetes de cambio, caja chica habitual..."
              disabled={isSubmitting}
              rows={3}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-4 py-2.5 text-zinc-100 placeholder-zinc-700 focus:outline-none focus:border-amber-500/50 text-sm transition-colors resize-none"
            />
          </div>

          {errorMsg && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs p-3 leading-relaxed">
              {errorMsg}
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full rounded-xl bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-500 hover:to-amber-700 text-black font-extrabold text-sm py-3 transition-all uppercase tracking-wider flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-amber-500/10"
          >
            {isSubmitting ? (
              <span className="inline-block w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
            ) : (
              "Abrir Caja Diaria"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
