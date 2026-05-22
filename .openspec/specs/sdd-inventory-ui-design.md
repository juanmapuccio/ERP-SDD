# Diseño Técnico: Arquitectura de UI, Componentes y Migraciones (`sdd-design`)

Este documento especifica la arquitectura de componentes, las interfaces de TypeScript, el estado del lado del cliente y las consultas de migración de base de datos detalladas para el módulo de Inventario y Compatibilidades.

## 1. Estructura de Archivos del Módulo

Ubicaremos cada componente en directorios lógicos y aislados para facilitar la reutilización y modularidad (Atomic / Container-Presentational Pattern):

```text
frontend/src/
├── components/
│   └── inventario/
│       ├── add-part-drawer.tsx      # Contenedor del Drawer deslizante lateral
│       ├── bulk-importer.tsx        # Panel de carga masiva drag-and-drop
│       ├── fitment-selector.tsx     # Selector de vehículos con tagging
│       └── inventory-table.tsx      # Grilla compacta de alta densidad
├── lib/
│   ├── store/
│   │   └── use-inventory-store.ts   # Estado global Zustand del inventario
│   └── supabase.ts                  # Cliente de Supabase inicializado
└── app/
    └── protected/
        └── (dashboard)/
            └── inventario/
                └── page.tsx         # Vista principal contenedora
```

---

## 2. Definición de Interfaces y Props (TypeScript)

### A. Selector de Compatibilidades (`fitment-selector.tsx`)
```typescript
export interface VehicleFitment {
  id: string;
  marca: string;
  modelo: string;
  motorizacion: string;
  anioDesde: number;
  anioHasta?: number;
}

export interface FitmentSelectorProps {
  selectedFitments: VehicleFitment[];
  onChange: (fitments: VehicleFitment[]) => void;
}
```

### B. Mapeador e Importador de CSV (`bulk-importer.tsx`)
```typescript
export interface CSVColumnMapping {
  csvHeader: string;
  targetField: string; // SKU, Descripcion, Marca, Familia, Costo, Minorista, etc.
}

export interface BulkImporterProps {
  isOpen: boolean;
  onClose: () => void;
  onImportComplete: () => void;
}
```

### C. Drawer Deslizante Lateral (`add-part-drawer.tsx`)
```typescript
export interface AddPartDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  articleToEdit?: {
    id: string;
    codigo_fabricante: string;
    codigo_barras?: string;
    descripcion: string;
    marca_id: string;
    familia_id: string;
    grupo_equivalencia_id?: string;
    precio_costo: number;
    precio_minorista: number;
    precio_mayorista: number;
    stock_actual: number;
    stock_minimo: number;
    ubicacion_deposito?: string;
    compatibilidades: VehicleFitment[];
  };
}
```

### D. Grilla de Stock y Control (`inventory-table.tsx`)
```typescript
export interface InventoryTableProps {
  searchQuery: string;
  activeFilters: {
    marca_id?: string;
    familia_id?: string;
    stockStatus?: 'all' | 'normal' | 'low' | 'none';
  };
  onEditArticle: (articleId: string) => void;
}
```

---

## 3. Gestión de Estado Global (Zustand: `use-inventory-store.ts`)

Para evitar prop-drilling y simplificar el flujo de datos entre los filtros del dashboard, la tabla y los modales, implementamos un store centralizado de Zustand:

```typescript
import { create } from 'zustand';

interface InventoryState {
  // Datos
  articles: any[];
  brands: any[];
  families: any[];
  isLoading: boolean;
  
  // Estado de Selección / UI
  selectedArticleId: string | null;
  isAddDrawerOpen: boolean;
  isBulkImporterOpen: boolean;

  // Filtros
  searchQuery: string;
  selectedBrandId: string | null;
  selectedFamilyId: string | null;
  stockFilter: 'all' | 'normal' | 'low' | 'none';

  // Acciones
  setSearchQuery: (query: string) => void;
  setBrandFilter: (id: string | null) => void;
  setFamilyFilter: (id: string | null) => void;
  setStockFilter: (status: 'all' | 'normal' | 'low' | 'none') => void;
  
  fetchArticles: () => Promise<void>;
  fetchMetadata: () => Promise<void>;
  updateStock: (id: string, newStock: number) => Promise<void>;
  openAddDrawer: (articleId?: string) => void;
  closeAddDrawer: () => void;
}
```

---

## 4. Migración de Base de Datos (DDL Completo)

Ejecutaremos esta migración en Supabase para aprovisionar las tablas y triggers. Este DDL garantiza consistencia a nivel referencial y activa la búsqueda difusa pre-agregada:

```sql
-- Habilitar extensión pg_trgm para coincidencia parcial
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1. Tabla de Marcas de Repuestos
CREATE TABLE IF NOT EXISTS marca (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    pais_origen VARCHAR(50),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Tabla de Familias/Rubros
CREATE TABLE IF NOT EXISTS familia_repuesto (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    descripcion TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. Tabla de Grupos de Equivalencias (PIM)
CREATE TABLE IF NOT EXISTS grupo_equivalencia (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    descripcion VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. Tabla de Artículos
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
    tsv_busqueda tsvector,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT uq_articulo_codigo_marca UNIQUE (codigo_fabricante, marca_id)
);

-- 5. Tablas de Autos / Compatibilidades
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
    anio_hasta INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS articulo_compatibilidad (
    articulo_id UUID NOT NULL REFERENCES articulo(id) ON DELETE CASCADE,
    auto_version_id UUID NOT NULL REFERENCES auto_version(id) ON DELETE CASCADE,
    observaciones VARCHAR(255),
    PRIMARY KEY (articulo_id, auto_version_id)
);

-- Crear Índice GIN sobre el vector de búsqueda pre-agregado
CREATE INDEX IF NOT EXISTS idx_articulo_tsv ON articulo USING GIN(tsv_busqueda);

-- Función del Trigger para pre-agregar el buscador autopartista
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

-- Crear triggers
DROP TRIGGER IF EXISTS tg_sync_busqueda_compatibilidad ON articulo_compatibilidad;
CREATE TRIGGER tg_sync_busqueda_compatibilidad
AFTER INSERT OR UPDATE OR DELETE ON articulo_compatibilidad
FOR EACH ROW EXECUTE FUNCTION fn_sincronizar_busqueda_articulo();

DROP TRIGGER IF EXISTS tg_sync_busqueda_articulo ON articulo;
CREATE TRIGGER tg_sync_busqueda_articulo
AFTER INSERT OR UPDATE ON articulo
FOR EACH ROW EXECUTE FUNCTION fn_sincronizar_busqueda_articulo();
```
