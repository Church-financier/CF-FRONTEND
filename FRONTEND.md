# Frontend Documentation

## Church Financier - Executive Financial Suite

### 1. Project Overview

Church Financier is a **multi-tenant Next.js 14** financial management application built for church organizations. It provides a comprehensive executive suite for managing church finances including contributions, disbursements, chart of accounts, ledger, pledges, vendors, members, audit trails, budgets, periods, and financial reporting. Each tenant (church organization) operates in complete data isolation.

The application ships with **two distinct authenticated experiences** sharing a single backend:

- **Admin Dashboard** (`(dashboard)` route group) — full-featured back-office for treasurers, financial secretaries, auditors, department heads, and super admins.
- **Member Portal** (`/portal` route group) — read-only self-service portal where church members can view their own pledge progress and donation history.

Church Financier is an **internal ledger/accounting system**; member contributions (tithes, offerings, donations) are recorded manually by treasurers or imported — they are **not** processed through external payment gateways.

---

### 2. Tech Stack

| Category | Technology | Version |
|---|---|---|
| Framework | Next.js (App Router) | 14.2.35 |
| Language | TypeScript | 5.4.0 |
| Styling | Tailwind CSS v4 + PostCSS | 4.3.3 / 8.4.38 |
| State Management | Zustand | 4.5.0 |
| UI Primitives | Radix UI (Dialog, Dropdown Menu, Select) | 1.x / 2.x |
| Icons | Lucide React | 0.400.0 |
| Tables | TanStack React Table + Custom UI Table | 8.15.0 |
| Date/Time | date-fns | 3.6.0 |
| Real-time | Socket.io Client | 4.7.0 |
| Utilities | clsx, tailwind-merge, next-themes | - |
| Fonts | next/font (Inter) | - |
| Linting | ESLint (next lint) | - |

**Key dependency note:** Styling uses `@tailwindcss/postcss` v4.3.3 (no separate `tailwind.config.ts`). Theme tokens are defined in `globals.css` via the `@theme` directive.

---

