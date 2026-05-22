# Especificación: Sistema de Autenticación, RBAC y Onboarding de CUIT (Supabase)

Esta especificación define los requisitos funcionales, no funcionales y criterios de aceptación para el sistema de autenticación, control de accesos basado en roles (RBAC) y el selector de contexto de empresa (CUIT) integrado directamente con el cliente de Supabase en Next.js.

---

## 1. Requisitos Funcionales

### 1.1 Autenticación y Perfil con Supabase
La autenticación se realiza de manera directa en el lado del servidor y del cliente a través del cliente de Supabase (`@/core/api/supabase`).

#### Registro (`signUp`)
- **Proceso**: El usuario se registra utilizando su correo electrónico, contraseña y nombre.
- **Asignación de Rol por Defecto**: Al registrarse con éxito, el sistema inicializa el perfil de usuario en la base de datos de Supabase (`users.profile` o `profiles`) con el rol de `"vendedor"` de forma automática:
  ```json
  {
    "name": "Nombre Usuario",
    "role": "vendedor"
  }
  ```
- **Gestión de Roles**: Solo se permite cambiar el rol a `"admin"` u otros mediante modificación manual directa en la base de datos (por ejemplo, a través de scripts de administración o consola SQL de Supabase). El sistema reflejará el cambio reactivamente al leer el perfil en el siguiente inicio de sesión.

#### Inicio de Sesión (`signInWithPassword`)
- **Credenciales**: Email y contraseña.
- **Flujo de Sesión**: Al autenticarse, el cliente de Supabase guarda y gestiona las cookies de sesión de forma segura (`HttpOnly`).
- **Control de Roles (RBAC)**: Tras el inicio de sesión, el sistema carga el objeto `user` y lee `profile.role` para definir si el usuario tiene privilegios de `"admin"` o `"vendedor"`.
- **Manejo de Errores**: Todo error en el inicio de sesión o registro se captura del SDK/cliente y se notifica elegantemente a través de **Sonner** con toasts premium en tiempo real.

---

### 1.2 Onboarding y Selector de CUIT (Multi-empresa)
Dado que el ERP es utilizado por un solo comercio que opera bajo **dos CUITs distintos**, la experiencia del usuario requiere un flujo de selección de contexto de empresa dinámico.

#### Flujo de Selección de CUIT Activo
1. **Redirección de Control**: Al iniciar sesión y acceder a las rutas protegidas (`/protected/*`), el middleware o el layout principal comprueba si el store global de Zustand (`useCompanyStore`) tiene un CUIT activo seleccionado.
2. **Pantalla de Onboarding**: Si no hay un CUIT activo en el store, el usuario es redirigido automáticamente a la vista de Onboarding/Selección de Empresa (`/protected/onboarding`).
3. **Carga de Datos**: Esta pantalla consulta la tabla `company_profile` en Supabase para obtener las empresas registradas (por ejemplo, las dos empresas con sus respectivos CUITs, razones sociales y condiciones fiscales).
4. **Interacción**: El usuario selecciona la empresa con la que desea operar ese día.
5. **Persistencia**: La empresa seleccionada se guarda en el store de Zustand (`useCompanyStore`) y se persiste localmente para mantener la sesión de trabajo coherente.
6. **Selector en Header**: En la barra de navegación superior (Header) del ERP, se incluye un dropdown selector premium que permite cambiar de CUIT (y por ende de empresa) en caliente. Al cambiar de CUIT, la interfaz entera se recarga reactivamente para filtrar la información del nuevo contexto.

---

### 1.3 Interfaz de Usuario y Estructura de Módulos (Next.js)

#### Rutas no Autenticadas
- **Página de Login (`/auth/sign-in`) y Registro (`/auth/sign-up`)**:
  - **Alineación Visual**: Modo oscuro ultra-premium con un canvas de fondo en zinc-950 con destellos sutiles y bordes suaves de color ámbar/dorado.
  - **Inputs Premium**: Transiciones fluidas, etiquetas flotantes y un efecto glow dorado al enfocarse.
  - **Estados de Carga**: El botón de envío cambia a un spinner elegante con texto interactivo ("Autenticando...", "Registrando...") para prevenir clicks repetidos.

#### Rutas Protegidas (`/protected/*`)
- **Control de Rutas**: Protegidas en el servidor mediante el middleware de Next.js que lee las cookies del cliente.
- **Home/Dashboard Principal (`/protected/page.tsx`)**:
  - Muestra un panel de bienvenida elegante con el perfil del usuario autenticado (nombre y rol de vendedor/admin).
  - Incluye un resumen premium con accesos rápidos a los módulos del ERP.
  - Muestra la empresa/CUIT actualmente activa en letras doradas destacadas.
- **Estructura de Módulos en Blanco**:
  Siguiendo la estrategia de construcción progresiva, se implementan las siguientes rutas con páginas limpias, cabeceras estilizadas y títulos descriptivos de cada módulo para posterior desarrollo:
  - **Inventario** (`/protected/inventario`)
  - **Ventas** (`/protected/ventas`)
  - **Caja Diaria** (`/protected/caja`)
  - **Contabilidad** (`/protected/contabilidad`)
  - **Reportes** (`/protected/reportes`)
  - **Configuración** (`/protected/configuracion`)

---

## 2. Requisitos No Funcionales

### 2.1 Seguridad y RBAC
- **Defensa XSS**: Las cookies de sesión se administran mediante cookies seguras HttpOnly controladas por Supabase.
- **Seguridad en Base de Datos**: Los privilegios se validan en el cliente para explicar la UI y se validarán con políticas RLS en la base de datos en fases futuras.

### 2.2 Rendimiento y UX
- **Redirección Fluida**: El middleware y los componentes de servidor de Next.js interceptan las solicitudes antes de renderizar la página en el cliente, evitando parpadeos de pantalla en blanco.
- **Retroalimentación Premium**: Toasts instantáneos mediante **Sonner** que describen detalladamente cualquier error técnico o de conexión sin entorpecer el flujo de trabajo del vendedor.

---

## 3. Criterios de Aceptación (Guardia de Control de Calidad)

### Autenticación y Roles
- [ ] Registrarse crea el usuario en Supabase e inicializa `profile.role` como `"vendedor"` por defecto.
- [ ] Iniciar sesión lee correctamente el perfil del usuario y expone su rol actual.
- [ ] Intentar acceder a rutas `/protected` sin sesión redirige inmediatamente a `/auth/sign-in`.

### Selección de CUIT
- [ ] Si se inicia sesión y no hay CUIT seleccionado en Zustand, se redirige inmediatamente a `/protected/onboarding`.
- [ ] La pantalla de onboarding renderiza la lista de empresas obtenida desde la tabla `company_profile`.
- [ ] Seleccionar una empresa guarda su CUIT en Zustand y redirige al dashboard principal `/protected`.
- [ ] El selector en el Header muestra la razón social seleccionada y permite cambiar de CUIT en caliente, refrescando las pantallas asociadas de forma instantánea.

### Páginas de Módulos
- [ ] Las rutas de Inventario, Ventas, Caja, Contabilidad, Reportes y Configuración cargan páginas estilizadas de marcador de posición (blank pages) sin errores de consola.estilizadas de marcador de posición (blank pages) sin errores de consola.

