# Exploración Técnica: Formato de Fechas en el ERP Nodo Sur (`zenerp-date-format`)

Este documento detalla el análisis del comportamiento nativo del ingreso de fechas en el frontend del ERP Nodo Sur y describe la solución para forzar de manera consistente y premium el orden y formato de `Día/Mes/Año` (`DD/MM/YYYY`).

## 1. Estado Actual y Comportamiento del Navegador

### 1.1 El Campo de Fecha Nativo
En [TransactionForm.tsx](file:///c:/Users/juanr/OneDrive/Escritorio/Proyectos/Beast-Driven-Development/frontend/src/components/TransactionForm.tsx), la entrada de fecha está implementada mediante un elemento HTML5 nativo:
```typescript
<input
  type="date"
  value={date}
  onChange={(e) => setDate(e.target.value)}
  required
  className="..."
/>
```

### 1.2 El Problema de Localización (Gotcha Técnico)
- El elemento `<input type="date" />` nativo **delega la visualización del formato** (por ejemplo, `mm/dd/yyyy` o `dd/mm/yyyy`) enteramente a la configuración regional (locale) del sistema operativo y del navegador del usuario.
- Si un usuario tiene su navegador o sistema operativo en inglés (muy común en entornos de desarrollo o servidores), el campo se muestra forzadamente en formato estadounidense `mes/día/año` (`MM/DD/YYYY`).
- Esto rompe la experiencia de usuario de un ERP localizado estrictamente al español, generando confusión y fricción al ingresar asientos.
- El estándar web de HTML5 **no proporciona ninguna API o atributo CSS** para fijar o anular el formato visual de un `<input type="date" />`.

---

## 2. Alternativas Técnicas y Tradeoffs

Para forzar el orden visual a `Día/Mes/Año` (`DD/MM/YYYY`) de forma 100% consistente, evaluamos las siguientes estrategias:

### Alternativa A: Entrada de Texto con Máscara Dinámica Inteligente (Recomendada)
Reemplazar el campo nativo por un `<input type="text" />` estilizado de alta gama, que aplique una máscara automática en tiempo real mientras el usuario escribe (ej. agrega las barras `/` de forma transparente y restringe caracteres no numéricos), validando la fecha al perder el foco (blur) o enviar.
- **Pros**:
  - Control visual total e independiente del idioma del navegador. Garantiza estrictamente el orden `DD/MM/YYYY`.
  - Excelente UX para contadores y cargadores rápidos de datos que prefieren usar el teclado numérico de forma ágil sin tocar el ratón.
  - Cero dependencias externas complejas.
- **Cons**:
  - Se pierde el calendario emergente nativo del navegador, a menos que se implemente un popover manual simple.

### Alternativa B: Selector Numérico Triple (Día / Mes / Año)
Dividir la entrada de fecha en tres campos numéricos separados y ordenados horizontalmente: un selector/input para el Día, otro para el Mes y otro para el Año.
- **Pros**:
  - Extremadamente robusto para evitar errores de tipeo o formato.
  - Orden estricto día/mes/año visible.
- **Cons**:
  - Fricción de navegación (el usuario debe presionar Tab tres veces o implementar auto-tabbing).
  - Estética menos fluida en comparación con una barra de fecha única.

---

## 3. Conclusión de la Exploración
La **Alternativa A** es muy superior y es el estándar de la industria en ERPs premium (como SAP o QuickBooks) para ingreso rápido de datos. Implementaremos un componente de texto con máscara inteligente para `DD/MM/YYYY` en [TransactionForm.tsx](file:///c:/Users/juanr/OneDrive/Escritorio/Proyectos/Beast-Driven-Development/frontend/src/components/TransactionForm.tsx), manteniendo la persistencia interna del estado en `YYYY-MM-DD` para interactuar de forma transparente con el backend de Go.
