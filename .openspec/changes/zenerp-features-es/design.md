# Diseño Técnico: Características del ERP Nodo Sur (`zenerp-features-es`)

Este documento define la arquitectura técnica y el plan de implementación detallado para las nuevas funcionalidades del ERP: Exportador CSV de reportes, Buscador reactivo del Plan de Cuentas e Indicadores del Dashboard.

---

## 1. Diseño del Componente: Exportación a CSV

La exportación se realizará directamente en el cliente dentro del componente `LedgerReports.tsx` para evitar latencias de red innecesarias y procesamiento del lado del servidor.

### Algoritmo de Generación de CSV
1. **Sanitización de Datos**: Limpiar comas, saltos de línea y comillas en los textos para evitar romper el formato CSV.
2. **Formateo Numérico**: Usar coma como delimitador o punto y coma `;` (recomendado para Excel en español) con formato numérico adecuado.
3. **Generación del Blob**:
   ```typescript
   const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
   const url = URL.createObjectURL(blob);
   const link = document.createElement("a");
   link.setAttribute("href", url);
   link.setAttribute("download", `${reportName}_${new Date().toISOString().slice(0,10)}.csv`);
   document.body.appendChild(link);
   link.click();
   document.body.removeChild(link);
   ```
   *(Nota: El carácter `\uFEFF` es el Byte Order Mark (BOM) UTF-8, indispensable para que Excel detecte correctamente la codificación e interprete caracteres en español como acentos y la eñe).*

---

## 2. Diseño del Componente: Buscador y Filtrado del Plan de Cuentas

El Plan de Cuentas se almacena en el estado `accounts` en `DashboardPage`.

### Lógica de Filtrado Reactivo (`AccountTree.tsx`)
Añadiremos un campo de texto en el encabezado del catálogo. A medida que el usuario escribe un término de búsqueda (`query`):
1. **Cálculo de Coincidencias**:
   ```typescript
   const matchedCodes = new Set<string>();
   accounts.forEach(acc => {
     if (
       acc.code.toLowerCase().includes(query) ||
       acc.name.toLowerCase().includes(query)
     ) {
       matchedCodes.add(acc.code);
       // Asegurar que los padres del nodo coincidente permanezcan visibles
       const parts = acc.code.split(".");
       for (let i = 1; i < parts.length; i++) {
         matchedCodes.add(parts.slice(0, i).join("."));
       }
     }
   });
   ```
2. **Renderizado del Árbol**:
   - Solo se mostrarán los nodos cuyo código esté presente en `matchedCodes`.
   - Si un nodo coincide directamente con el texto buscado, se le aplicará un resalte visual con un borde o fondo ámbar muy sutil (`bg-amber-500/10 text-amber-950 font-semibold border-amber-500/30`).

---

## 3. Diseño del Componente: Indicadores del Dashboard y Ecuación Contable

En `frontend/src/app/dashboard/page.tsx`, después de obtener los saldos acumulados de la llamada a `/api/accounting/accounts`, se calculan de manera ágil los tres pilares financieros:
- **Activos Totales ($A$)**: Balance de la cuenta con código `"1"`.
- **Pasivos Totales ($P$)**: Balance de la cuenta con código `"2"`.
- **Patrimonio Neto ($PN$)**: Balance de la cuenta con código `"3"`.
- **Diferencia de Ecuación Contable ($Diff$)**:
  $$\text{Diff} = A - (P + PN)$$

### Interfaz de Usuario
Se renderizarán cuatro tarjetas con diseño *ERP Nodo Sur Premium*:
1. **Activos**: Color de borde y destaque verde jade (`emerald-500`).
2. **Pasivos**: Color de borde y destaque rojo profundo (`rose-500`).
3. **Patrimonio**: Color de borde y destaque ámbar dorado (`amber-500`).
4. **Estado del Balance**:
   - Si $\text{Diff} == 0$: Fondo verde jade suave, texto verde y checkmark indicando: `✓ Ecuación de Balance Balanceada`.
   - Si $\text{Diff} \neq 0$: Fondo ámbar/rojo con alerta de advertencia indicando la diferencia exacta: `⚠ Desbalance: $X.XX`.

---

## 4. Plan de Verificación de Pruebas

### Pruebas Unitarias del Frontend (`frontend/src/components/__tests__/AccountingFeatures.test.tsx`)
1. **Buscador**: Simular entrada en la caja de búsqueda y comprobar que solo se renderizan las cuentas correspondientes.
2. **Cálculo de Ecuación Contable**: Pasar cuentas mockeadas al Dashboard, verificar que el cálculo de Activos, Pasivos y Patrimonio Neto concuerda, y verificar que el badge muestra correctamente si el balance está o no equilibrado.
3. **Simulación de CSV**: Asegurar que la función de exportación construye los datos estructurados en formato CSV separados por punto y coma (`;`).
