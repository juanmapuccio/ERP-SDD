# Listado de Tareas de Implementación: Cuenta Corriente e Integración Fiscal ARCA

## 📌 Hito 1: Gestión de Cuenta Corriente (Completado)
- [x] **1. Ejecución del Esquema de Base de Datos**
  - [x] Crear tabla `customer_credit_accounts` con aislamiento por CUIT de empresa.
  - [x] Crear tabla `customer_credit_movements` para auditoría de deudas y cobros.
  - [x] Crear tabla `arca_credentials` para almacenar credenciales fiscales seguras.
- [x] **2. Integración en el Panel de Clientes Frontend (`clientes/page.tsx`)**
  - [x] Agregar la pestaña de "Cuenta Corriente" en el panel lateral de detalles de cliente.
  - [x] Agregar el switch "Habilitar Cuenta Corriente" y los inputs de límite de crédito.
  - [x] Diseñar tarjetas métricas con glassmorphism (Saldo Deudor, Límite, Disponible).
  - [x] Crear el historial con la lista compacta de movimientos históricos.
  - [x] Crear el modal de "Registrar Cobro" con selección de medio de pago y montos.
- [x] **3. Lógica Transaccional del Servicio (`credit-service.ts`)**
  - [x] Diseñar el cargador y actualizador atómico de perfiles de crédito.
  - [x] Implementar el procesador contable en partida doble: asentar débitos en Caja (`1.1.1.01`) o Bancos (`1.1.1.02`) y créditos en Deudores (`1.1.3.01`).
  - [x] Sincronizar de forma atómica con la Caja Diaria activa si el medio de pago es efectivo.
- [x] **4. Integración en Checkout de Ventas (`ventas/page.tsx`)**
  - [x] Validar límites de crédito y saldo restante al seleccionar Cuenta Corriente.
  - [x] Deshabilitar el botón de crédito si el cliente activo es Consumidor Final (`99999999999`).
- [x] **5. Pruebas Unitarias de Reglas de Negocio (TDD Estricto)**
  - [x] Escribir el archivo `cuenta-corriente-gates.test.ts` cubriendo 43 escenarios de prueba en Vitest.

---

## 📌 Hito 2: Módulo Fiscal ARCA (ex-AFIP) (Siguiente Paso)

### 📁 Tarea 2.1: Helper Criptográfico y Modelo de Base de Datos
- [x] **1. Servicio de Encriptación Simétrica (`arca-crypto.ts`)**
  - [x] Escribir helper utilizando el módulo nativo `crypto` de Node.js.
  - [x] Implementar la función `encryptPrivateKey(pemString: string): string` que genere un IV aleatorio de 12 bytes, aplique AES-256-GCM y retorne el string unificado con formato `iv:tag:ciphertext`.
  - [x] Implementar la función `decryptPrivateKey(encryptedString: string): string` que divida el string, cree el descifrador, asocie el tag de autenticación de 16 bytes y retorne el PEM original.
  - [x] Escribir pruebas básicas unitarias para este módulo.

- [x] **2. Instalar Dependencias Requeridas**
  - [x] Agregar e instalar `node-forge` en el `package.json` del frontend para operaciones criptográficas nativas de generación de RSA y CSR.

---

### 📁 Tarea 2.2: Endpoints de la API del Servidor (Next.js Routes)
- [x] **1. Crear `/api/config/arca/generate-csr`**
  - [x] Desarrollar handler `POST` utilizando `node-forge`.
  - [x] Generar un par de claves RSA de 2048 bits de forma asíncrona.
  - [x] Crear el Certificate Signing Request (CSR) con los metadatos fiscales requeridos (`CN=ERP Nodo Sur - CUIT [CUIT]`, `O=Distribuidora`, `C=AR`).
  - [x] Encriptar simétricamente la llave privada generada usando `arca-crypto.ts`.
  - [x] Guardar la llave cifrada en la tabla `arca_credentials` del CUIT correspondiente en estado temporal y retornar el string PEM del `.csr` para su descarga en el Wizard.


