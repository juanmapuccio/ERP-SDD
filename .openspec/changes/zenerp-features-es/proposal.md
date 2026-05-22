# Propuesta: Características del ERP Nodo Sur en Español (`zenerp-features-es`)

## 1. Descripción del Objetivo

El objetivo de esta propuesta es expandir el módulo de contabilidad **ERP Nodo Sur Contable** con tres capacidades operativas y visuales avanzadas en español:
1. **Exportación de Reportes Financieros (CSV)**: Permitir la exportación inmediata y pulida en formato CSV compatible con Excel para el Libro Diario, Libro Mayor y Balance de Sumas y Saldos.
2. **Dashboard Visual e Indicadores Financieros**: Añadir un panel de resumen con tarjetas premium de efecto glassmorphism en el tope del ERP que presenten el total de Activos, Pasivos, Patrimonio Neto y un indicador de validación del Balance de la ecuación contable fundamental: `Activo == Pasivo + Patrimonio Neto`.
3. **Buscador y Filtrado Dinámico**: Integrar un buscador en el árbol de Plan de Cuentas para filtrar cuentas de manera ágil por su código o nombre contable.

Todo el desarrollo se realizará bajo **Modo TDD Estricto** con pruebas automatizadas completas para frontend y backend.

---

## 2. Cambios Propuestos de Alto Nivel

### Frontend (Next.js & TypeScript)
1. **Dashboard Visual e Indicadores (`frontend/src/app/dashboard/page.tsx`)**:
   - Agregar una fila de tarjetas premium con efecto glassmorphism:
     - **Activo Total**: Suma dinámica de la cuenta raíz `1`.
     - **Pasivo Total**: Suma dinámica de la cuenta raíz `2`.
     - **Patrimonio Neto**: Suma dinámica de la cuenta raíz `3`.
     - **Estado del Balance**: Badge animado verde si `Activo == Pasivo + Patrimonio` o una advertencia ámbar con la diferencia exacta si existe alguna discrepancia.
2. **Buscador de Cuentas (`frontend/src/components/AccountTree.tsx`)**:
   - Incorporar un buscador en el Plan de Cuentas que filtre la vista de árbol de forma reactiva a medida que el usuario escribe.
   - Resaltar de manera sutil los nodos que coinciden con los términos de búsqueda.
3. **Botones de Exportación (`frontend/src/components/LedgerReports.tsx`)**:
   - Añadir botones premium de descarga con iconos elegantes para descargar los datos de la pestaña activa (Libro Diario, Libro Mayor o Balance de Sumas y Saldos) como archivos CSV (`.csv`) codificados correctamente y listos para abrir en Excel.
4. **Pruebas Unitarias (`frontend/src/components/__tests__/AccountingFeatures.test.tsx`)**:
   - Crear una suite de pruebas para verificar que el filtrado funciona, los cálculos de indicadores son correctos y que la descarga de archivos genera los datos formateados.

---

## 3. Arquitectura y Compensaciones (Tradeoffs)

| Decisión de Diseño | Opción Elegida | Compensación |
|---|---|---|
| **Formato de Exportación** | CSV estructurado del lado del cliente | **Pros**: Liviano, rápido, sin dependencias de paquetes de terceros y descarga instantánea. **Cons**: No tiene los estilos visuales que permitiría un archivo `.xlsx` binario nativo, pero es totalmente compatible con Excel. |
| **Buscador del Árbol** | Filtrado del lado del cliente en el estado de React | **Pros**: Respuesta inmediata sin latencia de red ni llamadas repetidas a la base de datos. **Cons**: Para planes de millones de cuentas podría ralentizarse, pero para ERPs corporativos estándar y medianos es extremadamente eficiente. |

---

## 4. Decisiones Abiertas / Alineación

- **Ecuación del Balance**: La validación matemática de `Activo = Pasivo + Patrimonio Neto` se representará visualmente de forma animada en jade-verde brillante o ámbar profundo para mantener la coherencia del diseño del ERP Nodo Sur.
