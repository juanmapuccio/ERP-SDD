# Reporte de Exploración: Integración Fiscal de ARCA (Hito 2)

Analizamos el código actual y las estructuras del proyecto para determinar el camino de implementación óptimo para el **Hito 2: Integración Fiscal de ARCA (ex-AFIP)**.

## 1. Estado Actual del Proyecto y Dependencias

- **Tailwind CSS**: Versión 3.4.17 estrictamente bloqueada. Cualquier componente de UI que desarrollemos debe cumplir con las clases de utilidad de Tailwind v3 (prohibido usar sintaxis v4).
- **TypeScript y React**: Next.js 15.5.7 App Router + React 19.2.3. Las acciones de cliente deben utilizar patrones modernos de React.
- **Librería de Criptografía**: Las rutas de API de Next.js se ejecutan en Node.js. Utilizaremos el módulo nativo `crypto` (`aes-256-gcm`) sin dependencias de terceros.
- **Generación en Caliente de RSA y CSR**: Necesitamos instalar la dependencia `node-forge` para generar llaves RSA 2048 y archivos CSR (Certificate Signing Request) de forma 100% segura en el servidor, evitando depender de binarios externos de OpenSSL en Windows.
- **AFIP / ARCA SDK**: Integraremos `@arcasdk/core` (o adaptadores SOAP ligeros equivalentes) y daremos soporte al entorno de simulación local mediante el endpoint `/api/arca-simulator/wsfe`.

---

## 2. Estructura y Distribución de Archivos

Crearemos e integraremos la siguiente estructura bajo el módulo de `arca`:

```
frontend/src/
├── app/
│   ├── api/
│   │   ├── arca-simulator/
│   │   │   └── wsfe/
│   │   │       └── route.ts             # [NUEVO] Endpoint de simulación SOAP de WSFE
│   │   └── config/
│   │       └── arca/
│   │           ├── generate-csr/
│   │           │   └── route.ts         # [NUEVO] Generación en caliente de clave RSA y CSR
│   │           ├── upload-certificate/
│   │           │   └── route.ts         # [NUEVO] Endpoint para asociar y subir el certificado .crt
│   │           └── test-connection/
│   │               └── route.ts         # [NUEVO] Verificador de conexión WSAA
│   └── protected/
│       └── (dashboard)/
│           └── configuracion/
│               └── page.tsx             # [MODIFICAR] Interfaz premium del Asistente (Wizard) ARCA de 5 pasos
├── features/
│   └── arca/
│       ├── components/
│       │   └── onboarding-wizard.tsx    # [NUEVO] Componente interactivo del Asistente
│       ├── services/
│       │   ├── arca-crypto.ts           # [NUEVO] Helper criptográfico simétrico AES-256-GCM
│       │   └── arca-service.ts          # [NUEVO] wrappers para WSAA/WSFE y simulación local
│       └── __tests__/
│           └── arca-simulation.test.ts  # [NUEVO] Set de pruebas unitarias Vitest del simulador fiscal
```

---

## 3. Riesgos y Soluciones

1. **Caídas y lentitud de los servidores de AFIP/ARCA**: Los servidores de prueba (homologación) de AFIP son inestables.
   - *Solución*: Implementaremos `/api/arca-simulator/wsfe`. Si el perfil activo está en modo `simulation`, el backend desvía la llamada de red y responde al instante con firmas y CAEs ficticios válidos.
2. **Filtraciones de Claves Privadas**: Guardar llaves privadas de certificados tributarios en texto plano en la base de datos es un peligro de seguridad.
   - *Solución*: Encriptar simétricamente con AES-256-GCM las llaves antes de persistirlas, usando una variable de entorno maestra (`ARCA_ENCRYPTION_KEY`) como secreto del servidor.

---

## 4. Siguiente Fase Recomendada
Proceder a la fase **`propose`** (propuesta de arquitectura) y **`spec`** (redacción de especificaciones en español).
