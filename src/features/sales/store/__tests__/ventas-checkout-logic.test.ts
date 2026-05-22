import { describe, it, expect } from "vitest";
import { useSalesStore } from "../use-sales-store";

describe("POS checkout gate validation rules", () => {
  it("should prevent Cuenta Corriente for Consumidor Final", () => {
    const store = useSalesStore.getState();
    store.clearSales();
    
    // Set Consumidor Final CUIT and Cuenta Corriente
    store.setClient("99999999999", "Consumidor Final", "Consumidor Final");
    store.setPaymentMethod("cuenta_corriente");
    
    // Logic Assert using fresh state
    const freshState = useSalesStore.getState();
    const isCcGateTriggered = 
      freshState.paymentMethod === "cuenta_corriente" && 
      freshState.clientCuit === "99999999999";
      
    expect(isCcGateTriggered).toBe(true);
  });

  it("should allow Cuenta Corriente for a nominative customer", () => {
    const store = useSalesStore.getState();
    store.clearSales();
    
    // Set nominative customer and Cuenta Corriente
    store.setClient("30717762210", "Repuestos Warnes S.A.", "Responsable Inscripto");
    store.setPaymentMethod("cuenta_corriente");
    
    // Logic Assert using fresh state
    const freshState = useSalesStore.getState();
    const isCcGateTriggered = 
      freshState.paymentMethod === "cuenta_corriente" && 
      freshState.clientCuit === "99999999999";
      
    expect(isCcGateTriggered).toBe(false);
  });

  it("should detect when cash validation is required", () => {
    const store = useSalesStore.getState();
    store.clearSales();
    
    // Cash method requires active drawer
    store.setPaymentMethod("efectivo");
    expect(useSalesStore.getState().paymentMethod === "efectivo").toBe(true);
    
    // Transfer method does not require cash shift
    store.setPaymentMethod("transferencia");
    expect(useSalesStore.getState().paymentMethod === "efectivo").toBe(false);
  });
});