### 3. Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── layout.tsx                     # Root layout (Inter font via next/font + Providers + Toast)
│   │   ├── providers.tsx                  # AuthGate wrapper (auth check + socket lifecycle)
│   │   ├── globals.css                    # Global styles + Tailwind v4 @theme tokens
│   │   ├── favicon.svg
│   │   ├── (marketing)/
│   │   │   └── page.tsx                   # Public landing page (links to /login, /portal/login)
│   │   ├── (auth)/                        # Auth route group (admin app)
│   │   │   ├── layout.tsx                 # Auth layout (passthrough; child pages handle their own chrome)
│   │   │   ├── login/page.tsx             # Admin login (supports MFA challenge)
│   │   │   ├── signup/page.tsx            # User signup (legacy path; church registration is preferred)
│   │   │   ├── register/page.tsx          # Church onboarding (multi-tenant)
│   │   │   ├── forgot-password/page.tsx   # Request password reset email
│   │   │   └── reset-password/page.tsx    # Consume ?token=... to set a new password
│   │   ├── (dashboard)/                   # Protected admin dashboard route group
│   │   │   ├── layout.tsx                 # DashboardLayout + SocketToasts + PermissionGuard
│   │   │   ├── dashboard/page.tsx
│   │   │   ├── audit/page.tsx
│   │   │   ├── budgets/page.tsx
│   │   │   ├── chart-of-accounts/page.tsx
│   │   │   ├── contributions/page.tsx
│   │   │   ├── disbursements/page.tsx
│   │   │   ├── funds/page.tsx
│   │   │   ├── ledger/page.tsx
│   │   │   ├── members/page.tsx
│   │   │   ├── periods/page.tsx
│   │   │   ├── pledges/page.tsx
│   │   │   ├── reports/page.tsx
│   │   │   ├── settings/page.tsx          # Profile, password change, MFA toggle
│   │   │   ├── users/page.tsx
│   │   │   └── vendors/page.tsx
│   │   └── portal/                        # Member portal (separate auth, separate store)
│   │       ├── layout.tsx                 # Portal chrome (header + tabs + auth gate)
│   │       ├── login/page.tsx             # Member sign-in
│   │       ├── forgot-password/page.tsx
│   │       ├── dashboard/page.tsx         # Member overview (totals + recent pledges)
│   │       ├── pledges/page.tsx           # Member's pledges with progress bars
│   │       ├── donations/page.tsx         # Member's contribution history
│   │       └── settings/page.tsx          # Change portal password
│   ├── components/
│   │   ├── ui/                            # Reusable design system primitives
│   │   │   ├── button.tsx                 # Variants: default, outline, ghost, destructive; Sizes: default, sm, lg, icon
│   │   │   ├── dialog.tsx                 # Radix UI Dialog wrappers
│   │   │   ├── input.tsx                  # Radix-style input primitive
│   │   │   ├── table.tsx                  # Custom Table primitives (shadcn/ui style)
│   │   │   └── Toast.tsx                  # Global toast system (info/success/error) + app:toast event listener
│   │   ├── layout/                        # Application chrome
│   │   │   ├── DashboardLayout.tsx        # Sidebar + Header + main slot
│   │   │   ├── Header.tsx                 # Top bar (title, org name, optional right slot, mobile menu); also exports Breadcrumbs
│   │   │   └── Sidebar.tsx                # Role/permission-aware nav, collapsible on mobile
│   │   ├── modules/                       # Feature-specific components
│   │   │   ├── contributions/
│   │   │   │   └── BatchContributionForm.tsx
│   │   │   ├── disbursements/
│   │   │   │   ├── DisbursementForm.tsx
│   │   │   │   └── DisbursementApprovalDrawer.tsx
│   │   │   ├── ledger/
│   │   │   │   └── LedgerTable.tsx
│   │   │   └── reports/
│   │   │       └── FinancialReports.tsx
│   │   ├── PermissionGuard.tsx            # RBAC wrapper (allowedRoles or permission prop)
│   │   └── SocketToasts.tsx               # Translates socket events to app:toast CustomEvents
│   ├── lib/                               # Core utilities and integrations
│   │   ├── api.ts                         # Centralized admin API client (apiFetch + apiDownload, 401 refresh, X-Idempotency-Key)
│   │   ├── socket.ts                      # Socket.io singleton (initializeSocket, getSocket, disconnectSocket)
│   │   └── utils.ts                       # Shared utilities (cn, formatNaira, parseNairaToKobo)
│   └── store/                             # Zustand state stores
│       ├── useAuthStore.ts                # Admin auth + profile + MFA + password
│       ├── usePortalStore.ts              # Member-portal auth + portalApi fetch helper
│       ├── useSocketStore.ts              # Socket connection state + connectSocket / onSocketEvent
│       ├── useErrorStore.ts               # Global error state (consumed by Toast)
│       ├── useFilterStore.ts              # Shared filter state (fund, date range)
│       └── useBatchEntryStore.ts          # Batch contribution entry state
├── .env.local                             # Environment variables
├── next.config.mjs                        # Next.js configuration
├── tsconfig.json                          # TypeScript configuration (path alias: @/* → ./src/*)
└── package.json
```

**Note:** `ErrorBanner.tsx` is **not present** in the codebase. Error and success messaging is handled by the global `Toast` component (`src/components/ui/Toast.tsx`) which both listens for `app:toast` CustomEvents and auto-pushes any error stored in `useErrorStore`.

---

### 4. Application Architecture

#### 4.1 Routing Strategy

The application uses **Next.js 14 App Router** with **route groups** to organize routes by purpose while sharing layouts. There are three top-level areas:

- **`(marketing)`** — Public landing page (no auth).
- **`(auth)` + `/portal/login`** — Authentication and onboarding for both the admin app and the member portal.
- **`(dashboard)` + `/portal`** — Two distinct authenticated experiences:
  - `/(dashboard)` — Admin back-office, gated by `useAuthStore`/`AuthGate` and a `PermissionGuard` (all 5 roles allowed at the layout level; individual pages apply granular permission checks).
  - `/portal` — Member self-service, gated by `usePortalStore`; the layout itself redirects unauthenticated members to `/portal/login`.

#### 4.2 Route Map

| Path | Component | Access |
|---|---|---|
| `/` | Landing Page | Public |
| `/login` | Admin Login (with optional MFA challenge) | Public |
| `/signup` | Admin Signup | Public (legacy path) |
| `/register` | Church Registration (multi-tenant onboarding) | Public |
| `/forgot-password` | Request admin password-reset email | Public |
| `/reset-password?token=…` | Set new admin password from emailed token | Public |
| `/verify-email?token=…` | Verify email address (new page created in this task) | Public |
| `/portal/login` | Member Portal Sign-in | Public |
| `/portal/forgot-password` | Request member password-reset email | Public |
| `/dashboard` | Dashboard Home (metrics + welcome) | Authenticated |
| `/funds` | Funds Management | Authenticated |
| `/chart-of-accounts` | Chart of Accounts | Authenticated (`chart-of-accounts:create` for form) |
| `/ledger` | General Ledger | Authenticated |
| `/contributions` | Contributions | Authenticated (`contribution:create` for entry; read/update/delete permissions for history actions) |
| `/disbursements` | Disbursements | Authenticated |
| `/pledges` | Pledges | Authenticated |
| `/members` | Member Directory | Authenticated |
| `/vendors` | Vendors | Authenticated |
| `/budgets` | Department/Fund Budgets | Authenticated |
| `/reports` | Financial Reports | Authenticated |
| `/settings` | Profile + Password + 2FA | Authenticated |
| `/audit` | Audit Logs | `audit:read` permission |
| `/users` | User Management | `SUPER_ADMIN` only |
| `/periods` | Period Locking | `SUPER_ADMIN`, `TREASURER`, `AUDITOR` |
| `/portal/dashboard` | Member overview (totals, recent pledges) | Member portal |
| `/portal/pledges` | Member's pledge progress | Member portal |
| `/portal/donations` | Member's contribution history | Member portal |
| `/portal/settings` | Change member-portal password | Member portal |

---

### 5. State Management

The application uses **Zustand** for client-side state management. Six stores handle different concerns. Token persistence is handled manually via `localStorage` (no Zustand persist middleware). The admin app and member portal use **separate stores** so that their tokens (`auth_token` vs `portal_token`) never collide.

#### 5.1 `useAuthStore`

Manages admin-app authentication, profile, and security state.

- **State:** `user: User | null`, `token: string | null`, `isAuthenticated: boolean`, `isLoading: boolean`
- **Actions:** `login`, `verifyMfa`, `signup`, `registerChurch`, `logout`, `checkAuth`, `updateProfile`, `changePassword`, `enableMfa`, `disableMfa`
- **Token Storage:** `localStorage` key `auth_token` (read via `getStoredToken()`)
- **Auth Validation:** `checkAuth()` calls `/auth/me` to validate the stored token; on failure the token is removed and the user is signed out.
- **MFA flow:** `login()` returns `{ mfaRequired: true, mfaUserId }` when the server indicates an MFA challenge; the login page then calls `verifyMfa(userId, code)` against `/auth/login/mfa` to complete sign-in.
- **User Interface:**
  ```typescript
  interface User {
    id: string;
    email: string;
    name: string;
    role: 'SUPER_ADMIN' | 'TREASURER' | 'FINANCIAL_SECRETARY' | 'AUDITOR' | 'DEPARTMENT_HEAD';
    organizationId: string;
    organizationName: string;
    mfaEnabled?: boolean;
    emailVerified?: boolean;
  }
  ```
- **Multi-Tenant:** Every user is scoped to an `organizationId`. `registerChurch` performs onboarding by calling `/auth/register` with `churchName`, `adminName`, `email`, `password` and stores the returned token.

#### 5.2 `usePortalStore`

Manages member-portal authentication, separate from admin auth.

- **State:** `member: PortalMember | null`, `token: string | null`, `isAuthenticated: boolean`, `isLoading: boolean`
- **Actions:** `login`, `logout`, `checkAuth`
- **Token Storage:** `localStorage` key `portal_token` (read via `getStoredToken()`)
- **PortalMember Interface:**
  ```typescript
  interface PortalMember {
    id: string;
    fullName: string;
    email: string;
    memberNumber?: string | null;
    organizationId: string;
    organizationName?: string;
  }
  ```
- **`portalApi` helper:** The store also re-exports a standalone `api<T>(endpoint, options)` helper used by all portal pages. It calls `${NEXT_PUBLIC_API_URL}/api/portal{endpoint}`, attaches the bearer token, performs a single-flight refresh on `401` (POST `/api/portal/refresh` with `credentials: 'include'`), and surfaces a `Session expired` error if the refresh fails. The token is also persisted via httpOnly cookies so SSR/refresh works.
- **Auth Validation:** `checkAuth()` calls `/api/portal/me` to validate the stored token; on failure the token is removed.
- **Distinct from `useAuthStore`:** Separate store, separate token, separate API base path — signing out of one does not sign out the other.

#### 5.3 `useSocketStore`

Manages Socket.io connection lifecycle and state for the admin app. The Zustand store holds connection state; standalone exported functions manage the actual socket.

- **Store State:** `isConnected: boolean`, `socketError: string | null`
- **Store Actions:** `subscribe`, `unsubscribe`, `clearSocketError`
- **Exported Functions:**
  - `connectSocket(token: string)` — Initializes or reuses a Socket.io connection. Guards with a `currentToken` so identical token calls are no-ops; if the token changes, the previous socket is disconnected, the `currentListeners` map is cleared, and a new socket is created. Registers `connect`, `disconnect`, `connect_error`, and `connect_timeout` handlers that update store state. Replays all tracked listeners on the new socket.
  - `disconnectSocketStore()` — Disconnects the socket, clears the token, removes all tracked listeners, and resets store state.
  - `onSocketEvent(event, listener)` / `offSocketEvent(event, listener)` — Register/remove persistent listeners tracked in a `Map`; re-applied automatically on reconnect.
- **Lifecycle:** Connected/disconnected in `providers.tsx`'s `AuthGate` based on `user` and `token` state. Cleanup runs on unmount and token change.

#### 5.4 `useErrorStore`

Global error state management.

- **State:** `error: string | null`
- **Actions:** `setError`, `clearError`
- **Behavior:** `apiFetch` calls `clearError()` before every request, then `setError()` if the request fails (or if a network error is detected). The global `Toast` component subscribes to this store and auto-dispatches a red `app:toast` CustomEvent whenever `error` is set, then clears the store.

#### 5.5 `useFilterStore`

Shared filter state for reports and ledger pages.

- **State:** `fundId: string | null`, `startDate: string | null`, `endDate: string | null`
- **Actions:** `setFundId`, `setDateRange`, `resetFilters`
- **Usage:** Shared between `FinancialReports` and `LedgerTable`.

#### 5.6 `useBatchEntryStore`

Manages batch contribution entry state.

- **State:** `entries: ContributionEntry[]`, `isSubmitting: boolean`
- **Actions:** `addEntry`, `removeEntry`, `clearBatch`, `submitBatch`, `getTotalKobo`
- **`ContributionEntry.type`:** `'CASH' | 'CHECK' | 'ENVELOPE'` (manually recorded; no `ONLINE`/gateway option).
- **`submitBatch`** — Sends all entries to `/contributions/batch` as a single atomic request, then clears the batch on success.
- **In-flight protection:** submission state is tracked in a ref as well as in the store, so a rapid double-click cannot start two batches. The batch idempotency key is retained across a retry of the same batch so the backend replays the original response instead of double-posting (see §6.4).

---

### 6. API Integration

The admin app and the member portal use **two separate HTTP layers** because they hit different backend route trees (`/api/*` vs `/api/portal/*`) and use different token namespaces.

#### 6.1 Admin API Client (`src/lib/api.ts`)

All admin API communication goes through a single generic `apiFetch<T>` function plus an `apiDownload` helper:

```typescript
apiFetch<T>(endpoint: string, options: ApiFetchOptions = {}): Promise<T>
```

Where `ApiFetchOptions` is:
```typescript
interface ApiFetchOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: HeadersInit;
  skipAuth?: boolean;
  retryOn401?: boolean; // default true
  idempotencyKey?: string; // explicit key; otherwise auto-generated for guarded endpoints
}
```

**Features:**

- **Auth header injection:** Reads `auth_token` from `localStorage` and attaches `Authorization: Bearer <token>`.
- **Auth route exemption:** `shouldAttachAuth(endpoint)` uses regex `/^\/auth\/(login|signup|register|forgot-password|reset-password|refresh)$/` to skip auth. The `skipAuth` option can also force-skip auth.
- **Idempotency header injection:** For `POST` / `PUT` / `PATCH` requests that hit a key-required endpoint (`/contributions`, `/disbursements`, `/ledger`, `/journals`), `apiFetch` attaches `X-Idempotency-Key` automatically. It uses the caller-supplied `options.idempotencyKey` when present, otherwise a fresh `createIdempotencyKey()` (UUID v4). A caller that may retry the *same logical submission* (see §6.4) should pass its retained key so the retry replays the original response instead of executing again.
- **URL resolution (`resolveUrl`):**
  - In development without `NEXT_PUBLIC_API_URL`, API calls are proxied through `/api` (relative to the Next.js server).
  - In production, uses `NEXT_PUBLIC_API_URL` (e.g. `https://api.example.com/api`).
  - Fallback when no env var is set and not in dev: `http://localhost:3001/api`.
- **401 single-flight refresh:** When a request returns 401 and auth was attached, `tryRefresh()` is invoked (cached behind a `refreshPromise` so concurrent requests share one refresh attempt). On success the new token is stored in `localStorage` and the original request is retried with `retryOn401: true`. The `/auth/refresh` endpoint itself is never recursively retried. If the refresh fails, the local token is removed and the user must sign in again.
- **Error handling:** Parses error responses (JSON or plain text), extracts `message` → `error` → stringifies object → falls back to `API Error <status>`. Network errors (`Failed to fetch`, `NetworkError`, `ECONNREFUSED`) are mapped to a user-friendly "Cannot reach the server" message. Errors are pushed to `useErrorStore` (consumed by the global `Toast`) and rethrown.
- **204 handling:** Returns `undefined` for HTTP 204 No Content responses.
- **Body serialization:** Automatically `JSON.stringify`s the body unless it's already a string.
- **Credentials:** Uses `credentials: 'include'` for proxy requests so httpOnly refresh cookies travel; omits credentials for absolute cross-origin URLs.

```typescript
export async function apiDownload(endpoint: string, defaultFilename = 'download'): Promise<void>
```

- Downloads a blob from the API endpoint with the bearer token.
- Extracts filename from `Content-Disposition` header if present.
- Triggers a browser download via a dynamically created `<a>` element.

#### 6.2 Member Portal API (`portalApi` in `usePortalStore.ts`)

The portal uses a lighter in-store `api<T>(endpoint, options)` helper rather than the admin `apiFetch`:

- **Base URL:** `${NEXT_PUBLIC_API_URL}/api/portal{endpoint}` (no dev-time proxy).
- **Auth:** Bearer `portal_token` from `localStorage`.
- **401 refresh:** On 401 (and not a `login`/`refresh` endpoint), POSTs to `/api/portal/refresh` with `credentials: 'include'`. If that succeeds, the original request is replayed with the fresh token. If it fails, the portal token is removed and a `Session expired` error is thrown.
- **Response:** `204` → `undefined`; otherwise JSON. Error messages are pulled from `error` (string) on the response body.
- **Re-exported** as `portalApi` so portal pages import it directly: `import { portalApi, usePortalStore } from '@/store/usePortalStore'`.

#### 6.3 Socket.io Integration (`src/lib/socket.ts`)

Real-time communication for the admin app via a singleton Socket.io client:

- `initializeSocket(token: string): Socket` — Creates a `socket.io-client` `io()` instance with `auth: { token }` and `autoConnect: true`. Returns the existing singleton if one is already created. Logs `Real-time notification engine connected` on `connect`.
- `getSocket(): Socket | null` — Returns the current singleton instance.
- `disconnectSocket(): void` — Disconnects and nullifies the client.
- **URL:** `NEXT_PUBLIC_SOCKET_URL` env var, defaults to `http://localhost:3001`.

**Real-time events handled by `SocketToasts` (admin app only):**
- `disbursement:approval_requested` — New disbursement request → info toast with purpose + formatted amount
- `disbursement:approved` / `disbursement:first_approved` — Approval status change
- `disbursement:rejected` — Rejection notification
- `disbursement:paid` — Payment recorded (includes payment method)
- `contribution:created` — Batch contribution recorded (count from payload)
- `ledger:created` — Generic "Ledger updated" info toast

The member portal does **not** currently subscribe to socket events; portal data is loaded on demand via `portalApi`.

#### 6.4 Duplicate-submission protection (`X-Idempotency-Key`)

The backend requires an `X-Idempotency-Key` (UUID v4) on `POST` / `PUT` / `PATCH` for `/contributions`, `/disbursements`, `/ledger`, and `/journals`, and replays the cached response for a repeated key instead of executing the write twice. The frontend therefore mints **one key per logical submission**, never one per render or per click:

```typescript
// src/lib/api.ts
export function createIdempotencyKey(): string          // crypto.randomUUID() with a manual UUID v4 fallback
export function requiresIdempotencyKey(method: string, endpoint: string): boolean
```

```typescript
// src/hooks/useIdempotentSubmit.ts
const { run, pending, resetKey } = useIdempotentSubmit(async (key: string, ...args) => {
  await apiFetch('/disbursements', { method: 'POST', body, idempotencyKey: key });
});
```

`useIdempotentSubmit` gives each component:
- an in-flight ref guard, so a rapid double-click (or Enter + click) returns `undefined` immediately instead of firing a second request;
- a key generated **once** and reused for retries of that same submission. It is cleared on success (next submit = new operation) and **retained on failure**, so "Try again" replays the original response instead of executing the write twice. `resetKey()` discards it explicitly after a form reset or a user-initiated change of intent;
- a `pending` flag used to disable the submit button and show a pending label.

Adoption rules for pages on key-required endpoints:

| Rule | Reason |
|---|---|
| Disable the submit button while a request is in flight | Prevents the visible double-click; the backend key alone would replay, but the user should not see a duplicate-looking action |
| Keep the key stable across retries of one intent | A new key would let the backend execute the write a second time |
| Mint a new key only after a *successful* response or a user-initiated change of intent | Prevents a corrected-after-validation-error edit from replaying a stale cached response. `useIdempotentSubmit` already does this: it clears the key on success and keeps it on failure. |
| Never derive the key from `Math.random()`/`Date.now()` | The backend requires a strict UUID v4 |

`useBatchEntryStore` keeps the batch keys in its state so a retried batch replays the original response and cannot double-post a pledge batch.

Current adoption:
- `useIdempotentSubmit` is used where the endpoint is key-required and retries matter: `disbursements/page.tsx` (create + status actions), `components/modules/disbursements/DisbursementApprovalDrawer.tsx` (approve), and `ledger/page.tsx` (reversal).
- Single-shot forms on non-key-required endpoints (members, vendors, budgets, funds, chart of accounts, pledges) use a local `isSubmitting`/ref guard plus a disabled button. They are protected against double-clicks client-side only — a second request would still reach the API, so it is worth promoting them to the hook if they ever gain retry semantics.

---

### 7. Authentication & Authorization

#### 7.1 Admin Authentication Flow

1. **App Initialization:** Root layout mounts `Providers` → `AuthGate` (`providers.tsx`).
2. **Auth Check:** `checkAuth()` verifies the stored `auth_token` by calling `/auth/me`.
3. **Loading State:** A centered "Loading…" spinner is shown while `isLoading` is true.
4. **Sign-in:** `login()` POSTs to `/auth/login`. If the response carries `mfaRequired: true`, the login page collects the 6-digit code and calls `verifyMfa(userId, code)` against `/auth/login/mfa`. Otherwise, the returned token is stored and `/auth/me` is fetched to populate the user.
5. **Token storage:** `auth_token` in `localStorage`; refresh token in an httpOnly cookie (set by `/auth/refresh`).
6. **401 mid-session:** `apiFetch` auto-refreshes once via `/auth/refresh`; on refresh failure the local token is removed and the user is signed out.
7. **Logout:** POSTs `/auth/logout`, removes `auth_token` from `localStorage`, and resets the store. The sidebar redirects to `/login` after sign-out.
8. **Socket lifecycle:** `AuthGate` calls `connectSocket(token)` whenever both `user` and `token` are present, and `disconnectSocketStore()` on sign-out or token change.

#### 7.2 Admin Password Reset & Self-Service

- **Forgot password:** `/forgot-password` posts the email to `/auth/forgot-password`; the backend emails a reset link with a token. The form shows a "check your inbox" confirmation regardless of whether the email exists (avoids account enumeration).
- **Reset password:** `/reset-password?token=…` reads the token from the query string, posts `token + newPassword` to `/auth/reset-password`, then redirects to `/login` on success.
- **Change password (signed in):** Settings page → "Change password" form posts `currentPassword + newPassword` to `/auth/change-password`.
- **Email verification:** New `/verify-email` page reads `token` from query params and calls `POST /api/auth/verify-email`. Shows success/error inline and links back to `/login`. Built with `Suspense` because it uses `useSearchParams()`.
- **MFA:** Backend stores `emailVerified` and `mfaEnabled` on `User`. The settings page exposes a "Two-factor authentication" toggle (calls `/auth/mfa/enable` or `/auth/mfa/disable` and refreshes `/auth/me`). When MFA is enabled, the next sign-in is challenged with a 6-digit code emailed to the user (per backend `MfaChallenge` model).

#### 7.3 Member Portal Authentication Flow

1. `/portal/layout.tsx` calls `usePortalStore.checkAuth()` on mount, which validates `portal_token` against `/api/portal/me`.
2. While loading or unauthenticated, the layout redirects (except for `/portal/login` and `/portal/forgot-password`) to `/portal/login`.
3. Sign-in posts `email + password` to `/api/portal/login`; on success the token is stored under `portal_token` and `member` is populated.
4. 401 mid-session triggers a single-flight POST to `/api/portal/refresh` (cookie-based). On failure the portal token is cleared and the user must sign in again.
5. Logout posts to `/api/portal/logout`, clears `portal_token`, and the layout redirects to `/portal/login`.
6. The portal has its **own** password-reset flow (`/portal/forgot-password` → email → backend `portalAuthService`) and a settings page that lets a member change their portal password.

The admin app and member portal sessions are **fully independent** — signing out of one does not affect the other.

#### 7.4 Authorization (RBAC) — Admin App

The `PermissionGuard` component (`src/components/PermissionGuard.tsx`) wraps protected content and supports two modes:

```typescript
<PermissionGuard allowedRoles={['SUPER_ADMIN', 'TREASURER']}>
  {/* Role-based: user.role must be in allowedRoles */}
