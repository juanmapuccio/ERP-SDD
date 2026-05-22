# Technical Specification: Daily Cash, POS Checkout & Hierarchical Accounting Integration

## 1. Overview
This spec details the precise technical interfaces, database contracts, validation rules, and double-entry bookkeeping constraints required to integrate Point of Sale (POS) checkouts with the Daily Cash Register and Hierarchical Accounting modules.

## 2. Interface Contracts & Types

### 2.1 sales-store.ts Modifications
The `useSalesStore` Zustand store must manage payment methods:
```typescript
export type PaymentMethod = "efectivo" | "tarjeta" | "transferencia" | "cuenta_corriente";

interface SalesState {
  // Existing fields...
  paymentMethod: PaymentMethod;
  setPaymentMethod: (method: PaymentMethod) => void;
  // Clear sales resets paymentMethod to "efectivo"
}
```

### 2.2 Payment Method Mappings (Plan de Cuentas)
- **Revenue Account**: `4.1.1.01` (Ventas de Repuestos)
- **VAT Liability Account**: `2.1.3.01` (IVA Débito Fiscal)
- **Asset Mappings**:
  - `efectivo` -> `1.1.1.01` (Caja General)
  - `tarjeta` -> `1.1.1.02` (Banco Cuenta Corriente)
  - `transferencia` -> `1.1.1.02` (Banco Cuenta Corriente)
  - `cuenta_corriente` -> `1.1.3.01` (Deudores por Ventas (Clientes))

---

## 3. Core Business & Database Rules

### Rule 3.1: Cash Drawer Gate (Efectivo Block)
If `paymentMethod === "efectivo"`, the checkout flow **must** search the `caja_sesion` table for an open shift:
- Query filter: `cuit = activeCompany.cuit` AND `estado = "abierta"`.
- If no active shift is found, the system blocks the checkout, aborts all database writes, and prompts the user to open the cash register.
- Other payment methods bypass this drawer gate completely.

### Rule 3.2: Nominative Credit Ledger
If `paymentMethod === "cuenta_corriente"`, the customer CUIT must **not** be the generic `99999999999` (Consumidor Final).
- If it is, the system blocks the checkout and prompts the user to select or create a nominative client.

### Rule 3.3: Strict Double-Entry Ledger Bookings
Before persisting the voucher, the checkout generates a balanced double-entry accounting entry:
1. **Transaction Header (`accounting_transactions`)**:
   - `id`: `TX-VENTA-[timestamp]-[random]`
   - `date`: `now()`
   - `description`: `"Venta POS [VoucherId] - Cliente: [ClientName]"`
2. **Journal Entries (`accounting_entries`)**:
   - **Entry 1 (Debit - Asset/Receivable)**:
     - `account_code`: Resolved asset code from the mapping.
     - `debe`: `total_amount`
     - `haber`: `0.00`
   - **Entry 2 (Credit - Revenue)**:
     - `account_code`: `"4.1.1.01"`
     - `debe`: `0.00`
     - `haber`: `net_amount`
   - **Entry 3 (Credit - VAT Liability)** (Only if `iva_amount > 0.00`):
     - `account_code`: `"2.1.3.01"`
     - `debe`: `0.00`
     - `haber`: `iva_amount`
- **Invariant**: The engine must assert that `SUM(debe) === SUM(haber)` for the generated entries.

### Rule 3.4: Cash Drawer Movements (Efectivo Only)
If `paymentMethod === "efectivo"`, after booking the accounting entry:
1. **Log Drawer Movement (`caja_movimiento`)**:
   - `sesion_id`: Open cash session ID.
   - `tipo`: `"ingreso"`
   - `monto`: `total_amount`
   - `concepto`: `"Venta POS en Efectivo - Comprobante [VoucherId]"`
   - `accounting_transaction_id`: The ID of the transaction created in Rule 3.3.
2. **Increment Drawer Theoretical Balance**:
   - Perform an atomic database increment of `monto_teorico` in the active `caja_sesion` by adding the `total_amount`.

---

## 4. STRICT TDD Test Cases (Vitest)

We will implement the following frontend tests inside `frontend/src/features/sales/store/__tests__/use-sales-store.test.ts` and a dedicated checkout logic test file:
1. **Store defaults**: `paymentMethod` must default to `"efectivo"`.
2. **Store actions**: `setPaymentMethod` correctly mutates the state, and `clearSales` resets it.
3. **Cash Gate Blocking**: Attempting a checkout with `"efectivo"` when no open session exists must abort and throw/return an error.
4. **Credit Gate Blocking**: Attempting a checkout with `"cuenta_corriente"` for `99999999999` must abort and throw/return an error.
5. **Ledger Balance Verification**: Generates ledger entries where total debits equal total credits under HSL/cent rounding.
