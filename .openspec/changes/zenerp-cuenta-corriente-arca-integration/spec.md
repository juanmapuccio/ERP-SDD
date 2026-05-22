# Especificación Técnica: Integración de Cuenta Corriente y Módulo Fiscal de ARCA (ex-AFIP)

## 1. Introducción
Esta especificación detalla los contratos de base de datos, interfaces lógicas, reglas de negocio y secuencias de asientos contables en partida doble para las Cuentas Corrientes de Clientes, cobros multimedio de deudas, onboarding seguro de credenciales ARCA y simulación local del entorno fiscal.

---

## 2. Contratos de Interfaz y Tipos

### 2.1 Modelos de Base de Datos y Tipos de TypeScript

#### `CreditAccount` (Cuenta Corriente)
Define el límite de crédito y la deuda acumulada aislada por cliente y CUIT de empresa:
```typescript
export interface CreditAccount {
  id: string;              // UUID
  client_id: string;       // FK a customers.id
  company_cuit: string;    // CUIT de la empresa activa en el sistema
  tiene_cuenta_corriente: boolean;
  limite_credito: number;  // Límite máximo de deuda permitido
  saldo_actual: number;    // Deuda acumulada actual
  created_at: string;
}
```

#### `CreditMovement` (Historial de Movimientos de Cuenta Corriente)
Registro auditable de eventos de crédito:
```typescript
export interface CreditMovement {
  id: string;              // UUID
  credit_account_id: string; // FK a customer_credit_accounts.id
  type: "debito" | "credito"; // 'debito' incrementa la deuda; 'credito' la disminuye (pagos/cobros)
  amount: number;          // Valor absoluto de la transacción
  description: string;     // Ej. "Venta POS — Factura A-0001-0000304" o "Pago de deuda en Efectivo"
  accounting_transaction_id?: string; // Enlace al asiento contable en el libro diario
  created_at: string;
}
```

#### `ArcaCredentials` (Credenciales ARCA)
Configuración segura de llaves y certificados fiscales por CUIT de empresa:
```typescript
export interface ArcaCredentials {
  company_cuit: string;    // PK
  private_key: string;      // Clave privada encriptada simétricamente
  certificate: string;      // Certificado público .crt firmado
  punto_venta: number;     // Ej. 2
  environment: "simulation" | "homologation" | "production";
  created_at: string;
  updated_at: string;
}
```

---

## 3. Reglas de Negocio Críticas y Flujos de Datos

### Regla 3.1: Compuerta de Validación en POS (Credit Checkout Gate)
Si un checkout en el POS utiliza `paymentMethod === "cuenta_corriente"`, el sistema **debe** ejecutar de forma atómica esta secuencia:
1. **Verificar Perfil de Crédito**: Consultar `customer_credit_accounts` donde `client_id = selectedCustomer.id` AND `company_cuit = activeCompany.cuit`.
2. **Validar Habilitación**: Si no existe la cuenta o `tiene_cuenta_corriente === false`, abortar el checkout con el error: *"El cliente seleccionado no tiene Cuenta Corriente habilitada en esta distribuidora."*
3. **Validar Límite Seguro**: Comprobar que `saldo_actual + totalAmount <= limite_credito`.
   - Si la deuda excede el límite, **bloquear inmediatamente el checkout** y retornar: *"Límite de crédito excedido. Disponible: $Disponible (Límite: $Límite, Deuda actual: $Deuda). Por favor, realice un pago parcial."*
4. **Persistir Incremento de Deuda**:
   - Incrementar `saldo_actual` en `totalAmount` atómicamente en `customer_credit_accounts`.
   - Crear un registro en `customer_credit_movements` con `type = "debito"`, `amount = totalAmount` y asociar el `accounting_transaction_id` del asiento contable generado.

### Regla 3.2: Restricción de Crédito Nominativo
Las ventas en POS usando `cuenta_corriente` están estrictamente prohibidas para el CUIT genérico `99999999999` (Consumidor Final). El POS debe deshabilitar el botón de Cuenta Corriente y mostrar una advertencia clara si este cliente está seleccionado.

### Regla 3.3: Registrar Cobro de Deuda (Clientes)
Cuando un cliente realiza un pago para saldar su cuenta corriente:
1. **Datos de Entrada**: `monto_cobrado`, `payment_method` ("efectivo", "tarjeta", "transferencia").
2. **Validaciones**: `monto_cobrado > 0` y `monto_cobrado <= saldo_actual`.
3. **Asiento Contable en Partida Doble (`accounting_transactions` y `accounting_entries`)**:
   - Generar asiento balanceado:
     - **Debe (Incremento de Activo)**:
       - Si es `"efectivo"`, cuenta `1.1.1.01` (Caja General).
       - Si es `"tarjeta"` o `"transferencia"`, cuenta `1.1.1.02` (Banco Cuenta Corriente).
       - Monto: `monto_cobrado`.
     - **Haber (Disminución de Activo - Deudores)**:
       - Cuenta `1.1.3.01` (Deudores por Ventas).
       - Monto: `monto_cobrado`.
   - Validar invariante: `SUM(debe) === SUM(haber)`. Si no da balance cero (tolerancia máx $0.05), abortar.
4. **Sincronización de Caja Diaria (Solo Efectivo)**:
   - Si el método de pago es `"efectivo"`:
     - Consultar `caja_sesion` activa donde `cuit = activeCompany.cuit` AND `estado = "abierta"`.
     - Si no hay caja abierta, abortar con: *"Debe abrir la Caja Diaria para recibir cobros en Efectivo."*
     - Insertar `caja_movimiento` con `tipo = "ingreso"`, `monto = monto_cobrado` y `concepto = "Cobro Cuenta Corriente - [NombreCliente]"`.
     - Incrementar `monto_teorico` de la sesión de caja atómicamente.
