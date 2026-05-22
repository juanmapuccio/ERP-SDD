# Especificación: Características Avanzadas del ERP Nodo Sur

Esta especificación detalla los requisitos funcionales y criterios de aceptación para el exportador de reportes, los indicadores de control financiero y el buscador del catálogo de cuentas.

---

## 1. Requisitos Funcionales

### 1.1 Exportador de Reportes Financieros a CSV

El sistema DEBE permitir descargar la información de cada reporte en formato CSV compatible con Microsoft Excel.

- **Codificación**: UTF-8 con Byte Order Mark (BOM: `\uFEFF`) para garantizar la correcta visualización de caracteres con tilde y la letra eñe (`ñ`) en sistemas operativos Windows.
- **Separador**: Punto y coma (`;`) como delimitador predeterminado de columnas.
- **Nombre de archivo estructurado**: Nombre de la pestaña activa + fecha en formato `AAAA-MM-DD`. Por ejemplo, `libro_diario_2026-05-17.csv`.

#### Criterios de Aceptación:
- [ ] Al presionar el botón "Exportar a CSV" en la vista del **Libro Diario**, se inicia la descarga automática de un archivo con las columnas: `Fecha`, `ID Transacción`, `Descripción`, `Cuenta`, `Debe`, `Haber`.
- [ ] Al presionar el botón "Exportar a CSV" en la vista del **Libro Mayor**, se descarga un archivo con las columnas: `Fecha`, `Descripción`, `Debe`, `Haber`, `Saldo Acumulado`. El encabezado del archivo debe reflejar el código y nombre de la cuenta activa.
- [ ] Al presionar el botón "Exportar a CSV" en la vista del **Balance de Sumas y Saldos**, se descarga un archivo con las columnas: `Código`, `Cuenta`, `Suma Debe`, `Suma Haber`, `Saldo Deudor`, `Saldo Acreedor`, incluyendo la fila final de Totales de Control.

---

### 1.2 Dashboard de Control y Ecuación Contable

El panel principal DEBE calcular dinámicamente y presentar de forma visual el estado del balance corporativo.

- **Activo Total**: Sumatoria de todos los saldos de cuentas que comienzan con el código `1`.
- **Pasivo Total**: Sumatoria de todos los saldos de cuentas que comienzan con el código `2`.
- **Patrimonio Neto**: Sumatoria de todos los saldos de cuentas que comienzan con el código `3`.
- **Fórmula de Validación**:
  $$\text{Diferencia} = \text{Activo} - (\text{Pasivo} + \text{Patrimonio Neto})$$

#### Criterios de Aceptación:
- [ ] Se muestran 4 tarjetas glassmorphism: Activos Totales (borde verde jade), Pasivos Totales (borde rojo/rosa), Patrimonio Neto (borde dorado) y Estado de la Ecuación Contable.
- [ ] Si la Diferencia de la fórmula de validación es menor a `0.01` ($|Diff| < 0.01$), el Estado de la Ecuación Contable muestra un badge verde con el texto: `✓ Ecuación de Balance Balanceada`.
- [ ] Si la Diferencia es mayor o igual a `0.01`, el badge cambia a color ámbar y muestra la diferencia exacta: `⚠ Desbalance detectado: $X.XX`.

---

### 1.3 Buscador Reactivo del Plan de Cuentas

La barra de búsqueda en el componente de catálogo permite encontrar cuentas de manera instantánea.

- **Criterio de búsqueda**: Código de cuenta (ej. `1.1`) o Nombre de cuenta (ej. `Caja`).
- **Comportamiento**:
  - Reactivo en tiempo real en cada pulsación de tecla.
  - Oculta los nodos del Plan de Cuentas que no coinciden ni tienen descendientes que coincidan con la búsqueda.
  - Asegura que los ancestros de cualquier cuenta que coincida se mantengan visibles en el árbol para preservar la estructura.
  - Aplica un estilo resaltado visible al nodo que coincide directamente.

#### Criterios de Aceptación:
- [ ] Al ingresar "Caja" en el buscador, solo se visualiza la rama de activos que contiene la palabra "Caja General" (ej: `1`, `1.1`, `1.1.01`). El resto de ramas vacías como `2` (Pasivos) o `3` (Patrimonio) desaparecen de la vista.
- [ ] Al vaciar la caja de búsqueda, se restablece el catálogo completo de cuentas.
- [ ] Los nodos que coinciden directamente se muestran con un fondo ligeramente contrastado y tipografía destacada.