</PermissionGuard>

<PermissionGuard permission="chart-of-accounts:create">
  {/* Permission-based: user.role must have the specific permission */}
</PermissionGuard>
```

`PermissionGuard` props:
- `allowedRoles?: Role[]` — Restricts by role
- `permission?: string` — Restricts by granular permission string
- `fallback?: ReactNode` — Rendered when access is denied (defaults to `null`)

The dashboard layout wraps every page in `<PermissionGuard allowedRoles={[...all 5 roles...]} fallback={...}>`, so any signed-in user can land on the dashboard but each page then applies its own finer-grained checks. `hasPermission(role, permission)` is exported for use in sidebar/nav logic.

##### 7.4.1 Role-to-Permission Matrix

| Role | Permissions |
|---|---|
| `SUPER_ADMIN` | Full access: fund CRUD, ledger CRUD + reverse, disbursement CRUD + approve + reject, report export + read, `user:manage`, `audit:read`, pledge CRUD, contribution read + batch + receipt, chart-of-accounts CRUD, vendor CRUD, department CRUD |
| `TREASURER` | chart-of-accounts CRUD, contribution read + create + batch + update + delete + receipt, vendor CRUD, member CRUD, disbursement create + read + approve (first and second approval) + reject, pledge CRUD, budget CRUD, fund CRUD, plus `ledger:read`, `report:read`, `report:export`, `department:read`. No `user:manage`, no `audit:read`, no `ledger:create` / `ledger:reverse`, and no `department:create/update/delete` |
| `FINANCIAL_SECRETARY` | member CRUD, contribution CRUD + receipt, pledge CRUD, vendor read, and income-only reports; no expense, balance, ledger, user, or audit views |
| `AUDITOR` | `audit:read`, ledger read, report read, disbursement read, pledge read, contribution read, chart-of-accounts read |
| `DEPARTMENT_HEAD` | disbursement create + read, report read, pledge read |

#### 7.5 Multi-Tenancy

- Every admin user belongs to a single **organization** (church); every portal member is scoped to a `Member.organizationId`.
- Admin `User` carries `organizationId` + `organizationName`; portal `PortalMember` carries `organizationId` + `organizationName`.
- Church onboarding is handled via `/register`, which calls `registerChurch` (`/auth/register`).
- Dashboard chrome (`Header`, `Sidebar`) displays the active organization name; portal chrome shows it in the header.
- All API requests are implicitly scoped to the user's organization via the JWT Bearer token (admin) or portal JWT (members).
- `/users` is exclusively restricted to `SUPER_ADMIN` via `PermissionGuard`.

---

### 8. Currency Handling

All financial values are processed, stored, and transmitted as **integer Kobo** (1 Kobo = 0.01 NGN). The backend never accepts or returns decimal Naira values. Several backends in the codebase return amounts as **stringified Kobo** (for BigInt safety); the frontend handles both string and number inputs.

#### 8.1 Utilities (`src/lib/utils.ts`)

```typescript
formatNaira(kobo: number): string
// Converts numeric Kobo to a localized Naira string using Intl.NumberFormat('en-NG', ...).
// Example: 150050 -> "₦1,500.50"