- [x] **2. Crear `/api/config/arca/upload-certificate`**
  - [x] Desarrollar handler `POST` que reciba el archivo de certificado `.crt` subido por el usuario.
  - [x] Validar formato PEM del certificado.
  - [x] Realizar upsert en la tabla `arca_credentials` guardando el certificado público y estableciendo el Punto de Venta configurado y el entorno inicial en `"simulation"`.

- [x] **3. Crear `/api/config/arca/test-connection`**
  - [x] Desarrollar handler `POST` para probar la conexión con WSAA.
  - [x] Intentar obtener un Ticket de Acceso (TA) de prueba (WSAA homologación o mock simulado) y retornar éxito y tiempo de vigencia.

---

### 📁 Tarea 2.3: Asistente Visual de Configuración (Wizard Frontend)
- [x] **1. Diseñar el Panel del Wizard (`onboarding-wizard.tsx`)**
  - [x] Crear un componente visual premium con transiciones suaves utilizando la paleta Amber de Tailwind v3.
  - [x] Estructurar los 5 pasos lineales con estado de carga interactivo y visualización elegante de logs estilo terminal:
    - **Paso 1: Setup Fiscal** (CUIT de la empresa activa y Punto de Venta).
    - **Paso 2: Generación del CSR** (Botón para generar llaves en caliente y enlace de descarga del archivo `.csr`).
    - **Paso 3: Guía de Trámite AFIP** (Instrucciones con viñetas claras para asociar el servicio fiscal WSASS).
    - **Paso 4: Carga de Certificado** (Dropzone interactivo para arrastrar y cargar el archivo `.crt`).
    - **Paso 5: Prueba de Conexión** (Botón para verificar la integración y consola de logs en vivo).
- [x] **2. Integrar en Configuraciones (`configuracion/page.tsx`)**
  - [x] Agregar la pestaña "Facturación Fiscal ARCA" con estética glassmorphic.

---

### 📁 Tarea 2.4: Servicio del Cliente ARCA y Simulador Local
- [x] **1. Diseñar el Wrapper del Servicio (`arca-service.ts`)**
  - [x] Crear el adaptador dinámico `authorizeInvoice(payload)`.
  - [x] Si el entorno es `"simulation"`, derivar la petición de red directamente al endpoint del simulador local `/api/arca-simulator/wsfe`.
  - [x] Si es `"homologation"` o `"production"`, inicializar y llamar al cliente SOAP de AFIP con el certificado desencriptado y gestionar el guardado de la caché del Ticket de Acceso (TA).

- [x] **2. Crear el Simulador `/api/arca-simulator/wsfe`**
  - [x] Desarrollar el handler `POST` que emule la respuesta SOAP oficial de AFIP en formato JSON rápido.
  - [x] Autogenerar números correlativos de comprobantes incrementales y códigos CAE de simulación (`CAESIM-[cuit]-[tipo]-[num]`).
  - [x] Devolver la URL del código QR normalizado de AFIP.

---

### 📁 Tarea 2.5: Pruebas Unitarias y Conexión con el POS
- [x] **1. Desarrollar Pruebas Unitarias (`arca-simulation.test.ts`)**
  - [x] Escribir tests de Vitest para: encriptación simétrica, generación nativa de CSR, caché local del TA y la compuerta del simulador fiscal.
- [x] **2. Integrar con el Checkout de POS (`ventas/page.tsx`)**
  - [x] Agregar el checkbox **"Emitir Factura Fiscal (ARCA)"** en el panel de checkout.
  - [x] Calcular alícuotas del 21% y 10.5% en caliente según los artículos del carrito.
  - [x] Al presionar Confirmar Pago, si el checkbox está activo, invocar al servicio de facturación.
  - [x] Almacenar los datos fiscales (`cae`, `cbte_nro`) en la tabla `afip_vouchers`.
  - [x] En la pantalla de checkout exitoso, renderizar la tarjeta de comprobante imprimible con su código QR.
  - [x] Implementar la compuerta de recuperación resiliente: si AFIP real falla, permitir guardar el comprobante provisorio de forma local y continuar la venta.
