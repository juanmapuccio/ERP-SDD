# Exploración: Importación Masiva Dinámica (Multimarca y Multirubro)

Análisis exploratorio para habilitar la importación de planillas de repuestos conteniendo múltiples marcas y múltiples rubros en el catálogo de autopartes del **ERP Nodo Sur**.

## Estado Actual

El modal `BulkImporter` (`frontend/src/components/inventario/bulk-importer.tsx`) asume que todo el archivo CSV subido pertenece a una única marca y familia de repuestos elegida por el operador desde dropdowns fijos superiores:

```typescript
// bulk-importer.tsx
const [defaultMarcaId, setDefaultMarcaId] = useState("");
const [defaultFamiliaId, setDefaultFamiliaId] = useState("");
// ...
item.marca_id = defaultMarcaId;
item.familia_id = defaultFamiliaId;
```

Esta limitación fuerza a los operadores a segmentar manualmente las listas de precios de grandes distribuidoras y realizar múltiples importaciones repetitivas, destruyendo la productividad y abriendo margen para errores.

## Brecha Técnica e Implicancias en el Dominio

El rubro auto-partista no está estandarizado en planillas locales de distribuidores (e.g. en Warnes o distribuidores del interior). Cada distribuidor escribe los nombres de marcas y rubros con pequeñas variaciones tipográficas (ej. `"BOSCH"`, `"Bosch S.A."`, `"Gates"`, `"Gates Belts"`).

Si implementamos un resolvedor puramente automático sin intervención ni normalización, arriesgamos:
1. **Pérdida de Integridad Referencial**: Duplicación de marcas y rubros idénticos con diferentes nombres tipográficos en la base de datos local.
2. **Contaminación del Catálogo**: Datos sucios que afectarán las búsquedas en el mostrador rápido y los reportes de ventas/ganancia por marca.

## Componentes Clave Involucrados

1. **`frontend/src/components/inventario/bulk-importer.tsx`**: El componente React del modal que maneja el wizard de 3 pasos.
2. **`frontend/src/lib/inventory-utils.ts`**: El lugar ideal para alojar las utilidades de negocio de normalización de strings, resolvedores fuzzy (Levenshtein) y lógica de mapeo atómica.
3. **`frontend/src/lib/store/use-inventory-store.ts`**: El almacén Zustand que provee acceso a `brands` (`marca`), `families` (`familia_repuesto`), y las acciones de consulta y creación.

## Alternativas de Diseño Evaluadas

### Alternativa A: Resolución 100% Automática ("Caja Negra")
* **Descripción**: El frontend detecta la marca en el CSV y busca similitud en memoria. Si no coincide con nada por encima de un umbral, crea la marca en la DB automáticamente por detrás.
* **Tradeoffs**: Es súper fluida para el usuario inicial, pero extremadamente peligrosa. En pocos meses, el catálogo tendrá marcas fantasmas duplicadas por errores de tipeo en las planillas origen (`"BOSC"` en lugar de `"Bosch"`).

### Alternativa B: Enfoque Híbrido (Pre-resolución Inteligente + Paso de Validación) [RECOMENDADA]
* **Descripción**: El resolvedor analiza el CSV en memoria en un solo paso (`Dry-Run`). Aplica una heurística difusa (Fuzzy Levenshtein) para pre-asociar los nombres de marcas/rubros del CSV con los existentes en el ERP. Presenta al usuario una pantalla interactiva muy limpia en el wizard (Paso 2.5) donde el operador confirma o corrige las sugerencias antes de escribir en la DB.
* **Tradeoffs**:
  * **Integridad de Datos**: Garantía absoluta (100% Data Integrity).
  * **UX Premium**: El usuario siente que el ERP lo cuida y es inteligente al proponerle la correspondencia correcta pre-completada.
  * **Atomicidad**: Permite validar todo sintácticamente en el navegador antes de mandar el lote de inserciones a la base de datos de InsForge.

## Plan de Pruebas (Strict TDD Mode)

Cumpliendo la regla estricta de TDD del proyecto, diseñaremos casos de prueba unitarios en `inventory-logic.test.ts` con Vitest cubriendo:
* Cálculo correcto de distancia de edición (Levenshtein) para similitud de strings.
* Normalización sintáctica de nombres de taxonomías (eliminación de espacios, caracteres especiales, y sufijos tipo `S.A.` o `SRL`).
* Protección contra falsos positivos en siglas cortas (ej. `"TRW"` vs `"TWM"` no deben auto-asociarse).
