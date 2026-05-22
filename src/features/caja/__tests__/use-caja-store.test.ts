import { describe, it, expect, beforeEach } from "vitest";
import { useCajaStore } from "../caja-store";

describe("Caja Zustand Store Tests", () => {
  beforeEach(() => {
    // Reset state before each test
    useCajaStore.getState().clearSession();
  });

  it("should initialize with default empty values", () => {
    const state = useCajaStore.getState();
    expect(state.activeSession).toBeNull();
    expect(state.movimientos).toEqual([]);
    expect(state.isLoading).toBe(false);
  });

  it("should set active session correctly", () => {
    const store = useCajaStore.getState();
    const mockSession = {
      id: "session-1",
      cuit: "30-12345678-9",
      user_id: "user-1",
      estado: "abierta" as const,
      monto_inicial: 0,
      monto_teorico: 0,
      monto_real: null,
      diferencia: null,
      fecha_apertura: new Date().toISOString(),
      fecha_cierre: null,
      notas: "Apertura con $0",
    };

    store.setSession(mockSession);

    const updatedState = useCajaStore.getState();
    expect(updatedState.activeSession).toEqual(mockSession);
  });

  it("should calculate theoretical balance correctly on movements", () => {
    const store = useCajaStore.getState();
    const mockSession = {
      id: "session-1",
      cuit: "30-12345678-9",
      user_id: "user-1",
      estado: "abierta" as const,
      monto_inicial: 0,
      monto_teorico: 0,
      monto_real: null,
      diferencia: null,
      fecha_apertura: new Date().toISOString(),
      fecha_cierre: null,
      notas: null,
    };

    store.setSession(mockSession);

    // Add income of $1500
    store.addMovimiento({
      id: "mov-1",
      sesion_id: "session-1",
      tipo: "ingreso",
      monto: 1500,
      concepto: "Venta de filtro de aire",
      fecha: new Date().toISOString(),
      accounting_transaction_id: null,
    });

    let updatedState = useCajaStore.getState();
    expect(updatedState.activeSession?.monto_teorico).toBe(1500);
    expect(updatedState.movimientos.length).toBe(1);

    // Add expense of $500
    store.addMovimiento({
      id: "mov-2",
      sesion_id: "session-1",
      tipo: "egreso",
      monto: 500,
      concepto: "Pago de viaticos",
      fecha: new Date().toISOString(),
      accounting_transaction_id: null,
    });

    updatedState = useCajaStore.getState();
    expect(updatedState.activeSession?.monto_teorico).toBe(1000);
    expect(updatedState.movimientos.length).toBe(2);
  });
});
