# Proposal: Simple Authentication System

## 1. Goal Description
The objective is to implement a secure, premium, and lightweight authentication system across the monorepo. This will feature a **Go native net/http backend** providing cookie-based session management and a **Next.js frontend** rendering a high-craft, dark-themed login interface and a protected dashboard dashboard page.

This system will serve as the architectural template for handling secure sessions, route protection, API middleware, and TDD-enforced safety.

---

## 2. High-Level Changes

### Backend (Go)
1. **Authentication Endpoints**:
   - `POST /api/auth/login`: Validates credentials (`admin` / `password123`) and sets a secure `HttpOnly` cookie containing the session token.
   - `POST /api/auth/logout`: Clears the session cookie by setting its expiration to the past.
   - `GET /api/auth/me`: Retrieves current session info by reading the cookie, returning user details or `401 Unauthorized`.
2. **Middleware**:
   - Create a simple, clean HTTP middleware to enforce session validation on protected endpoints.
3. **Tests**:
   - Fully cover all handlers and middleware using Go's `net/http/httptest` package in strict TDD fashion.

### Frontend (Next.js)
1. **Login Page (`/login`)**:
   - Design a premium, Zen-inspired dark-mode login form featuring smooth input focus animations, HSL gradient buttons, and a clean interface.
2. **Dashboard Page (`/dashboard`)**:
   - Create a premium workspace view for authenticated users that loads current user data from `/api/auth/me` and features a "Logout" control.
3. **Middleware / Route Guard**:
   - Add a Next.js standard `middleware.ts` to intercept requests, protecting `/dashboard` and redirecting unauthenticated users to `/login`.
4. **Tests**:
   - Write Vitest + RTL (React Testing Library) tests for the login form and dashboard page to verify visual states, inputs, and submission behaviors.

---

## 3. Architecture & Tradeoffs

| Architecture Element | Choice | Tradeoff |
|---|---|---|
| **Token Delivery** | `HttpOnly` Secure Cookie | **Pros**: Completely immune to XSS token theft. **Cons**: Requires configuring CORS/credentials properly for local dev (which is simple on localhost). |
| **Session Model** | In-Memory / Signed Token | **Pros**: Fast, zero database overhead for simple auth. **Cons**: In-memory tokens reset on server restart (acceptable for simple dev setups; token string matches a constant). |
| **Next.js Guarding** | Next.js Edge Middleware | **Pros**: Runs before page rendering, preventing flicker or layout shifts. **Cons**: Runs in Edge runtime, but reading standard cookies is fully supported. |

---

## 4. Open Decisions / Alignment
- **Mock Credentials**: We will default to a secure test account (`admin` / `admin-beast-2026`).
- **Styling Tokens**: We will use custom Tailwind CSS classes mapped to premium dark palette tokens (`zinc-950`, `zinc-900`, gold/amber accents, soft radial gradients) to create a premium Sumi-e styled experience.
