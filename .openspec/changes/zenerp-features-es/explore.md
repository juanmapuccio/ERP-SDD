# Exploración Técnica: Características del ERP Nodo Sur (`zenerp-features-es`)

Este documento detalla el análisis del estado actual del Plan de Cuentas, reportes y del dashboard contable en el frontend del ERP Nodo Sur.

## 1. Estado de los Archivos de Interés

### 1.1 `frontend/src/components/AccountTree.tsx`
- **Función**: Renderiza el catálogo de cuentas en formato de árbol colapsable/expandible.
- **Estructura**: Las cuentas se renderizan mediante la función recursiva `renderNode(acc: Account, level: number)`.
- **Acceso**: Recibe `accounts` como prop.

### 1.2 `frontend/src/components/LedgerReports.tsx`
- **Función**: Muestra los reportes del Libro Diario, Libro Mayor y Balance de Sumas y Saldos.
- **Estructura**: Tiene pestañas para cambiar de reporte y maneja tablas de transacciones o saldos consolidados de cuentas.

### 1.3 `frontend/src/app/dashboard/page.tsx`
- **Función**: Panel principal de control del ERP.
- **Estructura**: Obtiene las cuentas contables de la base de datos de manera reactiva y delega su renderizado y registro de transacciones.

---

## 2. Propuestas Técnicas de Implementación

### 2.1 Exportador de CSV en `LedgerReports.tsx`
Para cada tipo de reporte, construiremos un string con delimitador `;` y salto de línea `\n`. Para asegurar compatibilidad perfecta con Excel y codificación de caracteres en español (acentos, eñes):
- Prefijaremos el contenido con el Byte Order Mark (BOM) UTF-8 (`"\uFEFF"`).
- Agregaremos un botón con estética premium ("Exportar a CSV") que ejecutará una descarga cliente directa mediante `Blob` y un link temporal.

### 2.2 Buscador Reactivo en `AccountTree.tsx`
Agregaremos una caja de entrada de búsqueda estilizada en la cabecera.
- **Algoritmo de Filtrado de Nodos**:
  Si la query no está vacía:
  1. Recorremos todas las cuentas del catálogo.
  2. Si su código o nombre incluye la búsqueda, la agregamos a un set de códigos activos (`matchedCodes`).
  3. Agregamos también todos sus ancestros para que el árbol no se rompa visualmente.
  4. En `renderNode`, si un código no está en `matchedCodes`, se omite del renderizado. Si coincide directamente con el término buscado, se le aplica una clase CSS con fondo dorado ámbar suave y texto destacado para guiar el ojo del usuario.

### 2.3 Ecuación Contable en `DashboardPage` (`frontend/src/app/dashboard/page.tsx`)
1. Realizaremos la suma del saldo de activos (`code` que empieza con `"1"`), pasivos (`code` que empieza con `"2"`) y patrimonio neto (`code` que empieza con `"3"`).
2. Mostraremos un panel de control con 4 tarjetas diseñadas minuciosamente:
   - **Activos Totales** (Verde jade)
   - **Pasivos Totales** (Rojo profundo)
   - **Patrimonio Neto** (Oro ámbar)
   - **Estado del Balance**: Un banner dinámico que indica `✓ Ecuación de Balance Balanceada` cuando Activo - (Pasivo + Patrimonio) es menor a 0.01, o `⚠ Desbalance detectado` si existe diferencia, con su valor absoluto.