5. **Disminución del Saldo Deudor**:
   - Decrementar `saldo_actual` por `monto_cobrado` en `customer_credit_accounts`.
   - Insertar un movimiento de tipo `"credito"` en `customer_credit_movements` asociando el id del asiento contable.

---

## 4. Set de Pruebas Unitarias (Vitest - TDD Estricto)

### 4.1 Pruebas de Cuenta Corriente (Hito 1)
Implementadas exitosamente en `frontend/src/features/customers/__tests__/cuenta-corriente-gates.test.ts`:
1.  **Bloqueo de Cuenta Deshabilitada**: El POS rechaza la compra a crédito si la cuenta corriente no está activa.
2.  **Bloqueo por Exceso de Límite**: El POS aborta el checkout si el carrito supera el crédito disponible.
3.  **Partida Doble de Cobros**: Validar que los cobros asienten correctamente los débitos en `1.1.1.02` y créditos en `1.1.3.01`.
4.  **Actualización de Caja Diaria**: Validar que los cobros en efectivo actualicen el saldo de la caja chica de forma exacta a nivel de centavos.

### 4.2 Pruebas de Integración Fiscal ARCA (Hito 2)
Implementaremos en `frontend/src/features/arca/__tests__/arca-simulation.test.ts`:
1.  **Seguridad de Encriptación**: Comprobar que AES-256-GCM enclave la clave privada en un ciphertext ilegible y la recupere con tags idénticos, arrojando excepciones si el payload es adulterado.
2.  **Generación de Claves y CSR**: Validar que la biblioteca nativa retorne una clave RSA de 2048 bits en formato PEM y un CSR con los metadatos fiscales correctos (`CN=ERP Nodo Sur - CUIT [CUIT]`).
3.  **Caché del Ticket de Acceso (TA)**: Validar que el validador WSAA recupere de la caché local el ticket y evite llamadas de red si tiene menos de 12 horas de antigüedad.
4.  **Discriminación Impositiva WSFE**:
    - Factura A: Desglose exacto de Neto, IVA al 21% e IVA al 10.5%.
    - Factura B: Precio bruto unificado de cara al cliente final.
5.  **Compuerta del Simulador**: Comprobar que al enviar facturas al endpoint de simulación `/api/arca-simulator/wsfe` retorne un CAE de prueba válido (`CAESIM-...`) y la URL del código QR correspondiente.

---

## 5. Endpoints de la API y Contrato Criptográfico

### 5.1 Encriptación Simétrica AES-256-GCM
- **Clave Maestra**: Variable de entorno `ARCA_ENCRYPTION_KEY` (debe ser un string hexadecimal que represente exactamente 32 bytes).
- **Tamaño del IV**: 12 bytes (`crypto.randomBytes(12)`).
- **Formato del Output**: Un string unificado usando el separador `:`:
  `[IV_HEX]:[TAG_HEX]:[CIPHERTEXT_HEX]`

### 5.2 Contrato de `/api/config/arca/generate-csr`
- **Método**: `POST`
- **Cuerpo del Request**:
  ```json
  {
    "company_cuit": "30717762210",
    "razon_social": "Retazo Autopartes S.A."
  }
  ```
- **Respuesta (Éxito 200)**:
  ```json
  {
    "csr": "-----BEGIN CERTIFICATE REQUEST-----\n...",
    "company_cuit": "30717762210"
  }
  ```
- **Efecto Secundario**: Genera el par RSA-2048. Encripta la llave privada generada y realiza un upsert en `arca_credentials` con estado de certificado pendiente.

### 5.3 Contrato de `/api/config/arca/upload-certificate`
- **Método**: `POST`
- **Cuerpo del Request**:
  ```json
  {
    "company_cuit": "30717762210",
    "certificate": "-----BEGIN CERTIFICATE-----\n...",
    "punto_venta": 1,
    "environment": "simulation"
  }
  ```
- **Respuesta (Éxito 200)**:
  ```json
  {
    "success": true,
    "message": "Certificado subido y validado con éxito."
  }
  ```

### 5.4 Contrato de `/api/arca-simulator/wsfe`
- **Método**: `POST`
- **Cuerpo del Request**:
  ```json
  {
    "cuit": "30717762210",
    "tipo_cbte": 1, // 1 = Factura A, 6 = Factura B
    "punto_venta": 1,
    "doc_tipo": 80, // 80 = CUIT, 99 = Consumidor Final sin documento
    "doc_nro": "30112233445",
    "imp_neto": 1000.00,
    "imp_iva": 210.00,
    "imp_total": 1210.00,
    "iva_alicuotas": [
      {
        "id": 5, // 21%
        "base_imp": 1000.00,
        "importe": 210.00
      }
    ]
  }
  ```
- **Respuesta (Éxito 200)**:
  ```json
  {
    "success": true,
    "cae": "CAESIM30717762210010000000045239",
    "cae_vencimiento": "2026-06-05T00:00:00.000Z",
    "cbte_nro": 42,
    "qr_url": "https://www.afip.gob.ar/fe/qr/?p=eyJ2ZXIiOjEsImZlY2hhIjoiMjAyNi0wNS0yMSIsImN1aXQiOjMwNzE3NzYyMjEwLCJwdG9WdGEiOjEsImNiaXRlVHlwbyI6MSwiY2J0ZU51bSI6NDIsImltcG9ydGUiOjEyMTAsIm1vbmVkYSI6IlBFUyIsImN0ekkiOjEsImRvY1RpcG8iOjgwLCJkb2NOdW0iOjMwMTEyMjMzNDQ1LCJjb2RBdXRvIjozMDcxNzc2MjIxMDBxcn0="
  }
  ```
