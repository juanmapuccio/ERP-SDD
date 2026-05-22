# Tasks Checklist: Simple Authentication System

This is the actionable checklist for executing the simple-auth implementation. Tasks are ordered logically, emphasizing a **Test-Driven Development (TDD)** approach where test specs are authored or prepared before coding.

---

## 1. Phase 1: Go Backend (TDD & Handlers)

- [x] **Step 1.1: [TDD] Auth Handler Tests**
  - Create [backend/auth_test.go](file:///c:/Users/juanr/OneDrive/Escritorio/Proyectos/Beast-Driven-Development/backend/auth_test.go).
  - Write test definitions:
    - `TestLoginHandler_Success` & `TestLoginHandler_Failure`
    - `TestMeHandler_Authorized` & `TestMeHandler_Unauthorized`
    - `TestLogoutHandler`
  - Verify that running `bun run test:backend` fails with compilation/resolution errors.

- [x] **Step 1.2: Implement Handlers**
  - Create [backend/auth.go](file:///c:/Users/juanr/OneDrive/Escritorio/Proyectos/Beast-Driven-Development/backend/auth.go).
  - Define custom structs: `LoginRequest`, `LoginResponse`, `MeResponse`.
  - Implement handler logic:
    - `handleLogin`: parse body, compare credentials, format cookie header response.
    - `handleLogout`: overwrite the session cookie to expire it instantly.
    - `handleMe`: extract cookie token, validate identity, return user metadata.

- [x] **Step 1.3: Router Integration**
  - Modify [backend/main.go](file:///c:/Users/juanr/OneDrive/Escritorio/Proyectos/Beast-Driven-Development/backend/main.go) to bind these handlers in the native `ServeMux` router under:
    - `POST /api/auth/login`
    - `POST /api/auth/logout`
    - `GET /api/auth/me`
  - Update [backend/main_test.go](file:///c:/Users/juanr/OneDrive/Escritorio/Proyectos/Beast-Driven-Development/backend/main_test.go) if necessary to ensure it matches router initialization changes.
  - Run `bun run test:backend` and ensure all tests are 100% green.

---

## 2. Phase 2: Next.js Frontend (Middleware & UI Pages)

- [x] **Step 2.1: Edge Route Guard Middleware**
  - Create Next.js edge-level middleware file [frontend/src/middleware.ts](file:///c:/Users/juanr/OneDrive/Escritorio/Proyectos/Beast-Driven-Development/frontend/src/middleware.ts).
  - Intercept `/dashboard` to block requests missing the `session_token` cookie.
  - Intercept `/login` to redirect active sessions straight to the dashboard.

- [x] **Step 2.2: [TDD] Frontend UI Tests**
  - Create test files:
    - `frontend/src/app/login/page.test.tsx` (or colocated test file)
    - `frontend/src/app/dashboard/page.test.tsx`
  - Assert that input events work, form fields validate, and API responses set loading states.
  - Run `bun run test:frontend` and ensure these new tests fail appropriately (red phase).

- [x] **Step 2.3: Premium Dark-Themed `/login` UI**
  - Create login folder and page [frontend/src/app/login/page.tsx](file:///c:/Users/juanr/OneDrive/Escritorio/Proyectos/Beast-Driven-Development/frontend/src/app/login/page.tsx).
  - Design premium UI:
    - Custom dark/zinc backdrop with amber/gold accents.
    - Glassmorphic card frame with smooth focus borders and slide-up field animations.
    - Interactive states: disable form on click, load micro-spinner, show error alerts on 401.
  - Implement active API fetch requests to backend `POST /api/auth/login`.

- [x] **Step 2.4: Protected `/dashboard` Page UI**
  - Create dashboard folder and page [frontend/src/app/dashboard/page.tsx](file:///c:/Users/juanr/OneDrive/Escritorio/Proyectos/Beast-Driven-Development/frontend/src/app/dashboard/page.tsx).
  - Call `/api/auth/me` in `useEffect` or server render to display logged-in username.
  - Add "Logout" trigger with loading state and router redirection logic.

- [x] **Step 2.5: UI Testing Verification**
  - Run `bun run test:frontend` and confirm all tests are green (blue/green phase).

---

## 3. Phase 3: Integration & System Validation

- [x] **Step 3.1: Monorepo Connection**
  - Ensure Next.js correctly proxies API requests to the Go backend on port `:8080` (or configure appropriate fetch CORS credentials headers).
- [x] **Step 3.2: E2E Manual Audit**
  - Run both front and back in development Mode.
  - Manually audit:
    - Redirect unauthenticated users to `/login`.
    - Log in using invalid credentials (confirm error styling).
    - Log in using correct credentials (confirm redirection and VRAM/load speed).
    - Log out (confirm cookie expiration and successful redirection).
