# Specification: Simple Authentication System

This specification defines the functional and non-functional requirements for the cookie-based local authentication system.

---

## 1. Functional Requirements

### 1.1 Backend Authentication API (Go)

All authentication endpoints must live under `/api/auth/*`.

#### Endpoint: `POST /api/auth/login`
- **Description**: Authenticates a user and sets a secure `session_token` cookie.
- **Request Headers**: `Content-Type: application/json`
- **Request Body**:
  ```json
  {
    "username": "admin",
    "password": "admin-beast-2026"
  }
  ```
- **Response Headers**:
  - `Set-Cookie: session_token=beast_session_admin_secure; HttpOnly; Path=/; SameSite=Lax; Max-Age=86400` (Note: `Secure` attribute should be enabled unless running on standard HTTP local development where browsers allow localhost exceptions).
- **Responses**:
  - **`200 OK`**:
    ```json
    {
      "status": "success",
      "message": "Authenticated successfully"
    }
    ```
  - **`400 Bad Request`**: Malformed JSON request body.
  - **`401 Unauthorized`**: Missing or incorrect username/password.
    ```json
    {
      "status": "error",
      "message": "Invalid username or password"
    }
    ```

#### Endpoint: `POST /api/auth/logout`
- **Description**: Clears the authentication session.
- **Request Headers**: None required (uses session cookie).
- **Response Headers**:
  - `Set-Cookie: session_token=; HttpOnly; Path=/; SameSite=Lax; Max-Age=-1` (expires the cookie immediately).
- **Responses**:
  - **`200 OK`**:
    ```json
    {
      "status": "success",
      "message": "Logged out successfully"
    }
    ```

#### Endpoint: `GET /api/auth/me`
- **Description**: Retrieves active session information.
- **Request Headers**: Requires the `session_token` cookie.
- **Responses**:
  - **`200 OK`**:
    ```json
    {
      "username": "admin",
      "role": "administrator",
      "permissions": ["read", "write"]
    }
    ```
  - **`401 Unauthorized`**: Invalid, missing, or expired session cookie.
    ```json
    {
      "status": "error",
      "message": "Unauthorized"
    }
    ```

---

### 1.2 Frontend UI & Routing (Next.js)

#### Page: `/login` (Unauthenticated Route)
- **Visual State**:
  - Dark mode only (pitch black/zinc-950 canvas) with an elegant, glowing amber/gold radial gradient background.
  - Glassmorphic card centered on screen containing the login form.
  - Input fields (`username` and `password`) with a custom gold glowing border on focus and smooth label sliding transitions.
  - Form validation: client-side checks for empty fields before triggering the API request.
  - Dynamic loading state: the submit button displays a premium micro-spinner and text changes to "Decrypting..." upon submission.
  - Toast notifications or sleek alerts to render invalid credentials or network errors in a non-disruptive, highly styled layout.
- **Interactions**:
  - Successfully logging in redirects the user immediately to `/dashboard`.
  - Accessing `/login` while already authenticated redirects the user automatically to `/dashboard`.

#### Page: `/dashboard` (Authenticated Route)
- **Visual State**:
  - Dashboard workspace for the Beast developer.
  - Sleek header showing the logged-in user profile retrieved from `/api/auth/me`.
  - Glassmorphic panels detailing local RTX 4090 / server metrics (mocked beautifully).
  - Premium styled "Logout" button with a smooth hover translation effect.
- **Interactions**:
  - Pressing "Logout" calls the `/api/auth/logout` endpoint, wipes client states, and redirects the user immediately to `/login`.
  - Accessing `/dashboard` while unauthenticated redirects the user automatically to `/login`.

#### Next.js Route Guard Middleware
- Global Next.js middleware checking for the existence of the `session_token` cookie.
- Paths affected:
  - `/dashboard` -> if cookie absent -> redirect to `/login`.
  - `/login` -> if cookie present -> redirect to `/dashboard`.

---

## 2. Non-Functional Requirements

### 2.1 Security & Sessions
- **XSS Defense**: The authentication cookie MUST be `HttpOnly`. This ensures that even if client-side scripts are compromised, the token remains unreadable via JavaScript (`document.cookie`).
- **CSRF Mitigation**: Use `SameSite=Lax` for local testing environments to block cross-site request forgery attacks on state-changing API endpoints.
- **Secure Transport**: Cookied requests must comply with secure policies in production. In development on `http://localhost`, browsers allow cookie persistence without explicit HTTPS requirements.

### 2.2 Performance
- **Zero Layout Shifts**: The middleware guard intercepts the page transition *before* page mounting, completely avoiding the white-screen flash or redirection flicker typical of client-side-only route checks.
- **Lightweight Dependencies**: No heavy third-party routing or UI packages. Native Tailwind CSS, native Go routing, and standard libraries only.

---

## 3. Acceptance Criteria (QA Guard)

### Backend API
- [ ] `POST /api/auth/login` sets a valid cookie and returns `200 OK` for matching hardcoded user credentials.
- [ ] `POST /api/auth/login` returns `401 Unauthorized` for incorrect credentials.
- [ ] `GET /api/auth/me` returns `200 OK` and user data when the `session_token` cookie is present and matches the secret token.
- [ ] `GET /api/auth/me` returns `401 Unauthorized` when the cookie is absent or invalid.
- [ ] `POST /api/auth/logout` returns `200 OK` and invalidates the session cookie by setting its age to `-1`.

### Frontend Web
- [ ] Attempting to visit `/dashboard` when not logged in instantly redirects to `/login`.
- [ ] Attempting to visit `/login` when already logged in instantly redirects to `/dashboard`.
- [ ] Entering invalid credentials displays a beautiful gold/amber alert message on `/login`.
- [ ] The Submit button on the login form displays a sleek loading spinner during API request flight.
- [ ] Clicking "Logout" successfully destroys the session and drops the user back on the `/login` screen.
