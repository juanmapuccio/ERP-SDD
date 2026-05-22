# Checklist de Tareas: Importación Masiva Dinámica

Checklist de ejecución secuencial en Strict TDD Mode para la funcionalidad del resolvedor interactivo de taxonomías.

## Fase 1: Base de Negocio y Pruebas Unitarias (TDD)
- [x] Escribir tests unitarios en `inventory-logic.test.ts` para las utilidades del resolvedor:
  - [x] Test para `normalizeTaxonomyName` (remoción de acentos, trim, eliminación de sufijos `S.A.`, `SRL`, `LTD`, etc.).
  - [x] Test para `calculateSimilarity` (distancia Levenshtein en navegador).
  - [x] Test para `matchTaxonomyItem` (resolución exacta y fuzzy $\ge 0.85$, bloqueo estricto de falsos positivos en palabras de $\le 3$ letras).
- [x] Correr tests de Vitest y verificar que fallen adecuadamente (Red Stage).
- [x] Implementar las funciones puras en `inventory-utils.ts`:
  - [x] `normalizeTaxonomyName`.
  - [x] `calculateSimilarity`.
  - [x] `matchTaxonomyItem`.
- [x] Correr tests de Vitest y verificar que pasen exitosamente (Green Stage).

## Fase 2: Componente UI/UX en Next.js (`BulkImporter`)
- [x] Modificar los dropdowns de Marca y Rubro en `bulk-importer.tsx` para incluir la opción `"-- Mapear dinámicamente desde el CSV --"` (`_csv_mapped_`).
- [x] Adaptar la lista `fields` de mapeo de columnas para inyectar dinámicamente `marca_nombre` y `familia_nombre` si se activa el mapeo dinámico en los dropdowns.
- [x] Diseñar el paso intermedio **Taxonomy Matcher Dialog (Paso 2.5)** en el HTML/TSX del componente.
  - [x] Tabla de confirmación Obsidian Dark + Amber con badges de confianza (verde, amarillo, gris).
  - [x] Dropdowns de asociación manual apuntando a marcas/rubros del store y opción "Crear nueva".
- [x] Implementar el pipeline de procesamiento e inserción atómica y resiliente:
  - [x] Dry-run sintáctico en frontend para validar todo antes de tocar la base de datos.
  - [x] Inserción masiva en lote única para nuevas marcas y familias registradas.
  - [x] Mapeo de IDs finales a cada registro en memoria.
  - [x] Inserción masiva final (Bulk Upsert) de artículos con resolución de colisiones por SKU.

## Fase 3: Validación y Cierre
- [x] Ejecutar la suite completa de tests de frontend (`bun run test`) para garantizar cero regresiones.
- [ ] Compilar y levantar la app en local (`bun dev`) y hacer una importación manual de prueba con repuestos mezclados.
- [ ] Crear el reporte de verificación (`verify-report.md`) y el walkthrough final.
