# Especificación Técnica: Módulo de Ventas y Terminal Punto de Venta (POS) (`sdd-sales-pos-spec`)

Este documento define las especificaciones de diseño técnico, estándares de industria y modelo de datos para la terminal de facturación y punto de venta (POS) del ERP Nodo Sur.

---

## 1. Estándares de la Industria (Auto-Parts Retail POS)

Para construir una terminal de ventas automotriz de clase mundial, nos basamos en los estándares y mejores prácticas de la industria:

1. **Búsqueda Multidimensional Integrada**: Los sistemas POS de repuestos requieren buscar de forma simultánea por código de fabricante, descripción, equivalencias y compatibilidad de vehículos. No es una simple búsqueda de texto; requiere cruzar compatibilidades de motorización de forma instantánea.
2. **Navegación por Teclado de Alta Densidad (Keyboard-First)**: En mostrador, el uso del mouse ralentiza el despacho. El POS debe ser totalmente gobernable mediante atajos de teclado (F9 para facturar, F2 para buscar cliente, Tabulación e inputs numéricos rápidos).
3. **Inmutabilidad Fiscal en Renglones**: Los datos del catálogo (descripción, marcas, precios) cambian frecuentemente. Una vez emitido el comprobante, el detalle facturado se congela en un formato inmutable (JSONB en base de datos) para evitar que cambios posteriores del catálogo alteren el histórico del comprobante impreso.
4. **Descuento Atómico de Inventario**: Al confirmar el comprobante, se realiza un decremento atómico del stock disponible. Si el stock es insuficiente, el sistema debe alertar, pero permitir la preventa si está parametrizado.

---

## 2. Modelo de Datos y Backend (Supabase)

El módulo interactúa con tres entidades core: `articulo` (catálogo), `customers` (clientes) y `afip_vouchers` (comprobantes fiscales).

### Estructura de Renglones Facturados (`items` JSONB)
En la tabla `afip_vouchers`, el campo `items` almacena la lista inmutable de repuestos vendidos:

```json
[
  {
    "id": "uuid",
    "codigo": "character varying",
    "descripcion": "text",
    "cantidad": "integer",
    "precio_unitario": "numeric",
    "alicuota_iva": "numeric (e.g. 21.0 o 10.5)",
    "subtotal": "numeric"
  }
]
```

### Lógica de Transacción (Descuento de Stock)
Al confirmar una factura, el cliente de Supabase realiza de forma secuencial:
1. Verificación de stock disponible (`stock_actual` en `articulo`).
2. Descuento del stock de cada artículo vendido:
   ```typescript
   await supabase
     .from('articulo')
     .update({ stock_actual: nuevoStock })
     .eq('id', articuloId);
   ```
3. Inserción del comprobante fiscal autorizado en `afip_vouchers`:
   ```typescript
   await supabase
     .from('afip_vouchers')
     .insert([{
       id: numFactura,
       type: "Factura A" | "Factura B" | "Factura C",
       company_cuit: activeCompany.cuit,
       client_cuit: cliente.cuit,
       client_name: cliente.razon_social,
       net_amount: neto,
       iva_amount: iva,
       total_amount: total,
       cae: caeGenerado,
       cae_expiration: vtoCae,
       qr_link: qrLink,
       items: listaArticulosJSONB
     }]);
   ```

---

## 3. Arquitectura del Estado (Zustand Store)

El estado global de la terminal de facturación en curso se gestionará mediante el store `useSalesStore`:

```typescript
interface CartItem {
  id: string;
  codigo_fabricante: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  precio_tipo: "minorista" | "mayorista";
  alicuota_iva: number; // 21 o 10.5
}

interface SalesState {
  // Estado del Carrito
  cart: CartItem[];
  
  // Cliente Seleccionado
  clientCuit: string;
  clientName: string;
  clientIvaCondition: string; // "Responsable Inscripto" | "Consumidor Final" | "Monotributista"
  
  // Metadatos
  voucherType: "Factura A" | "Factura B" | "Factura C";
  isSubmitting: boolean;

  // Acciones
  addItem: (item: any, precioTipo: "minorista" | "mayorista") => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;
  setClient: (cuit: string, name: string, condition: string) => void;
  setVoucherType: (type: "Factura A" | "Factura B" | "Factura C") => void;
  clearSales: () => void;
}
```

---

## 4. Diseño de Interfaz de Usuario POS (UI/UX)

La terminal de facturación contará con una distribución de **doble panel de alta densidad** con visualización premium oscura y acentos ámbar:

1. **Panel de Búsqueda y Selección (Izquierda - 60% ancho)**:
   - Entrada de búsqueda predictiva con soporte para escáner de código de barras.
   - Grilla compacta de repuestos que muestra de un vistazo: Código, Marca, Descripción, Ubicación, Stock Físico (con badge verde de normal o rojo de bajo stock), y botones directos para cargar a **Precio Minorista** o **Precio Mayorista**.
2. **Panel de Checkout y Facturación (Derecha - 40% ancho)**:
   - Ficha de Cliente rápida: Input de CUIT con botón de autocompletado en base de datos.
   - Selector del tipo de Factura (A, B o C), con auto-selección inteligente basada en la condición de IVA del cliente (ej. si es Responsable Inscripto se bloquea en Factura A).
   - Tabla compacta de Renglones del Carrito con inputs numéricos para editar cantidades y botón de remoción rápida.
   - Desglose detallado de importes: Subtotal Neto, IVA (21%), IVA (10.5%), y el gran Total a abonar.
   - Botón masivo **"Autorizar y Emitir Factura Electrónica (F9)"**: Acción de confirmación con animación de spinner simulando la llamada al Web Service de la AFIP.

---

## 5. Pruebas y Aseguramiento (Strict TDD)

- **Cómputo de Totales**: Validar que la suma de subtotales, desgloses de alícuotas del 21% y 10.5%, y montos finales sean aritméticamente exactos en centavos.
- **Validación de Condición Fiscal**: Pruebas unitarias que verifiquen que un cliente con IVA "Responsable Inscripto" emita por defecto una "Factura A" y discrimine el IVA, mientras que un "Consumidor Final" emita "Factura B" con IVA incluido en el precio unitario.
- **Límite de Stock**: Validar que al intentar agregar una cantidad superior al `stock_actual` disponible, se lance una advertencia visual preventiva.
