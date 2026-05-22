# Plan de Tareas: Características del ERP Nodo Sur (`zenerp-features-es`)

Este documento desglosa el plan de tareas detallado para implementar y verificar las nuevas funcionalidades avanzadas del sistema contable.

---

## Tareas de Desarrollo

### 1. Exportador a CSV (`LedgerReports.tsx`)
- [ ] Añadir botón estilizado de exportación ("Exportar a CSV") en cada reporte contable: Libro Diario, Libro Mayor y Balance de Sumas y Saldos.
- [ ] Implementar la función de generación del string CSV codificado en UTF-8 con Byte Order Mark (BOM: `\uFEFF`) y delimitador punto y coma (`;`).
- [ ] Mapear de manera limpia e interactiva los datos de cada una de las tablas según la pestaña activa del reporte.

### 2. Buscador Reactivo del Plan de Cuentas (`AccountTree.tsx`)
- [ ] Diseñar e incorporar una barra de búsqueda interactiva de estética minimalista en la cabecera del catálogo.
- [ ] Crear la lógica de filtrado reactivo de nodos en tiempo real (por código de cuenta y nombre).
- [ ] Asegurar la preservación estructural manteniendo visibles los nodos padres/ancestros de cualquier nodo que coincida con la búsqueda.
- [ ] Resaltar visualmente las cuentas coincidentes utilizando bordes y fondos suaves en tonos ámbar contable (`bg-amber-500/10 text-amber-950 border-amber-500/30`).

### 3. Indicadores Financieros Contables (`page.tsx`)
- [ ] Agregar el cálculo dinámico de Activos Totales (cuentas `1.*`), Pasivos Totales (cuentas `2.*`) y Patrimonio Neto (cuentas `3.*`).
- [ ] Diseñar e integrar 4 tarjetas con estética *ERP Nodo Sur Premium* en el panel principal del dashboard contable.
- [ ] Implementar el banner dinámico del Estado de la Ecuación Contable con validación matemática de balance ($A - (P + PN) < 0.01$) en tonos verde jade o alerta ámbar/rojo.

---

## Tareas de Verificación y Control

### 4. Pruebas y Aseguramiento de Calidad
- [ ] Desarrollar y ejecutar tests automatizados en `frontend/src/components/__tests__/Accounting.test.tsx` (o archivo similar de tests de frontend).
- [ ] Verificar la correcta descarga y visualización del archivo CSV exportado en Excel/Google Sheets en español.
- [ ] Comprobar que la búsqueda en el Plan de Cuentas no rompa la estructura jerárquica colapsable.
