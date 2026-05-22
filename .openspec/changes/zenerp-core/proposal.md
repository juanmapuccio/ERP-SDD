# Propuesta: Núcleo de Contabilidad ERP Nodo Sur (zenerp-core)

## 1. Descripción del Objetivo
El objetivo es implementar un módulo contable ERP robusto, premium y arquitectónicamente sólido (`zenerp-core`). Este módulo contará con un **backend nativo en Go** que impondrá restricciones de contabilidad de partida doble (validando que `Debe == Haber`), administrará un Plan de Cuentas jerárquico y generará libros mayores en tiempo real (Libro Diario, Libro Mayor, Balance de Sumas y Saldos). El **frontend en Next.js** renderizará un panel interactivo premium adaptado a las necesidades fiscales y operativas de autopartistas que permitirá la navegación en árbol en tiempo real de las cuentas, el registro de transacciones de partida doble y la generación de informes interactivos.

Se aplicará un TDD estricto con pruebas unitarias y de integración tanto en el backend como en el frontend.

---

## 2. Cambios de Alto Nivel

### Backend (Go)
1. **Plan de Cuentas Jerárquico**:
   - Arquitectura en memoria/struct que soporta relaciones padre-hijo (ej. `1. Activo` -> `1.1 Activo Corriente` -> `1.1.1 Caja`).
   - Consolidación dinámica de saldos hijos hacia nodos padre.
   - Restricciones de seguridad: evitar la eliminación de cuentas padre si existen nodos hijos o si contienen transacciones.
2. **Asientos Contables de Partida Doble**:
   - Validación de transacciones que garantiza estrictamente que `Sum(Entries.Debe) == Sum(Entries.Haber)`. Rechaza con errores de validación legibles si está desbalanceado.
   - Persistencia de transacciones (estado seguro para hilos en memoria, opcionalmente respaldado en un archivo JSON local `backend/db/accounting.json` para persistir entre reinicios).
3. **Reportes Contables**:
   - **Libro Diario**: Listado secuencial de todas las transacciones con fechas, descripciones, cuentas y valores balanceados.
   - **Libro Mayor**: Libro mayor agregado agrupado por cuenta, mostrando saldo inicial, historial de entradas y saldo final.
   - **Balance de Sumas y Saldos**: Tabla jerárquica que muestra el Debe total, Haber total y el saldo deudor/acreedor activo para todas las cuentas.
4. **Endpoints**:
   - `GET /api/accounting/accounts`: Obtener el plan de cuentas jerárquico.
   - `POST /api/accounting/accounts`: Crear una cuenta bajo un código padre.
   - `POST /api/accounting/transactions`: Registrar una nueva transacción (validada).
   - `GET /api/accounting/reports/diario`: Obtener registros del libro diario.
   - `GET /api/accounting/reports/mayor/:accountId`: Obtener detalle del libro mayor para una cuenta individual.
   - `GET /api/accounting/reports/balance`: Obtener reporte de Balance de Sumas y Saldos.
5. **Pruebas**:
   - Cobertura total TDD en el backend utilizando las suites `testing` y `net/http/httptest` de Go.

### Frontend (Next.js)
1. **Árbol Interactivo del Plan de Cuentas**:
   - Vista de árbol expandible con sangrías claras, botones directos para agregar subcuentas y totales de saldo en tiempo real.
2. **Formulario Dinámico de Asiento Balanceado**:
   - Adición/eliminación dinámica de filas para transacciones de múltiples líneas.
   - Cálculos de saldo en tiempo real que muestran indicadores de validación en vivo (éxito verde para balanceado, advertencia roja para desbalanceado).
   - Botón de envío deshabilitado hasta que la transacción cuadre perfectamente.
3. **Pestañas de Libros Contables**:
    - Línea de tiempo cronológica del **Libro Diario**.
    - **Libro Mayor** detallando el historial de la cuenta seleccionado por menú desplegable.
    - Matriz profesional de **Balance de Sumas y Saldos** cumpliendo con estándares de diseño premium.
4. **Sistema Estético (ERP Nodo Sur Premium)**:
    - Tema oscuro elegante usando una paleta de tonos carbón armoniosa, confirmaciones de balance verde jade, tipografía clara y microanimaciones sutiles para actualizaciones de datos.
5. **Pruebas**:
   - Componentes React totalmente validados mediante Vitest + React Testing Library (impulsado por TDD).

---

## 3. Arquitectura y Compensaciones

| Elemento de Arquitectura | Elección | Compensación |
|---|---|---|
| **Jerarquía de Cuentas** | Códigos de cuenta basados en cadenas (ej. "1.1.01") | **Pros**: Extremadamente fácil de consultar, ordenar y consolidar niveles jerárquicos sin consultas recursivas. **Cons**: La edición de código requiere actualizaciones en cascada si cambia el código del padre (no es necesario para el alcance de este ERP). |
| **Persistencia de Estado** | Estructura en memoria thread-safe + respaldo JSON | **Pros**: Inicio instantáneo, limpio, fácil de probar, cero problemas de configuración de base de datos. **Cons**: No apto para escalado horizontal (totalmente aceptable para esta etapa central independiente). |
| **Gestión de Formularios** | Estado React dinámico basado en arrays | **Pros**: Cálculos en tiempo real en cada pulsación de tecla, extremadamente responsivo. **Cons**: Complejidad extra manejando la adición/eliminación de filas (totalmente cubierto por pruebas Vitest). |

---

## 4. Decisiones Abiertas / Alineación
- **Almacenamiento de Respaldo JSON**: El backend persistirá las transacciones y cuentas en `backend/db/accounting.json` para garantizar que las sesiones de usuario retengan sus entradas entre reinicios.
- **Guardia de TDD Estricto**: Cada manejador de backend y componente de vista del frontend estará acompañado por pruebas unitarias directas. No se fusionará ningún código ni se marcará como listo sin una verificación completa.
