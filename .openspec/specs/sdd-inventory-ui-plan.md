# Plan de Implementación: Módulo de Inventario Autopartista y Compatibilidades (UI/UX)

Este plan detalla el diseño técnico, las vistas de interfaz, la lógica del lado del cliente y las migraciones de base de datos necesarias para implementar un módulo de Inventario premium, intuitivo y minimalista en el ERP Nodo Sur.

## 1. Objetivos del Módulo

- **Densidad Limpia (Clean-Density)**: Una grilla de stock interactiva que muestre SKU, Código de Fabricante, Descripción, Marca, Familia, Ubicación, Stock (con colores semánticos de alerta) y Precios de forma despejada.
- **Selector de Compatibilidad Multivehículo (Multi-Fitment Chipboard)**: Interfaz intuitiva para asociar un artículo a múltiples marcas, modelos y versiones de vehículos en segundos.
- **Importación Masiva (Smart Mapper Grid)**: Mapeador visual de columnas CSV para carga masiva sin fallas y con preview en caliente.
- **Búsqueda Instantánea e Inteligente**: Integración de consultas de coincidencia múltiple sobre un vector de búsqueda pre-agregado en PostgreSQL.

---

## 2. Decisiones de Arquitectura e Infraestructura

### DDL & Migración de Base de Datos (Supabase)
Para implementar las tablas del catálogo autopartista y el disparador (trigger) de búsqueda pre-agregada en PostgreSQL, ejecutaremos las siguientes sentencias DDL en Supabase:

```sql
-- 1. Habilitar extensión trigram (si no está activa)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 2. Crear tablas de soporte del catálogo
CREATE TABLE IF NOT EXISTS marca (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    pais_origen VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS familia_repuesto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS grupo_equivalencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descripcion VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Rediseñar/Extender Artículos (Core del Inventario)
CREATE TABLE IF NOT EXISTS articulo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    codigo_fabricante VARCHAR(100) NOT NULL,
    codigo_barras VARCHAR(100),
    descripcion TEXT NOT NULL,
    marca_id UUID NOT NULL REFERENCES marca(id) ON DELETE RESTRICT,
    familia_id UUID NOT NULL REFERENCES familia_repuesto(id) ON DELETE RESTRICT,
    grupo_equivalencia_id UUID REFERENCES grupo_equivalencia(id) ON DELETE SET NULL,
    precio_costo NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    precio_minorista NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    precio_mayorista NUMERIC(12, 2) DEFAULT 0.00 NOT NULL,
    stock_actual INTEGER DEFAULT 0 NOT NULL,
    stock_minimo INTEGER DEFAULT 5 NOT NULL,
    ubicacion_deposito VARCHAR(100),
    tsv_busqueda tsvector, -- Vector pre-agregado de búsqueda
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_articulo_codigo_marca UNIQUE (codigo_fabricante, marca_id)
);

-- 4. Crear tablas de compatibilidad vehicular
CREATE TABLE IF NOT EXISTS auto_marca (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS auto_modelo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    marca_id UUID NOT NULL REFERENCES auto_marca(id) ON DELETE CASCADE,
    nombre VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_modelo_marca UNIQUE (nombre, marca_id)
);

CREATE TABLE IF NOT EXISTS auto_version (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modelo_id UUID NOT NULL REFERENCES auto_modelo(id) ON DELETE CASCADE,
    motorizacion VARCHAR(100) NOT NULL,
    anio_desde INTEGER NOT NULL,
    anio_hasta INTEGER, -- NULL indica en producción
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS articulo_compatibilidad (
    articulo_id UUID NOT NULL REFERENCES articulo(id) ON DELETE CASCADE,
    auto_version_id UUID NOT NULL REFERENCES auto_version(id) ON DELETE CASCADE,
    observaciones VARCHAR(255),
    PRIMARY KEY (articulo_id, auto_version_id)
);

-- 5. Índices de Trigramas y GIN
CREATE INDEX IF NOT EXISTS idx_articulo_tsv ON articulo USING GIN(tsv_busqueda);

-- 6. Trigger de Sincronización Automática del Buscador
CREATE OR REPLACE FUNCTION fn_sincronizar_busqueda_articulo()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE articulo a
    SET tsv_busqueda = 
        setweight(to_tsvector('spanish', coalesce(a.codigo_fabricante, '')), 'A') ||
        setweight(to_tsvector('spanish', coalesce(a.descripcion, '')), 'B') ||
        setweight(to_tsvector('spanish', coalesce(m.nombre, '')), 'C') ||
        setweight(to_tsvector('spanish', coalesce(f.nombre, '')), 'C') ||
        setweight(to_tsvector('spanish', coalesce(
            (SELECT string_agg(am.nombre || ' ' || amd.nombre || ' ' || av.motorizacion, ' ')
             FROM articulo_compatibilidad ac
             JOIN auto_version av ON ac.auto_version_id = av.id
             JOIN auto_modelo amd ON av.modelo_id = amd.id
             JOIN auto_marca am ON amd.marca_id = am.id
             WHERE ac.articulo_id = a.id)
        , '')), 'D')
    FROM marca m
    JOIN familia_repuesto f ON a.familia_id = f.id
    WHERE a.id = COALESCE(NEW.articulo_id, OLD.articulo_id, NEW.id, OLD.id) 
      AND a.marca_id = m.id;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Asignar triggers a los cambios en compatibilidades y artículos
CREATE TRIGGER tg_sync_busqueda_compatibilidad
AFTER INSERT OR UPDATE OR DELETE ON articulo_compatibilidad
FOR EACH ROW EXECUTE FUNCTION fn_sincronizar_busqueda_articulo();

CREATE TRIGGER tg_sync_busqueda_articulo
AFTER INSERT OR UPDATE ON articulo
FOR EACH ROW EXECUTE FUNCTION fn_sincronizar_busqueda_articulo();
```

