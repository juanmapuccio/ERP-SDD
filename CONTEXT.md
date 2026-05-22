# ERP Nodo Sur — Contexto y Estado del Proyecto

*Este archivo se actualiza automáticamente ejecutando `bun run update-context` en la raíz del proyecto.*

## 🌐 Información del Backend

- **URL Base**: `https://hedg3sx9.us-east.insforge.app`
- **Fecha de Actualización**: 22/5/2026, 00:56:56 (ARG)

## 📊 Estado de las Tablas y Registros

| Tabla | Descripción | Registros | RLS |
| :--- | :--- | :---: | :---: |
| `users` | Perfiles de usuario públicos | `0` | Activo (Simulación) |
| `company_profile` | Perfiles fiscales de las empresas registradas | `2` | Activo (Simulación) |
| `customers` | Clientes y proveedores del ERP | `2` | Activo (Simulación) |
| `inventory` | Catálogo de artículos, precios e inventario | `0` | Activo (Simulación) |
| `afip_vouchers` | Comprobantes electrónicos autorizados ante AFIP | `0` | Activo (Simulación) |
| `accounting_accounts` | Plan de cuentas jerárquico | `30` | Activo (Simulación) |
| `accounting_transactions` | Asientos contables cabecera | `0` | Activo (Simulación) |
| `accounting_entries` | Líneas de asiento (Debe / Haber) | `0` | Activo (Simulación) |
| `customer_credit_accounts` | Cuentas corrientes y límites de crédito por CUIT | `1` | Activo (Simulación) |
| `customer_credit_movements` | Historial de movimientos de Cuenta Corriente | `0` | Activo (Simulación) |
| `arca_credentials` | Credenciales fiscales y llaves encriptadas de ARCA | `1` | Activo (Simulación) |

## 🛠️ Esquemas de Base de Datos y Tipos

### 📋 Tabla: `users`

**Campos y estructura detectados (ejemplo):**

```json
{
  "id": "00000000-0000-0000-0000-000000000001",
  "email": "admin@example.com",
  "profile": {
    "name": "Administrator"
  },
  "metadata": {},
  "created_at": "2026-05-18T01:31:05.18207+00:00",
  "updated_at": "2026-05-18T01:31:05.18207+00:00"
}
```

### 📋 Tabla: `company_profile`

**Campos y estructura detectados (ejemplo):**

```json
{
  "cuit": "30717762210",
  "razon_social": "Prueba 1",
  "nombre_fantasia": "Retazo",
  "condicion_iva": "Responsable Inscripto",
  "ingresos_brutos": null,
  "inicio_actividades": null,
  "direccion": "Calle F 332",
  "punto_venta": 1,
  "afip_mode": "edge_simulation",
  "afip_cert": null,
  "afip_key": null
}
```

### 📋 Tabla: `customers`
*Tabla vacía. Aún no hay registros cargados para inferir estructura.*

### 📋 Tabla: `inventory`
*Tabla vacía. Aún no hay registros cargados para inferir estructura.*

### 📋 Tabla: `afip_vouchers`
*Tabla vacía. Aún no hay registros cargados para inferir estructura.*

### 📋 Tabla: `accounting_accounts`
*Tabla vacía. Aún no hay registros cargados para inferir estructura.*

### 📋 Tabla: `accounting_transactions`
*Tabla vacía. Aún no hay registros cargados para inferir estructura.*

### 📋 Tabla: `accounting_entries`
*Tabla vacía. Aún no hay registros cargados para inferir estructura.*

### 📋 Tabla: `customer_credit_accounts`
*Tabla vacía. Aún no hay registros cargados para inferir estructura.*

### 📋 Tabla: `customer_credit_movements`
*Tabla vacía. Aún no hay registros cargados para inferir estructura.*

### 📋 Tabla: `arca_credentials`
*Tabla vacía. Aún no hay registros cargados para inferir estructura.*
