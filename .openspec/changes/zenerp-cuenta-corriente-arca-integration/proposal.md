# Proposal: Customer Credit (Cuenta Corriente) & ARCA (ex-AFIP) Fiscal Integration

## Goal Description
This proposal designs the comprehensive customer credit line management (Cuenta Corriente) and native fiscal invoice integration with **ARCA (ex-AFIP)**.

It resolves several disconnected cash flows and establishes a cohesive financial core:
1. **Cuenta Corriente (CC)**: Allows administrators to assign credit limits to trusted customers, track outstanding debt (`saldo_actual`), view credit movements, and record debt payments (cobros) through any payment method.
2. **Double-Entry Balance & Caja**: Debt payments (cobros) dynamically update the ledger (Debit Cash/Bank, Credit Customer Accounts Receivable) and log daily cash movements if paid in cash.
3. **ARCA Integration**: Standardizes electronic billing via `@arcasdk/core` (WSAA / WSFE) using a real CUIT in the homologation environment, utilizing **WSASS** for certificate authorization.
4. **ARCA Onboarding Wizard**: A premium Next.js GUI that generates RSA keys/CSRs in-browser using `node-forge`, lists instructions, allows `.crt` uploads, and validates connectivity instantly.
5. **ARCA Local Simulator API**: Intercepts billing requests in the `simulation` environment to offer lightning-fast, zero-offline local POS testing and automated Vitest execution.

---

## Technical Choices & Architectural Trade-Offs

### 1. Database Credentials Security (Symmetric Encryption)
*   **Trade-off**: Storing credentials in `.env` blocks multi-company profiles (since each CUIT needs its own keys/certificates). Storing raw keys in the database poses a major security hazard.
*   **Decision**: We will store the `private_key` and `certificate` in the `arca_credentials` database table, but the `private_key` **must be encrypted** using `AES-256-GCM` before insertion.
*   **Decryption Key**: The master secret key (`ARCA_ENCRYPTION_KEY`) remains strictly on the server environment. This guarantees robust isolation, seamless multi-company configuration, and enterprise-grade security.

### 2. Sandbox Simulation Mode
*   **Trade-off**: AFIP's homologation servers are notoriously unstable and slow, causing dev timeouts and blocking CI/CD testing.
*   **Decision**: Implement a dynamic adapter pattern in `arca-service.ts`. If the environment in `arca_credentials` is set to `"simulation"`, WSAA/WSFE network calls are bypassed. Instead, they hit `/api/arca-simulator/wsfe`, returning instant mocked JSON payloads.

---

## Multi-Module Funding & Database Flows

### 1. POS Credit Checkout Gate
*   When a POS transaction is made using `"cuenta_corriente"`:
    *   Query `customer_credit_accounts` for the client ID and active company CUIT.
    *   Assert `tiene_cuenta_corriente === true` and `saldo_actual + totalAmount <= limite_credito`.
    *   If violated, **abort the checkout** and prompt the user to make a partial debt payment.

### 2. CC Debt Payments (Cobros)
*   Payments are managed exclusively inside the `clientes` module, supporting **Cash**, **Card**, or **Transfer**:
    *   *Cash*: Generates a ledger entry: Debit Caja General `1.1.1.01`, Credit Receivables `1.1.3.01`. Inserts `caja_movimiento` (type: `"ingreso"`) and increments the daily register's `monto_teorico`.
    *   *Card/Transfer*: Generates: Debit Banco `1.1.1.02`, Credit Receivables `1.1.3.01`. Bypass cash register.
