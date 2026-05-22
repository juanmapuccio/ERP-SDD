# Propuesta: Formato de Fechas Consistente en Español (`zenerp-date-format`)

## 1. Descripción del Objetivo

El objetivo de esta propuesta es asegurar que el ingreso de fechas en el formulario de asientos contables (`TransactionForm.tsx`) se realice estrictamente en el formato local y profesional **Día/Mes/Año** (`DD/MM/YYYY`), anulando el comportamiento nativo del navegador que forzaba el formato `MM/DD/YYYY` en sistemas configurados en inglés.

Implementaremos un campo de entrada de texto premium con **máscara inteligente dinámica** y **validación en tiempo real**. El usuario visualizará y cargará la fecha exactamente como `dd/mm/aaaa`, mientras que el componente se encargará de traducir este valor al estándar ISO (`YYYY-MM-DD`) requerido por nuestro backend de Go y las APIs contables.

---

## 2. Cambios Propuestos de Alto Nivel

### Frontend (Next.js, React, TypeScript)
1. **Rediseño del Componente de Fecha en `TransactionForm.tsx`**:
   - Reemplazar el `<input type="date" />` nativo por un `<input type="text" />` estilizado con soporte de máscara de entrada interactiva.
   - La máscara formateará el input automáticamente agregando las barras divisorias `/` a medida que el usuario escribe sus 8 dígitos numéricos (ej. `17052026` se convierte visualmente en `17/05/2026`).
   - Permitir correcciones fluidas con la tecla de retroceso (Backspace).
2. **Validación Semántica y Feedback Visual**:
   - Añadir validación en tiempo real de días en el mes correspondiente (ej. impedir que se ingrese `31/04/2026` ya que abril tiene 30 días, o validar años bisiestos para febrero).
   - Renderizar un indicador sutil y elegante: un icono de confirmación en verde esmeralda (`✓`) cuando la fecha es totalmente válida, o una advertencia en tono ámbar cuando está incompleta o es inválida.
3. **Persistencia e Integración**:
   - Inicializar el estado visual (`displayDate`) con la fecha de hoy formateada localmente en `DD/MM/YYYY`.
   - Al enviar el formulario, traducir de manera transparente `DD/MM/YYYY` a `YYYY-MM-DD` para la API contable.
4. **Actualización de Pruebas Unitarias**:
   - Añadir una nueva prueba de validación y máscara de fecha en `frontend/src/components/__tests__/Accounting.test.tsx` para garantizar que la máscara no rompa la coherencia del estado y se envíe la fecha ISO correcta al backend.

---

## 3. Decisiones de Diseño y Compensaciones

| Decisión de Diseño | Opción Elegida | Compensación |
|---|---|---|
| **Estrategia de Input** | Entrada de texto de una sola línea con máscara inteligente dinámica. | **Pros**: Formato y orden estricto `DD/MM/YYYY` 100% garantizado en cualquier sistema. Cero uso del ratón necesario. **Cons**: No despliega el calendario nativo del sistema, pero es la opción preferida por los contadores profesionales por su velocidad de carga. |
| **Validación Semántica** | Lógica de validación manual en TypeScript. | **Pros**: Extremadamente rápida, sin importar librerías pesadas como moment o date-fns. Control total sobre los mensajes de error en español del ERP. **Cons**: Requiere escribir la lógica de días del mes, lo cual es simple y seguro de implementar. |

---

## 4. Alineación / Feedback del Usuario

> [!NOTE]
> Esta solución garantiza que la interfaz mantenga el más alto nivel visual (*ERP Nodo Sur Classic*), eliminando el molesto texto en inglés de los placeholders del navegador nativo (`mm/dd/yyyy`) y reemplazándolo con una estética consistente y profesional en español.
