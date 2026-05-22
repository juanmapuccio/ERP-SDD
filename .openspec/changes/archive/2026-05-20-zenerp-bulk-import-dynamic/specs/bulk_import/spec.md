# Especificación Funcional: Importación Masiva Dinámica (Taxonomy Mapper)

Especificación funcional detallada del comportamiento del resolvedor dinámico de marcas y rubros en el importador masiva del **ERP Nodo Sur**.

---

## 1. Comportamiento de la Interfaz de Usuario (UI/UX)

### 1.1 Modificaciones en el Wizard - Paso 2: Mapear Columnas
* Los dropdowns superiores de selección estática de **Marca de Repuesto** y **Rubro / Familia** tendrán como opción final:
  ```html
  <option value="_csv_mapped_">-- Mapear desde columna del CSV --</option>
  ```
* Si el operador selecciona `-- Mapear desde columna del CSV --` para Marca:
  * El estado de React `defaultMarcaId` toma el valor `"_csv_mapped_"`.
  * La lista de mapeos de columnas agrega dinámicamente el campo:
    ```typescript
    { label: "Marca de Repuesto *", key: "marca_nombre", required: true }
    ```
* Si el operador selecciona `-- Mapear desde columna del CSV --` para Rubro / Familia:
  * El estado `defaultFamiliaId` toma el valor `"_csv_mapped_"`.
  * La lista de mapeos de columnas agrega dinámicamente el campo:
    ```typescript
    { label: "Rubro / Familia *", key: "familia_nombre", required: true }
    ```

### 1.2 Paso Intermedio de Validación: Paso 2.5 (Confirmación de Correspondencias)
* Al presionar "Vista Previa", antes de avanzar al listado de artículos (Paso 3), el sistema verifica si existen mapeos dinámicos activos (`defaultMarcaId === "_csv_mapped_"` o `defaultFamiliaId === "_csv_mapped_"`).
* Si los hay, se activa la interfaz interactiva **Taxonomy Matcher Dialog**:
  * Muestra una tabla por cada taxonomía mapeada dinámicamente (Marcas / Rubros).
  * Por cada elemento único detectado en el CSV:
    * **Columna Izquierda**: Texto original del CSV (ej: `BOSCH S.A.`).
    * **Columna Central**: Estado y Sugerencia con colores de alerta:
      * **Verde (Confianza 100%)**: Coincidencia exacta o pre-asociación segura. *"Se asociará a Bosch (existente)"*.
      * **Amarillo (Confianza 80%-90%)**: Coincidencia difusa aproximada. *"Se sugiere asociar a Bosch (existente)"*.
      * **Gris (Nueva)**: Sin coincidencia. *"Se creará como nueva marca"*.
    * **Columna Derecha (Acción)**: Un selector dropdown con las marcas/rubros existentes más la opción *"Crear nueva marca"*, permitiendo al operador forzar una asociación manual en caso de discrepancia.
  * Botón **"Confirmar y Continuar"**: Al hacer clic, se almacena el mapa de correspondencias final (ej: `{'BOSCH S.A.': 'id-de-bosch-en-db', 'GATES': '_new_'}`) y se pasa al Paso 3 de Vista Previa de Artículos.

---

## 2. Reglas de Negocio y Algoritmo de Resolución

### 2.1 Normalización Sintáctica
Para limpiar las strings de marcas y rubros antes de la comparación, se aplica la función `normalizeTaxonomyName`:
1. Convierte a minúsculas (`toLowerCase()`).
2. Quita acentos y diacríticos (ej. `"Baterías"` ➡️ `"baterias"`).
3. Elimina espacios en blanco redundantes (`trim()` y `replace(/\s+/g, ' ')`).
4. Remueve sufijos y extensiones empresariales comunes (`s.a.`, `srl`, `ltd`, `s.a`, `s.r.l.`, `limitada`).
5. Quita caracteres especiales que no aporten al nombre.

### 2.2 Heurística Difusa (Distancia de Levenshtein)
Se calcula la distancia de edición entre la string normalizada del CSV ($S_{csv}$) y la string normalizada del ERP ($S_{erp}$):
$$\text{Similitud}(S_{csv}, S_{erp}) = 1 - \frac{\text{Distancia Levenshtein}(S_{csv}, S_{erp})}{\max(\text{length}(S_{csv}), \text{length}(S_{erp}))}$$

* **Longitud Guard**: Si la longitud de la palabra normalizada del CSV es menor o igual a 3 caracteres, el resolvedor **exige coincidencia exacta (100% similitud)**. Se prohíbe el match difuso en siglas para evitar falsos positivos críticos (ej. `TRW` vs `TWM`).
* **Umbral Difuso**: Si la similitud calculada es **$\ge 0.85$**, se pre-asocia automáticamente. Si es menor, se sugiere crear una nueva marca/rubro.

---

## 3. Integración con Base de Datos e InsForge SDK

### 3.1 Creación Atómica en Lotes
Para las marcas o rubros marcados como *"Crear nueva"* en la confirmación final:
1. Se genera un lote limpio deduplicado de marcas nuevas (ej. `[{ nombre: 'GATES', pais_origen: null }]`).
2. Se realiza una inserción masiva simple usando InsForge database client:
   ```typescript
   const { data, error } = await client.database
     .from("marca")
     .insert(nuevasMarcas)
     .select("id, nombre");
   ```
3. Se repite el proceso para `familia_repuesto`.
4. Se recopilan los IDs generados y se fusionan con las marcas/rubros ya existentes en el mapa de correspondencias definitivo.

### 3.2 Inserción de Artículos
Los artículos mapeados dinámicamente obtienen su `marca_id` y `familia_id` del mapa de correspondencias final.
* La inserción final se realiza de forma masiva sobre la tabla `articulo`:
  ```typescript
  const { error } = await client.database
    .from("articulo")
    .insert(validItems);
  ```
* Resiliencia: La inserción maneja de forma automática conflictos con SKU duplicados (`codigo_fabricante`) actualizando costos y cantidades para garantizar idempotencia.