parseNairaToKobo(input: string | number): number
// Parses user text input into integer Kobo before API submission.
// Strips commas and non-numeric/non-decimal characters.
// Example: "1,500.50" -> 150050

cn(...inputs: ClassValue[]): string
// Composes class names with clsx + tailwind-merge (conditional class deduplication)
```

The portal pages do **not** import from `lib/utils.ts`; they use a local `koboToNaira(kobo: string)` helper that calls `Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN' })` directly because portal payloads always come back as string Kobo.

#### 8.2 Usage in Forms

All financial input forms parse user input with `parseNairaToKobo` before API submission:

- `BatchContributionForm.tsx` — contribution amount input
- `DisbursementForm.tsx` — disbursement header amount and line item amounts
- `pledges/page.tsx` — pledge amount input

#### 8.3 Usage in Tables & Views

All financial values are formatted using `formatNaira` (admin app) or `koboToNaira` (portal) for display:

- `LedgerTable.tsx`
- `BatchContributionForm.tsx` (batch total)
- `contributions/page.tsx` (Recent Contributions table)
- `DisbursementApprovalDrawer.tsx` (amount display)
- `disbursements/page.tsx` (amount column)
- `pledges/page.tsx` (amount column)
- `FinancialReports.tsx` (all report previews — uses an internal `formatKoboString` helper that accepts string | number | bigint)
- `audit/page.tsx` (batch contribution descriptions)
- `dashboard/page.tsx` (Total Fund Balances metric)
- `portal/dashboard/page.tsx`, `portal/pledges/page.tsx`, `portal/donations/page.tsx`

