# Documento de Arquitectura y Diseño: Integración de Cuenta Corriente y ARCA (ex-AFIP)

## 1. Estructura de Componentes y Diseño de UI

### 1.1 Líneas de Diseño Visual (Amber Glassmorphism)
Para ofrecer una experiencia de panel de alta densidad visualmente premium, la interfaz utilizará **modos oscuros vibrantes** y **paneles glassmórficos armónicos** con microanimaciones.
*   **Estética**: Filtros de desenfoque de fondo (`backdrop-blur-md`), bordes finos con estilos translúcidos (`border-zinc-700/50`) y sombras sutiles HSL.
*   **Colores**:
    *   *Saldos y Límites*: `amber-500` (Deuda), `emerald-500` (Crédito disponible), `zinc-400` (Texto secundario).
    *   *Botones*: Gradientes HSL vibrantes con transiciones de escala suaves (`hover:scale-[1.02] active:scale-[0.98] duration-200`).
*   **Tipografía**: Uso de las fuentes premium preconfiguradas (Inter/Outfit) con estrictas jerarquías de encabezados.

---

### 1.2 Distribución de Componentes de Frontend

```
frontend/src/
├── app/
│   └── protected/
│       └── (dashboard)/
│           └── configuracion/
│               └── page.tsx             # Panel de configuración con Wizard ARCA integrado
├── features/
│   ├── clientes/
│   │   ├── components/
│   │   │   ├── credit-panel.tsx          # Panel lateral de CC (Límite, Deuda, Disponible, Historial)
│   │   │   └── form-cobro-modal.tsx      # Modal de Registrar Cobro
│   │   └── services/
│   │       └── credit-service.ts         # Métodos de CC (habilitar, cobro, movimientos)
│   └── arca/
│       ├── components/
│       │   └── onboarding-wizard.tsx     # Wizard interactivo de 5 pasos para credenciales ARCA
│       └── services/
│           ├── arca-crypto.ts            # Utilidades de encriptación simétrica AES-256-GCM
│           └── arca-service.ts           # Wrapper que interactúa con WSAA / WSFE o Simulator
```

#### Panel de Cuenta Corriente (`credit-panel.tsx`)
Renderizado dentro de la barra lateral administrativa cuando se selecciona un cliente:
- Switch visual **"Habilitar Cuenta Corriente"**.
- Campo de entrada numérico para ajustar `limite_credito`.
- Indicadores visuales:
  - **Saldo Deudor Actual**: Etiqueta roja/ámbar con la deuda vigente.
  - **Crédito Disponible**: Etiqueta esmeralda con el límite restante seguro.
- Botón **"Registrar Cobro"** que abre el modal de pagos.
- **Tabla de Auditoría**: Grid de alta densidad con la fecha, tipo (débito/crédito), monto, concepto y enlace al asiento del diario contable.

#### Asistente de Configuración Fiscal (`onboarding-wizard.tsx`)
Un asistente interactivo (wizard) por pasos con transiciones animadas:
1.  **Formulario**: Introducción de CUIT y Punto de Venta de la distribuidora.
2.  **Generación**: Genera claves RSA 2048 y CSR en caliente a través de la API local, mostrando opciones para descargar el CSR generado.
3.  **Guía**: Lista paso a paso las instrucciones detalladas con capturas para asociar el servicio en la web de AFIP/ARCA (WSASS).
4.  **Subida**: Panel dropzone de alta calidad para arrastrar y cargar el certificado público `.crt`.
5.  **Prueba**: Dispara un test de conexión WSAA en vivo con la clave y el certificado recién cargados, mostrando logs en tiempo real y confirmación de estado activo.

---

## 2. API Routes y Endpoints de Next.js

Para mantener al cliente (frontend) ligero y proteger las operaciones criptográficas críticas, todos los flujos se procesan del lado del servidor de Next.js en `src/app/api/`:

### 2.1 `/api/config/arca/generate-csr`
*   **Método**: `POST`
*   **Función**: Genera un par de claves RSA de 2048 bits y un Certificate Signing Request (CSR) de forma nativa.
*   **Algoritmo**: Criptografía pura en JavaScript vía `node-forge` (evitando dependencias del binario OpenSSL en el sistema operativo local).
*   **Respuesta**: Devuelve el string del archivo `.csr` y persiste temporalmente la clave privada (cifrada con AES-256-GCM) en `arca_credentials` bajo el estado `pending_certificate`.

### 2.2 `/api/config/arca/upload-certificate`
*   **Método**: `POST`
*   **Función**:
    - Valida que el certificado cargado coincida con la clave privada y el CUIT pendientes.
    - Actualiza `arca_credentials` persistiendo el certificado final `.crt` en formato PEM y establece el entorno (`environment`) inicial en `"simulation"`.

