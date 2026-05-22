# Proposal: POS, Caja Diaria & Accounting Module Integration

## Problem Description
Currently, daily cash registers (`caja_sesion`, `caja_movimiento`), Point of Sale (POS) sales, and the double-entry accounting ledger exist in separate silos. When a sale is made in the POS, it decrements stock and registers an AFIP voucher, but it does not validate if there is an active daily cash drawer session (for cash sales), does not log the cash receipt in the cash register, and does not record double-entry accounting ledger entries.

This proposal connects the three modules atomically:
1. Multi-method payments are enabled in the POS (Cash, Card, Transfer, and Customer Credit).
2. Cash sales are blocked unless a cash session is active for the CUIT.
3. Every POS checkout records the sale atomically in the double-entry hierarchical ledger (`accounting_transactions` and `accounting_entries`).
4. Cash sales log the movement in `caja_movimiento` and increment `caja_sesion.monto_teorico` automatically.

## Trade-offs and Architecture
- **State management**: Zustand `useSalesStore` will carry the selected `paymentMethod` (defaults to `"efectivo"`).
- **Checkout atomic sequencing**: Instead of database-level triggers, the transaction sequence is managed in `ventas/page.tsx`'s `handleCheckout` sequentially using Supabase client queries/inserts. This provides the highest clarity, flexibility for simulation adjustments, and granular frontend error handling (toasters).
- **Security & Integrity**: Double-entry balance calculation ($Debe == $Haber) is verified before making any insert.

## Database Mappings
- **Efectivo**: Debit `1.1.1.01` (Caja General), credit `4.1.1.01` (Ventas), credit `2.1.3.01` (IVA). Logs to Caja.
- **Tarjeta**: Debit `1.1.1.02` (Banco Cuenta Corriente), credit `4.1.1.01` (Ventas), credit `2.1.3.01` (IVA).
- **Transferencia**: Debit `1.1.1.02` (Banco Cuenta Corriente), credit `4.1.1.01` (Ventas), credit `2.1.3.01` (IVA).
- **Cuenta Corriente**: Debit `1.1.3.01` (Deudores por Ventas), credit `4.1.1.01` (Ventas), credit `2.1.3.01` (IVA). Disallowed for Consumidor Final (`99999999999`).