---

### 9. UI / Design System

#### 9.1 Styling Approach

- **Tailwind CSS v4** with theme tokens defined directly in `globals.css` using the `@theme` directive (no separate `tailwind.config.ts`).
- Imports via `@import "tailwindcss"` in `globals.css`.
- Utility-first CSS with the `cn()` helper (clsx + tailwind-merge) for conditional class composition.
- `@layer base` applies global border-color and body background/foreground.

#### 9.2 Color Palette

Theme tokens are defined in `globals.css` under `@theme`:

| Category | Tokens | Usage |
|---|---|---|
| **Standard** | `--color-border`, `--color-input`, `--color-ring`, `--color-background`, `--color-foreground`, `--color-muted`, `--color-card`, `--color-popover` | Default UI surfaces and text |
| **Primary** | `--color-primary` (#0F172A), `--color-primary-foreground` | Primary actions (mapped to navy-900) |
| **Secondary** | `--color-secondary` (#1E293B), `--color-secondary-foreground` | Secondary elements |
| **Accent** | `--color-accent` (#4F46E5) | Interactive/highlight elements |
| **Destructive** | `--color-destructive` (#E11D48) | Error/danger states |
| **Financial** | `--color-income` (#059669), `--color-warning` (#D97706), `--color-expense` (#E11D48), `--color-financial-income/pending/expense` | Positive/amber/negative deltas |
| **Brand** | `--color-brand-navy` (#0F172A), `--color-brand-slate` (#1E293B), `--color-brand-indigo` (#4F46E5), `--color-surface-bg` (#F8FAFC) | Brand-specific tokens |
| **Navy Scale** | `--color-navy-50` to `--color-navy-950` (10 steps) | Layout surfaces, text hierarchy |
| **Gold Scale** | `--color-gold-50` to `--color-gold-900` (10 steps) | Accent highlights (sidebar active state, user avatar) |
| **Radius** | `--radius-lg` (0.5rem), `--radius-md`, `--radius-sm` | Border-radius scales |

#### 9.3 Component Library

- **Radix UI** primitives for accessible dialogs (`@radix-ui/react-dialog`), dropdown menus (`@radix-ui/react-dropdown-menu`), and selects (`@radix-ui/react-select`). Many forms still use inline `<select>` elements directly rather than the Radix Select primitive.
- **Custom Table** (`table.tsx`) — Component-based table primitives (Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell, TableCaption) following the shadcn/ui pattern. TanStack React Table is declared as a dependency but the codebase uses plain HTML tables and the custom Table primitives; TanStack is available for future enhanced-table features.
- **Lucide React** for consistent iconography (icons used include LayoutDashboard, Wallet, BookOpen, HandCoins, Receipt, Heart, FileText, Store, Calculator, LogOut, Users, X, History, UserPlus, Lock, Menu, Shield, BarChart3, ArrowRight, CheckCircle2, Target, UserCog).
- **date-fns** — used in `users/page.tsx` for `format(date, 'MMM d, yyyy')`.
- **Custom Toast** — `Toast.tsx` uses a `window` `app:toast` CustomEvent pattern for decoupled cross-component communication, plus a `useErrorStore` subscription that auto-toasts any backend error and then clears it.

#### 9.4 Toast & Notification System

- **`Toast.tsx`** (global, rendered in the root layout):
  - Listens for `app:toast` CustomEvents dispatched on `window`.
  - Auto-pushes error toasts from `useErrorStore` (then clears the error so the same message doesn't toast twice).
  - Toast types: `info` (blue), `success` (green), `error` (red).
  - 5-second auto-dismiss with manual dismiss button.
  - Positioned `fixed bottom-4 right-4 z-50`.

- **`SocketToasts.tsx`** (rendered inside the dashboard layout):
  - Subscribes to 7 Socket.io events via `onSocketEvent`.
  - Translates each event into an `app:toast` CustomEvent with the appropriate type and message.
  - Automatically cleans up all listeners on unmount.

---

### 10. Key Features & Modules

#### 10.1 Funds Management (`funds/page.tsx`)
- Create and manage church funds with `isRestricted` flag.
- Paginated API: `/funds?page=1&pageSize=100`.
- `PaginatedResponse<T>` envelope: `{ data, total, page, pageSize }`.
- Inline error states and loading spinners.

#### 10.2 Chart of Accounts (`chart-of-accounts/page.tsx`)
- Hierarchical account structure for double-entry bookkeeping.
- Account types: `ASSET`, `LIABILITY`, `EQUITY`, `INCOME`, `EXPENSE`.
- Optional parent account linking, edited through a `parentAccountCode` field: pick a code to nest the account under it, or clear the field to detach it back to a root account. The backend rejects a self-parent or a parent that is one of the account's own descendants (cycle prevention), so a circular hierarchy cannot be created from the UI.
- Create **and edit** dialogs, gated by `PermissionGuard` with `permission="chart-of-accounts:create"` / `chart-of-accounts:update`, plus per-row activate/deactivate actions (`chart-of-accounts:update`).
- Active/inactive status badges.
- Submissions run through the in-flight guard so a double-click on Save cannot create two accounts (§6.4).

#### 10.3 Ledger (`ledger/page.tsx` + `LedgerTable.tsx`)
- General ledger with date range filtering, fund filtering, and search.
- Transaction reversal capability (`PATCH /ledger/{id}/reverse`).
- Uses `useFilterStore` for shared filter state.
- `LedgerTable` component encapsulates filtering and rendering logic.
- Entry types: `DONATION`, `EXPENSE`, `TRANSFER`, `REVERSAL`.

#### 10.4 Contributions (`contributions/page.tsx` + `BatchContributionForm.tsx`)
- Single and batch contribution entry via `BatchContributionForm` (gated by `contribution:create` permission).
- Automatic total calculation via `useBatchEntryStore.getTotalKobo()`.
- Atomic batch submission to `/contributions/batch`.
- Contribution types: `CASH`, `CHECK`, `ENVELOPE` (manually recorded by treasurers; the app does not process member payments via external gateways).
- Recent contributions table with PDF receipt download via `apiDownload` (`/contributions/{id}/receipt.pdf`).
- `ContributionEntry` interface: `memberId`, `memberName`, `fundId`, `amountInKobo`, `type`, `date`, `notes`, `pledgeId`.

#### 10.5 Disbursements (`disbursements/page.tsx` + module components)
- **Dual-approval workflow** with 6 statuses: `PENDING`, `FIRST_APPROVED`, `APPROVED`, `REJECTED`, `PAID`, `CANCELLED`. `PAID`, `REJECTED` and `CANCELLED` are terminal — the drawer hides actions that are no longer legal for the current status.
- `DisbursementForm` — create request with purpose, total amount, optional vendor/department IDs, and line items (with mismatch validation: header total must equal sum of line items).
- `DisbursementApprovalDrawer` — review drawer with approve/reject/mark-paid actions:
  - First approval → `PATCH /disbursements/{id}/first-approve`
  - Second approval → `PATCH /disbursements/{id}/second-approve`
  - Reject with reason → `PATCH /disbursements/{id}/reject` (only from `PENDING` / `FIRST_APPROVED`)
  - Cancel / storno → `PATCH /disbursements/{id}/cancel`, shown only from `APPROVED` or `PAID` and restricted to `SUPER_ADMIN` (the route guard is stricter than the treasurer's `disbursement:reject` permission)
  - Mark as paid → `PATCH /disbursements/{id}/mark-paid` (only from `APPROVED`; payment method: `BANK_TRANSFER`, `CASH`, `CHEQUE`, `POS` — internal payment record only; no gateway involvement)
  - Approval restricted to `SUPER_ADMIN` and `TREASURER`; the request creator cannot approve their own request.
- Every approval action is sent with a stable `X-Idempotency-Key` and the button is disabled while in flight, so an accidental double-tap cannot record two approvals or pay a request twice (§6.4). The backend independently guards this with a row lock and a conditional status update, so a stale or duplicated tab is rejected with `409` rather than paid again.
- Status color-coded badges in the disbursements table.

#### 10.6 Pledges (`pledges/page.tsx`)
- Track member pledges with fulfillment status (`ACTIVE`, `COMPLETED`, `CANCELLED`).
- Recurring and one-time pledge support.
- Start/end date range with fund allocation.
- Amount parsed via `parseNairaToKobo` before submission.

#### 10.7 Members (`members/page.tsx`)
- Member directory with debounced search (300 ms delay).
- CRUD via `/members` endpoint with `PaginatedResponse<T>` envelope.
- Fields: `fullName`, `email`, `phone`, `address`, `memberNumber`, `isActive`, `joinedAt`.

#### 10.8 Vendors (`vendors/page.tsx`)
- Vendor management with name, email, phone, address.
- Simple inline table with create dialog.

#### 10.9 Budgets (`budgets/page.tsx`)
- Per-department, per-fund, per-month budgets for a fiscal year.
- Composite uniqueness on (department, fund, fiscalYear, month).
- Create/edit/delete via dialog with full form validation.

#### 10.10 Financial Reports (`reports/page.tsx` + `FinancialReports.tsx`)
- Five report types with in-app preview:
  - **Balance Sheet** — Assets, Liabilities, Equity with net-income reconciliation and balance validation.
  - **Statement of Activities** — Income, expenses, net income, broken down by fund.
  - **Trial Balance** — Per-account debit/credit balances with totals.
  - **Cash Flow Statement** — Opening balance, inflow, outflow, net, closing balance.
  - **Budget vs Actual** — Per-department/fund/month variance analysis.
- Export formats: CSV, XLSX, PDF (via `apiDownload`).
- Filters: `fundId`, `startDate`, `endDate` (via `useFilterStore`).
- All Kobo-string values formatted via an internal `formatKoboString` helper (handles string / number / bigint from the backend).

#### 10.11 Audit Logs (`audit/page.tsx`)
- Read-only audit trail, gated by `audit:read` permission.
- Action-based filtering (by action name, e.g. `CREATE_FUND`).
- Pagination (50 per page) with Previous/Next controls.
- Smart description generation for:
  - **HTTP logs** — parses request path/method/body to produce human-readable descriptions (e.g. "Created Fund: Grace Building Fund").
  - **Entity logs** — produces "Created a new {entity}" / "Updated {entity}" / "Deleted {entity}" / "Voided {entity}".
  - **Period logs** — produces "Locked fiscal year {year}, month {month}" / "Unlocked fiscal year {year}, month {month}".
- Resource singularization logic handles irregular plurals (`ies → y`, `ses`/`xes`/`zes → drop suffix`).
- Static resource-label map: `funds`, `chart-of-accounts`, `pledges`, `contributions`, `vendors`, `disbursements`, `users`, `departments`, `budgets`, `members`, `ledger-entries`, `journal-entries`, `periods`.

#### 10.12 Period Locking (`periods/page.tsx`)
- Fiscal period management for month-end/year-end close.
- Lock a period (fiscal year + month) to prevent new ledger entries.
- Unlock (`SUPER_ADMIN` only).
- Restricted to `SUPER_ADMIN`, `TREASURER`, `AUDITOR` via `PermissionGuard` with `allowedRoles`.

#### 10.13 User Management (`users/page.tsx`)
- `SUPER_ADMIN`-only access via `PermissionGuard` on both the create button and the entire content.
- Create users with name, email, password, and role assignment.
- Inline role change via dropdown (`PATCH /users/{id}/role`).
- Delete users with confirmation prompt (`DELETE /users/{id}`).
- Uses `date-fns` `format()` for date rendering.

#### 10.14 Settings (`settings/page.tsx`)
- Three sections in one page:
  1. **Profile** — update name + email via `updateProfile` (`PATCH /auth/me`). Changing email marks the address as unverified on the backend.
  2. **Change password** — current + new password via `changePassword` (`POST /auth/change-password`).
  3. **Two-factor authentication** — enable/disable via `enableMfa` / `disableMfa`; the next sign-in is challenged with a 6-digit code emailed to the user (per backend `MfaChallenge` model).

---

### 11. Member Portal (`/portal`)

A read-only self-service experience for church members, built around a separate `usePortalStore` and `portalApi` (see §5.2 and §6.2). Members can view their pledge progress and contribution history, and change their portal password. The portal never exposes the admin app's organizations, funds, or transactions; it is strictly scoped to the signed-in member.

#### 11.1 Layout & Chrome
- `portal/layout.tsx` runs `checkAuth()` on mount and redirects unauthenticated users to `/portal/login` (except for `/portal/login` and `/portal/forgot-password`, which are rendered without the chrome).
- While loading, a centered "Loading…" is shown on the navy-900 background.
- Authenticated chrome is a navy-900 header (org name, member identity, sign-out button) and a navy-800 tab bar with 4 tabs: **Overview**, **Pledges**, **Donations**, **Settings**.
- No socket connection — all data is loaded on demand via `portalApi`.

#### 11.2 Overview (`portal/dashboard/page.tsx`)
- Loads `/api/portal/summary` → `{ totalDonated, totalPledged, totalFulfilled, activePledges, donationCount, recentPledges[] }`.
- Renders summary cards (formatted via a local `koboToNaira` helper) and a list of recent pledges with progress bars.

#### 11.3 Pledges (`portal/pledges/page.tsx`)
- Loads `/api/portal/summary` and lists each pledge with `fundName`, `amountInKobo`, `fulfilledInKobo`, `remainingInKobo`, status, and a progress percentage.

#### 11.4 Donations (`portal/donations/page.tsx`)
- Loads `/api/portal/summary` and lists each contribution with `fundName`, `amountInKobo`, date, and description.

#### 11.5 Settings (`portal/settings/page.tsx`)
- Change-password form: posts `currentPassword + newPassword` to `/api/portal/change-password`.

#### 11.6 Forgot Password (`portal/forgot-password/page.tsx`)
- Email-only form posting to `/api/portal/forgot-password`; shows a "check your inbox" confirmation regardless of whether the email exists.

#### 11.7 Login (`portal/login/page.tsx`)
- Simple email + password form; on success redirects to `/portal/dashboard`.

---

### 12. Layout & Navigation

#### 12.1 Root Layout (`app/layout.tsx`)
- Uses `next/font/google` Inter font with `variable: '--font-inter'`.
- Wraps the app in `Providers` (AuthGate) and renders the global `Toast` component.
- `suppressHydrationWarning` on `<html>` to handle theme/font hydration.

#### 12.2 Dashboard Layout (`(dashboard)/layout.tsx`)

Wraps dashboard pages in three layers:
```
DashboardLayout (Sidebar + Header + main slot)
  └─ SocketToasts (real-time notification wiring)
  └─ PermissionGuard (all 5 roles allowed; fallback "no permission" message)
       └─ children (page content)
```

#### 12.3 Sidebar (`components/layout/Sidebar.tsx`)
- Accepts optional `open` and `onClose` props so the layout can present it as a slide-over on mobile.
- Static on `lg+`, fixed off-canvas drawer below `lg` with a black backdrop and close button.
- Base nav items (all roles): Dashboard, Funds, Chart of Accounts, General Ledger, Contributions, Disbursements, Pledges, Members, Vendors, **Budgets**, Reports.
- Conditional nav items:
  - **Users** — `SUPER_ADMIN` role only
  - **Audit Logs** — `hasPermission(user?.role, 'audit:read')`
  - **Periods** — `SUPER_ADMIN`, `TREASURER`, or `AUDITOR`
- Active route highlighting (prefix matching for nested routes, with a special case so `/dashboard` itself only matches the exact path).
- User profile card with avatar (initials), name, role (humanised), and organization name (in gold).
- **Settings** button and **Sign Out** button at the bottom of the sidebar; sign-out clears the store and routes to `/login`.
- Color scheme: navy background (`bg-navy-900`), gold accent (`text-gold-400`) for the active item and the org-name line.

#### 12.4 Header (`components/layout/Header.tsx`)
- Props: `title?: string`, `right?: ReactNode`, `onMenuClick?: () => void`.
- Displays the organization name (small text above the title).
- Renders a mobile menu button only when `onMenuClick` is provided.
- Also exports a `Breadcrumbs` component (each item is either a clickable button or a static label, separated by `/`).

#### 12.5 Portal Layout (`portal/layout.tsx`)
- Separate from the dashboard layout; renders a header (org name + member identity + sign-out) and a horizontal tab bar.
- Tab order: Overview, Pledges, Donations, Settings.
- Active tab is highlighted with a gold-500 bottom border; inactive tabs use navy-100 text on a navy-800 bar.

---

### 13. Environment Configuration

Defined in `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3001/api
NEXT_PUBLIC_SOCKET_URL=http://localhost:3001
```

| Variable | Purpose |
|---|---|
| `NEXT_PUBLIC_API_URL` | Backend API base URL for the **admin app** (e.g. `http://localhost:3001/api`). When unset in development, admin calls are proxied through the Next.js `/api` route (handled by `resolveUrl` in `api.ts`). The fallback when unset and not in dev mode is `http://localhost:3001/api`. The **member portal** also uses this same var to build `${NEXT_PUBLIC_API_URL}/api/portal/...`, but without the dev proxy. |
| `NEXT_PUBLIC_SOCKET_URL` | Socket.io server URL for the admin app. Defaults to `http://localhost:3001` if unset. |

---

### 14. Development Commands

```bash
npm run dev      # Start development server (Next.js)
npm run build    # Build for production
npm run start    # Start production server
npm run lint     # Run ESLint via Next.js
```

---

### 15. Path Aliases

TypeScript path alias configured in `tsconfig.json`:
```
@/* → ./src/*
```

Example imports:
```typescript
import { apiFetch } from '@/lib/api';
import { useAuthStore } from '@/store/useAuthStore';
import { usePortalStore, portalApi } from '@/store/usePortalStore';
import { Button } from '@/components/ui/button';
import { Header } from '@/components/layout/Header';
import { PermissionGuard, hasPermission } from '@/components/PermissionGuard';
import { BatchContributionForm } from '@/components/modules/contributions/BatchContributionForm';
import { connectSocket, onSocketEvent, offSocketEvent } from '@/store/useSocketStore';
```

---

### 16. Code Conventions

- **TypeScript strict mode** enabled (`strict: true`, `noUnusedLocals`, `noUnusedParameters`, `noFallthroughCasesInSwitch`).
- **Functional components** with hooks.
- **Client components** marked with `'use client'` (App Router convention). The root `layout.tsx`, the `(auth)` layout, and individual `page.tsx` files that fetch on mount are client components; the portal layout is also a client component (it owns the auth gate).
- **Zustand stores** for all client-side state. Admin and portal auth live in separate stores with separate `localStorage` keys (`auth_token` vs `portal_token`).
- **Feature-based component grouping** in `components/modules/`.
- **Centralized API client** with generic typing (`apiFetch<T>`); the portal uses an in-store `portalApi` helper that targets `/api/portal/*` and supports 401 refresh.
- **Role-based access control** via `PermissionGuard` (supports both `allowedRoles` and `permission` props).
- **Shared filter state** via `useFilterStore` for cross-component filter synchronization.
- **Currency safety** — all monetary values are passed as integer Kobo; `parseNairaToKobo` for input, `formatNaira` (admin) or `koboToNaira` (portal) for display.
- **Error pattern** — `useErrorStore` + global `Toast` component. `apiFetch` clears the store before every request and sets it on failure; the `Toast` auto-renders the error and clears the store so the same error isn't toasted twice.
- **Socket event pattern** — `SocketToasts` translates socket events to `app:toast` CustomEvents, consumed by the global `Toast` component. Listeners are tracked in a `currentListeners` map and replayed automatically on reconnect.
- **No payment-gateway integration** — by design, the application does not process member payments. There is no `ONLINE` contribution type, no `PaymentGateway` model, and no webhooks. Disbursement `paymentMethod` is an internal record of how the church paid (cash, cheque, bank transfer, POS), not a gateway call.

### 16.1 Recent fixes

- **Duplicate-submission protection:** `apiFetch` now attaches an `X-Idempotency-Key` (UUID v4) to `POST`/`PUT`/`PATCH` on `/contributions`, `/disbursements`, `/ledger`, and `/journals`, which the backend requires and replays. `useIdempotentSubmit` (`src/hooks/useIdempotentSubmit.ts`) mints one key per logical submission and drops repeat clicks while a request is in flight; `useBatchEntryStore` retains the batch key so a retried batch cannot double-post. See §6.4.
- **Chart of accounts editing:** the page now supports create **and** edit, activate/deactivate, and re-parenting an account via `parentAccountCode` (empty string detaches), so a treasurer can build the hierarchy without direct database access. Cycle creation is rejected server-side.
- **Treasurer permissions expanded:** the treasurer now has CRUD across chart of accounts, contributions, vendors, members, pledges, budgets, and funds, plus the first-approval stage on disbursements. `src/lib/permissions.ts` is kept in sync with the backend matrix — both must be edited together.
- **Email verification page:** Added `src/app/verify-email/page.tsx` — reads `?token=` from the URL and calls `POST /api/auth/verify-email`. Built with `Suspense` because it uses `useSearchParams()`.
- **ESLint `no-empty` fixes:** Replaced empty `catch {}` blocks in `src/store/useAuthStore.ts` and `src/store/usePortalStore.ts` with comments (`// ignore logout errors`, `// ignore JSON parse errors`) to satisfy the linter.

---

### 17. Build Configuration

`next.config.mjs`:
```javascript
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  optimizeFonts: true,
  swcMinify: true,
};
```

| Setting | Effect |
|---|---|
| `reactStrictMode` | Enabled (development double-render, Strict DOM mutations) |
| `poweredByHeader` | Disabled (`x-powered-by` header removed) |
| `compress` | Enabled (GZIP/Brotli compression) |
| `optimizeFonts` | Enabled (font optimization via `next/font`) |
| `swcMinify` | Enabled (SWC-based minification) |

`tsconfig.json`:
- Target: ES2020, Module: ESNext, Module Resolution: `bundler`
- JSX: `preserve`, Strict: `true`
- `allowJs: true`, `resolveJsonModule: true`, `isolatedModules: true`, `incremental: true`
- Path alias: `@/*` → `./src/*`
- Includes: `src`, `next-env.d.ts`, `.next/types/**/*.ts`
