# Especificación de Requerimientos: Módulo de Inventario Autopartista (`sdd-spec`)

Este documento detalla las especificaciones de comportamiento, casos de uso, flujos y validaciones que debe cumplir el módulo de Inventario y Compatibilidades en la UI.

## 1. Historias de Usuario (User Stories)

### US-1: Dashboard de Inventario Altamente Eficiente
Como **vendedor o administrador**, quiero ver una lista compacta y limpia de todos los artículos para poder controlar stock, ubicaciones y precios al instante sin saturación visual.
- **Criterio de Aceptación 1**: La grilla debe mostrar columnas críticas: SKU, Código Fabricante, Descripción, Marca de Repuesto, Ubicación, Stock y Precios.
- **Criterio de Aceptación 2**: El stock debe cambiar de color sutilmente según su criticidad:
  - Stock > Stock Mínimo -> Círculo verde esmeralda.
  - Stock <= Stock Mínimo y > 0 -> Insignia ámbar.
  - Stock = 0 -> Texto en rojo con badge "Sin Stock".
- **Criterio de Aceptación 3**: El buscador general debe filtrar instantáneamente por coincidencia difusa del vector de búsqueda pre-agregado (ej: si busco "filtro renault clio", debe traer todos los filtros que sean compatibles con Renault Clio).

### US-2: Carga y Edición Rápida con Panel Lateral (Drawer)
Como **administrador o coordinador**, quiero dar de alta o editar artículos en un panel lateral deslizante sin perder de vista la lista principal del inventario.
- **Criterio de Aceptación 1**: El panel debe abrirse de forma fluida desde el lateral derecho.
- **Criterio de Aceptación 2**: Los campos de precio de venta (minorista/mayorista) deben calcularse automáticamente en tiempo real basándose en el precio de costo y un porcentaje de margen/rentabilidad ingresado por el usuario (y viceversa).
- **Criterio de Aceptación 3**: Las opciones de marcas y familias de repuestos se eligen desde combos dropdown que permiten buscar por texto interactivo en caliente.

### US-3: Asociación de Compatibilidades en Segundos (Multi-Fitment Chipboard)
Como **administrador o coordinador**, quiero asociar múltiples vehículos compatibles a un repuesto de forma ágil y visual.
- **Criterio de Aceptación 1**: El componente de compatibilidades debe ser una barra de búsqueda inteligente donde escribo (ej: "corsa 1.4").
- **Criterio de Aceptación 2**: Al escribir, debe hacer autocompletado contra el catálogo de versiones vehiculares normalizado (`auto_version` JOIN `auto_modelo` JOIN `auto_marca`).
- **Criterio de Aceptación 3**: Al seleccionar una versión, debe agregarse un chip interactivo de la forma `[ Marca > Modelo > Motor > Año [x] ]`. Al hacer clic en `[x]`, se elimina la relación de compatibilidad.

### US-4: Importación Inteligente Drag-and-Drop (Smart Mapper)
Como **contador o administrador**, quiero arrastrar un archivo CSV de un proveedor para cargar o actualizar cientos de artículos de forma masiva y segura.
- **Criterio de Aceptación 1**: El importador debe permitir arrastrar y soltar un archivo CSV o Excel.
- **Criterio de Aceptación 2**: Debe ofrecer una grilla interactiva para mapear las columnas del archivo subido con los campos de la base de datos de forma visual.
- **Criterio de Aceptación 3**: Debe validar en caliente los datos antes de insertarlos (ej: verificar si los códigos existen, si los precios son válidos) y mostrar marcas rojas en las celdas con errores en una grilla interactiva para que el usuario pueda corregirlos ahí mismo en pantalla.

---

## 2. Reglas de Validación de Formularios (UI & API)

| Campo | Tipo | Obligatorio | Validación / Comportamiento |
|---|---|---|---|
| `codigo_fabricante` | Texto | Sí | Al menos 3 caracteres. Combinación única con `marca_id` en la DB. |
| `descripcion` | Texto | Sí | Mínimo 10 caracteres. |
| `marca_id` | UUID | Sí | Debe existir en la tabla `marca`. |
| `familia_id` | UUID | Sí | Debe existir en la tabla `familia_repuesto`. |
| `precio_costo` | Decimal | Sí | Mayor o igual a 0.00. |
| `precio_minorista` | Decimal | Sí | Calculado como `costo * (1 + margen_min / 100)`. Mayor que costo. |
| `precio_mayorista` | Decimal | Sí | Calculado como `costo * (1 + margen_may / 100)`. Mayor que costo. |
| `stock_actual` | Entero | Sí | Mayor o igual a 0. Defecto: 0. |
| `stock_minimo` | Entero | Sí | Mayor o igual a 0. Defecto: 5. |

---

## 3. Flujo y Manejo de Casos de Borde (Edge Cases)

### Caso de Borde 1: El CSV de carga masiva tiene una Marca o Familia que no existe en el sistema
- **Especificación**: En lugar de rechazar la carga completa, el `bulk-importer.tsx` mostrará una advertencia al mapear: *"Se detectaron marcas nuevas en el archivo (ej: 'Vapren'). ¿Querés que las creemos automáticamente en el catálogo?"*. Si el usuario acepta, se crean primero las entidades asociadas y luego se importan los artículos. Si no, se pueden remapear a una marca existente en pantalla.

### Caso de Borde 2: Se intenta agregar una compatibilidad que ya está asociada al artículo
- **Especificación**: El componente `fitment-selector.tsx` filtrará automáticamente los vehículos que ya están seleccionados para que no aparezcan en la lista de sugerencias. Si se intenta agregar por error, el sistema vibrará levemente el chip existente para indicar que ya está cargado y no duplicará la relación en el array.

### Caso de Borde 3: Búsqueda con cero resultados y sugerencia inteligente
- **Especificación**: Si el vendedor tipea un repuesto con una falta de ortografía o un modelo inexistente (ej: `"amortiguador peugot 209"`), el sistema sugerirá la palabra correcta más cercana mediante un motor difuso del lado del cliente o sugerencia PostgreSQL (`"¿Quisiste decir 'amortiguador peugeot 208'?"`).

---

## 4. Contratos de Comunicación (Supabase Client)

### Inserción de Artículo Individual
```typescript
const { data, error } = await supabase
  .from('articulo')
  .insert([{
    codigo_fabricante: 'PH4722',
    descripcion: 'Filtro de Aceite Chevrolet Corsa 1.4/1.6',
    marca_id: 'marca-uuid-aquí',
    familia_id: 'familia-uuid-aquí',
    precio_costo: 3500.00,
    precio_minorista: 5250.00,
    precio_mayorista: 4550.00,
    stock_actual: 45,
    stock_minimo: 10,
    ubicacion_deposito: 'Estantería B4'
  }]);
```

### Relación de Compatibilidad (Many-to-Many)
```typescript
const { data, error } = await supabase
  .from('articulo_compatibilidad')
  .insert(
    versionUuids.map(versionId => ({
      articulo_id: articuloId,
      auto_version_id: versionId
    }))
  );
```