### 2.3 `/api/config/arca/test-connection`
*   **Método**: `POST`
*   **Función**: Intenta obtener un Ticket de Acceso (TA) de WSAA utilizando las credenciales activas del CUIT.
*   **Respuesta**: `{ success: true, expiration: Date }` o logs de error detallados para renderizar en el Wizard en caso de falla.

### 2.4 `/api/arca-simulator/wsfe`
*   **Método**: `POST`
*   **Función**: Mocks completos del protocolo SOAP de WSFE. Intercepta llamadas de facturación cuando el entorno es `"simulation"`, devolviendo respuestas instantáneas en formato JSON con CAEs simulados correctos para no demorar al POS.

---

## 3. Seguridad de Base de Datos y Encriptación (AES-256-GCM)

Para proteger la información fiscal crítica en entornos multi-empresa:
*   Encriptamos el campo `private_key` antes de guardarlo en la base de datos usando el módulo `crypto` de Node.js.
*   **Cifrado**: `aes-256-gcm`.
*   **Proceso**:
    1.  Generar un vector de inicialización (`iv`) de 12 bytes aleatorios.
    2.  Cifrar el PEM usando `ARCA_ENCRYPTION_KEY` (secreto de 32 bytes provisto por variable de entorno).
    3.  Calcular el authentication tag (`tag`) de 16 bytes para evitar cualquier tipo de adulteración externa del ciphertext.
    4.  Almacenar en la base de datos el string estructurado como `iv:tag:ciphertext`.
*   **Desencriptación**: Dividir el string por el separador `:`, crear el decipher utilizando la clave maestra e IV, setear el tag de autenticación y descifrar el PEM original. Si el tag no coincide, falla de forma inmediata previniendo lecturas corruptas.

---

## 4. Patrones de Diseño y Flujos Lógicos

### 4.1 Caché del Ticket de Acceso (TA) de WSAA
Para evitar el estrangulamiento de la API de ARCA y cumplir con las directrices oficiales (no solicitar tickets nuevos por cada comprobante individual):
1.  **Estructura de la Caché**:
    ```typescript
    interface TicketAcceso {
      token: string;
      sign: string;
      expiration: string; // ISO String (aprox. 12 horas desde su emisión)
    }
    ```
2.  **Secuencia de Consulta**:
    - Buscar en la base de datos `arca_credentials` si existe un ticket no expirado para el CUIT activo.
    - Si el tiempo de expiración es mayor a 10 minutos (margen contra desfase de reloj), se reutilizan `token` y `sign`.
    - Si expiró o no existe, se realiza la solicitud SOAP a WSAA firmando el payload con la llave privada desencriptada y el certificado público, almacenando el nuevo ticket obtenido.

### 4.2 Patrón de Adaptador Dinámico (WSFE Real vs. Simulación)
Garantiza velocidad y disponibilidad absoluta durante desarrollo:
- **`arca-service.ts`** expone un método unificado `authorizeInvoice(payload)`.
- El ruteador interno decide según el entorno configurado:
  ```
               [ authorizeInvoice() ]
                         |
           ¿El entorno es 'simulation'?
                    /          \
                 SÍ             NO
                 /                \
     [ Fetch simulador local ]     [ Invocar @arcasdk/core ]
     [ /api/arca-simulator/wsfe ]  [ WSAA + WSFE SOAP Client ]
  ```

### 4.3 Integración de Checkout POS de Alta Densidad
Durante el checkout en `ventas/page.tsx`, si la opción **"Emitir Factura Fiscal (ARCA)"** está habilitada:
1.  Calcular Neto, Descuentos e Impuestos (IVA 21%, 10.5%).
2.  Disparar transacciones contables del POS y descuentos de stock.
3.  Al mismo tiempo, llamar al endpoint del servidor para autorizar la factura electrónica ante ARCA.
4.  Si es exitoso:
    - Guardar `cae`, `cae_vencimiento` y `cbte_nro` en el registro de `afip_vouchers`.
    - En el panel de éxito del POS, mostrar la tarjeta glassmórfica del voucher con botones de impresión en PDF y un código QR generado en caliente que apunta al portal de verificación de AFIP.
5.  Si falla ARCA (fuera del modo simulación):
    - Capturar la excepción de forma controlada.
    - Ofrecer al cajero la opción de **"Guardar venta como Comprobante Provisorio y facturar más tarde"**. Esto evita trancar las ventas físicas del mostrador por problemas ajenos de conectividad fiscal.
