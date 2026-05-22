"use client";

import { useEffect } from "react";
import { useCajaStore } from "@/features/caja/caja-store";
import type { CajaSession, CajaMovimiento } from "@/features/caja/caja-store";
import { CajaAbiertaView } from "./caja-abierta-view";
import { CajaCerradaView } from "./caja-cerrada-view";

interface CajaShellProps {
  initialSession: CajaSession | null;
  initialMovimientos: CajaMovimiento[];
  userId: string;
}

export function CajaShell({ initialSession, initialMovimientos, userId }: CajaShellProps) {
  const activeSession = useCajaStore((s) => s.activeSession);
  const movimientos = useCajaStore((s) => s.movimientos);
  const setSession = useCajaStore((s) => s.setSession);
  const setMovimientos = useCajaStore((s) => s.setMovimientos);

  // Sync server-fetched data into Zustand on mount
  useEffect(() => {
    setSession(initialSession);
    setMovimientos(initialMovimientos);
  }, [initialSession, initialMovimientos, setSession, setMovimientos]);

  if (activeSession && activeSession.estado === "abierta") {
    return <CajaAbiertaView session={activeSession} movimientos={movimientos} />;
  }

  return <CajaCerradaView userId={userId} />;
}