---

## 3. Propuesta de UI/UX (Componentes React/Next.js)

Diseñaremos una interfaz compuesta por 4 sub-componentes modulares dentro de `frontend/src/components/inventario/`:

### A. Panel de Control de Inventario (`inventory-list.tsx`)
- Tabla de densidad limpia con paginación, carga diferida y ordenación de columnas.
- Alertas visuales basadas en stock:
  - Stock actual > Stock mínimo: Punto verde sutil.
  - Stock actual <= Stock mínimo y > 0: Alerta ámbar suave.
  - Stock actual = 0: Insignia roja ("Sin Stock").
- Acciones rápidas en línea: Ajuste rápido de stock directo en la grilla y edición de precios de venta.

### B. Formulario de Carga y Edición (`add-part-dialog.tsx`)
- Panel deslizante lateral (Drawer/Modal) para no perder el contexto de la lista.
- Formulario dividido en secciones lógicas:
  1.  **Datos del Repuesto**: Código fabricante, barras, marca (selector dropdown), familia (selector dropdown).
  2.  **Precios y Stock**: Costo, márgenes/precios mayorista y minorista (cálculo en tiempo real mediante inputs entrelazados), stock inicial y mínimo, ubicación en estantería.
  3.  **Compatibilidad y Equivalencias**: Integración de los selectores avanzados.

### C. Selector de Compatibilidades (`fitment-selector.tsx`)
- Buscador interactivo rápido tipo tagging.
- El usuario tipea la marca/modelo/versión del auto (ej: "Fiat Cronos 1.3").
- Mediante autocompletado en caliente busca contra la base de datos de Supabase.
- Al seleccionar la versión, renderiza un chip interactivo con un botón `[x]` para desasociar.
- Admite múltiples chips. También permite asociar compatibilidades genéricas (ej: *"Compatible con todas las marcas y modelos"* asignando un flag especial).

### D. Smart Mapper Importer (`bulk-importer.tsx`)
- Drag-and-drop con soporte para archivos CSV/JSON.
- Mapeador de columnas visual e interactivo:
  - Muestra las columnas detectadas en el CSV (ej: "Código", "Precio de Venta", "Descripción").
  - Ofrece desplegables para asociarlas a los atributos de la base de datos de Supabase.
- Mapea las relaciones en caliente: Si el CSV tiene nombres de marcas o familias en texto libre, busca coincidencias difusas y te permite asociarlas en el momento (o crearlas nuevas).
- Muestra una grilla editable interactiva con los primeros registros para corregir errores ortográficos en caliente antes de procesar el bulk insert.

---

## 4. Plan de Trabajo

### Fase 1: Base de Datos & Datos Semilla (Sembrado)
1.  Ejecutar el DDL en Supabase para crear la estructura relacional de catálogo, vehículos, trigramas e índices GIN.
2.  Sembrar datos de prueba iniciales:
    - **Marcas de Repuestos**: `Corven`, `FRAM`, `Bosch`, `MANN-FILTER`.
    - **Familias**: `Filtros`, `Frenos`, `Suspensión`, `Motor`.
    - **Marcas de Auto**: `Peugeot`, `Renault`, `Chevrolet`, `Fiat`.
    - **Modelos**: `208`, `Clio`, `Corsa`, `Cronos`.
    - **Versiones**: Motorizaciones clásicas (ej: `1.6 16v`, `1.4 HDi`, `1.3 Firefly`) con sus respectivos rangos de años.

### Fase 2: Componentes Core de UI
1.  Implementar `fitment-selector.tsx` (selector inteligente de compatibilidades).
2.  Implementar `add-part-dialog.tsx` con el formulario dinámico paso a paso.
3.  Implementar `bulk-importer.tsx` para la importación interactiva CSV.

### Fase 3: Integración en Pantalla Principal
1.  Actualizar `frontend/src/app/protected/(dashboard)/inventario/page.tsx` para ensamblar el panel de control, los filtros sticky y vincular los diálogos de creación e importación masiva.
2.  Vincular la API de búsqueda basada en el vector `tsv_busqueda` con el input de búsqueda general.

---

## 5. Plan de Verificación y Testing (Strict TDD)

### Pruebas de Integración (Base de Datos & SDK)
-   **Compatibilidades**: Testear que al asociar un artículo a tres versiones diferentes de vehículos, la tabla `articulo_compatibilidad` registre exactamente tres filas asociadas a ese `articulo_id`.
-   **Pre-agregado FTS**: Validar mediante tests unitarios de SQL que el trigger se dispare correctamente al realizar inserciones y que al consultar `tsv_busqueda` retorne el vector de texto combinado incluyendo la marca del vehículo compatible.

### Pruebas Unitarias de UI (Vitest)
-   **Cálculo de Precios**: Validar que la lógica de cálculo automático de precio minorista/mayorista basada en porcentaje de rentabilidad sobre el costo funcione exactamente según los estándares definidos.
-   **Tokenizador CSV**: Validar que el parser de CSV en `bulk-importer.tsx` procese correctamente archivos delimitados por comas o punto y comas, y devuelva la estructura de objetos requerida por el cliente de Supabase (`[{...}]`).
