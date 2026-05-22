# Propuesta Técnica: Importación Masiva Dinámica con Validación de Taxonomía

Propuesta de diseño e implementación del resolvedor de taxonomía híbrido para el importador de catálogo en el **ERP Nodo Sur Premium/Classic**.

## Resumen del Cambio

Habilitar la importación de planillas de repuestos conteniendo múltiples marcas y múltiples rubros. El operador podrá elegir si una marca o rubro es fijo (estático para toda la planilla) o dinámico (mapeado desde una columna del CSV). Si es dinámico, el sistema resolverá de manera inteligente y segura las correspondencias de nombres contra la base de datos de marcas y rubros existentes, ofreciendo una interfaz interactiva de revisión y confirmación antes de la inserción final.

---

## Diseño del Flujo de Interfaz (UX/UI)

### Paso 1: Selección de Origen
* El selector de **Marca de Repuesto** y **Rubro / Familia** incluirá la opción especial: `"-- Mapear dinámicamente desde el CSV --"` (valor interno: `"_csv_mapped_"`).
* Si es seleccionado, el campo correspondiente se habilita en la tabla inferior de "Mapeo de Columnas".

### Paso 2: Análisis e Inteligencia (Dry-Run)
Al hacer clic en "Vista Previa", el sistema procesará en memoria el CSV y extraerá los nombres únicos de marcas y rubros. Realizará un match inteligente:
* **Coincidencia Exacta** (normalizada): `Bosch` (CSV) ➡️ `Bosch` (ERP) ➡️ Confianza 100% (Pre-asociado).
* **Coincidencia Difusa** (Levenshtein / similitud): `Bosch S.A.` (CSV) ➡️ `Bosch` (ERP) ➡️ Confianza >85% (Pre-asociado con advertencia de confianza).
* **Sin Correspondencia**: `GATES` (CSV) ➡️ *Crear nueva marca* (Pre-seleccionado).

### Paso 3: Pantalla de Confirmación de Taxonomía (Paso 2.5 Intermedio)
Se despliega una vista intermedia impecable (diseño Obsidian Dark + Amber) que muestra dos pestañas:
1. **Marcas Detectadas**
2. **Rubros Detectados**

Cada fila tiene:
* Nombre en el CSV.
* Estado / Sugerencia (ej. *"Asociar a existente: Bosch"*, o *"Crear como nueva"*).
* Un control selector para que el operador cambie o confirme la asociación en un segundo.

### Paso 4: Inserción y Subida
* Al confirmar, el backend realiza la creación en lote de las marcas/rubros nuevos confirmados de una sola vez.
* Mapea los IDs obtenidos en memoria a cada fila del catálogo.
* Ejecuta un **Bulk Upsert** idempotente en la base de datos `articulo` a través de InsForge SDK, resolviendo conflictos por SKU.

---

## Cambios Técnicos Propuestos

### 1. `frontend/src/lib/inventory-utils.ts` [MODIFY]
Añadir funciones puras de normalización y resolvedor fuzzy:
* `normalizeTaxonomyName(name: string): string`: Elimina espacios adicionales, mayúsculas, acentos y sufijos organizacionales comunes (`S.A.`, `S.R.L.`, `LTD`, `S.A`).
* `calculateSimilarity(str1: string, str2: string): number`: Implementación lineal y eficiente del algoritmo de Levenshtein para medir similitud de strings en el navegador.
* `matchTaxonomyItem(name: string, items: { id: string, nombre: string }[]): { bestMatch: any, confidence: number }`: Helper para resolver la mejor coincidencia en base a umbrales estrictos de longitud (>3 letras para fuzzy) y porcentaje de confianza (>85%).

### 2. `frontend/src/components/inventario/bulk-importer.tsx` [MODIFY]
* Ampliar el estado para incluir:
  * `mappingState`: para gestionar la confirmación interactiva de marcas y rubros detectados.
  * Habilitación dinámica de campos de mapeo adicionales si `defaultMarcaId` o `defaultFamiliaId` es `_csv_mapped_`.
* Implementar el paso intermedio de confirmación interactiva de correspondencias.
* Implementar el pipeline atómico de importación:
  1. Validación total en cliente.
  2. Creación masiva en lote de nuevas marcas/rubros y obtención de IDs.
  3. Mapeo de registros y subida en bloque (Upsert).

### 3. `frontend/src/app/protected/(dashboard)/inventario/__tests__/inventory-logic.test.ts` [MODIFY]
Incorporar suite completa de pruebas unitarias robustas (TDD) para validar:
* La precisión del algoritmo Levenshtein.
* La normalización sintáctica estricta.
* El bloqueo de falsos positivos en marcas de 3 letras o menos (ej. `TRW` vs `TWM`).

---

## Mitigación de Fallas y Resiliencia

* **Performance**: Dado que las tablas maestras de marcas y familias son extremadamente pequeñas (< 1.000 registros), se descargan en un solo bloque inicial a memoria del cliente. El cruce es instantáneo ($O(N)$) y no realiza consultas individuales HTTP recurrentes.
* **Atomicidad e Idempotencia**: La inserción de artículos utiliza la cláusula `onConflict: "codigo_fabricante"` nativa de InsForge SDK. Si el proceso falla por pérdida de red, no se duplican registros al reintentar.
* **Control de Errores de Tipeo**: El paso intermedio visual es el escudo definitivo. El usuario tiene control visual total y la última palabra sobre las marcas nuevas a crearse en su base de datos.
