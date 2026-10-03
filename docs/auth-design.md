# Personal Web Authentication Design

> Status: JWT authentication, frontend login/protected routing, and removal of Vite bearer injection are implemented. Production same-origin HTTPS proxy verification remains pending before public deployment.

## Scope

Hermes has one owner and one static web password. There is no user table, username, registration, RBAC, or auth migration. The frontend may be publicly reachable, so the API authenticates every application data request, including reads. A frontend route guard only controls navigation.

Hermes Agent continues to use its separate INTERNAL_API_KEY. Browser requests use a signed JWT in an HttpOnly cookie. Both credentials grant access to the existing domain operations.

## Deployment assumptions

- Serve the frontend and /api through one HTTPS origin. A reverse proxy may route /api to Bun.
- Forward cookies, Set-Cookie, and Origin unchanged. Do not add the Agent bearer key to browser requests.
- Share the same JWT secret across API instances. JWTs remain valid across process restarts when that secret stays the same.
- Do not cache API responses or send /api requests to an SPA HTML fallback.

The exact deployment host and provider remain open decisions. Cross-origin hosting requires a new cookie and CSRF design.

## Server configuration

| Variable | Purpose | Validation |
| --- | --- | --- |
| WEB_AUTH_PASSWORD_HASH | Argon2id PHC hash of the one browser password | Required valid Argon2id v19 hash with bounded cost |
| WEB_AUTH_JWT_SECRET | HS256 signing secret | Required 64 lowercase hex characters representing 32 random bytes |
| WEB_AUTH_ORIGIN | Public browser origin for writes | Exact HTTPS origin outside development; loopback HTTP in development, with `localhost` and `127.0.0.1` aliases on the configured port |
| INTERNAL_API_KEY | Existing Hermes Agent bearer credential | Independent of the browser password and JWT |

JWT expiry is fixed at 86,400 seconds (24 hours); there is no TTL environment variable or auth-off switch. API startup reports invalid configuration key names without displaying values. Database-only migration commands do not need the browser auth settings.

Generate the JWT secret locally with Bun and keep it server-side:

    bun -e 'console.log(require("node:crypto").randomBytes(32).toString("hex"))'

Generate the browser password hash with Bun.password.hash(password, { algorithm: 'argon2id' }). Keep the password out of shell arguments, history, and logs. In Bun dotenv files, escape each literal dollar sign in its PHC hash as a backslash followed by a dollar sign, even inside quotes. Secret-manager process variables use the plain PHC hash. Neither password hash nor JWT secret belongs in VITE_ variables, the frontend bundle, browser storage, URLs, logs, or API response JSON.

## JWT lifecycle

After successful password verification, the API signs a JWT with Hono's HS256 utility. Its claims are a fixed issuer, audience, and subject; issuance time; expiration time; and a random token ID. It carries no password, Agent key, role, or private application data. The API requires the expected algorithm, issuer, audience, claim shape, signature, and a lifetime of exactly 24 hours. All browser requests present it through the cookie.

The JWT is stateless. A restart does not invalidate it. Changing the browser password hash alone does not invalidate previously issued JWTs; rotate WEB_AUTH_JWT_SECRET to invalidate all of them. A fresh login issues a new JWT, while earlier JWTs remain valid until expiration. Logout clears the browser cookie; a copy of the JWT remains valid until its 24-hour expiry. Immediate server-side revocation would require additional state and is outside this design.

## Cookie

| Attribute | HTTPS value |
| --- | --- |
| Name | __Host-hermes_auth |
| Value | Signed JWT |
| HttpOnly | true |
| Secure | true |
| SameSite | Lax |
| Path | / |
| Domain | Omitted |
| Max-Age | 86400 |

The API verifies expiration independently of the browser's Max-Age. For local loopback HTTP development only, use hermes_auth without the host prefix and with Secure=false. Cookie settings derive from the validated WEB_AUTH_ORIGIN, not the request Host header. Use Hono's cookie helper to read, set, and clear the cookie. Old opaque-session cookies are ignored.

## API contract

All responses retain Hermes's snake_case success/error envelope and Cache-Control: private, no-store.

| Method and path | Authentication | Behavior |
| --- | --- | --- |
| POST /api/v1/auth/login | No existing JWT required; exact Origin required | Verify password, issue JWT cookie, return authentication status; 200 |
| GET /api/v1/auth/status | Valid browser JWT cookie required | Return authentication status and unchanged expiry; 200 or 401 |
| POST /api/v1/auth/logout | Exact Origin required; JWT may be absent or expired | Clear cookie; 204 |

Login accepts JSON with exactly one password string of 1–512 characters. Do not trim or normalize it. Require application/json, allowing a charset parameter. Enforce a 4 KiB limit on actual streamed body bytes before JSON parsing. A successful login returns authenticated=true and expires_at as an ISO timestamp; the JWT appears only in Set-Cookie. Status returns the same data shape without renewing expiration. An Agent key alone cannot access status.

Example: a login at 2026-10-01 12:00 UTC expires at 2026-10-02T12:00:00.000Z.

| Status | Code | Meaning |
| --- | --- | --- |
| 400 | VALIDATION_ERROR | Malformed JSON or invalid fields |
| 401 | INVALID_CREDENTIALS | Password mismatch |
| 401 | UNAUTHENTICATED | Missing, malformed, invalid, or expired JWT; invalid Agent bearer |
| 403 | FORBIDDEN | Missing/disallowed browser write Origin or browser-only access to an Agent-only route |
| 413 | PAYLOAD_TOO_LARGE | Login body exceeds 4 KiB |
| 415 | UNSUPPORTED_MEDIA_TYPE | Login body is not JSON |
| 429 | RATE_LIMITED | Login attempt allowance exhausted or verifier busy |
| 503 | SERVICE_UNAVAILABLE | Password verification or token issuance failed |

Never echo the password, token, hash, signing secret, framework exception text, or internal error details.

## Request boundary

Only the exact POST login/logout method and path pairs bypass prior authentication. Health endpoints remain public. On domain requests, an Authorization header selects Agent bearer authentication; an invalid bearer fails 401 without falling back to a cookie. Otherwise the middleware verifies the browser JWT. The status endpoint always requires a browser JWT. The middleware records the validated mode as `auth_mode`. `PATCH /api/v1/writing/submissions/:code/analysis` uses the shared `requireAgent` route middleware: Agent bearer authentication is required, and browser JWT authentication alone returns `403 FORBIDDEN`. Ordinary Writing saves, edits, and reads accept either mode.

Cookie-authenticated POST, PUT, PATCH, and DELETE requests require an allowed Origin. Login and logout require the same check even when unauthenticated. In development, the configured loopback host and its `localhost`/`127.0.0.1` alias are accepted on the same port; outside development, only the exact configured HTTPS origin is accepted. Missing, null, malformed, suffix-matching, and foreign origins fail. Safe GET, HEAD, and OPTIONS routes must not write data. SameSite=Lax, JSON-only login, and exact Origin checking protect the intended same-origin deployment against CSRF.

The existing process-wide login limiter admits at most 10 attempts in a fixed 60-second window and only one concurrent Argon2 verification. Attempts count before body validation. Excess requests receive 429 and Retry-After. The limiter resets on restart; it does not store JWTs.

## Code ownership

| Path | Responsibility |
| --- | --- |
| apps/api/src/core/config/env.ts | Validate server-side hash, origin, and signing secret |
| apps/api/src/core/auth/web-jwt.ts | Issue and verify the scoped, 24-hour JWT |
| apps/api/src/core/auth/auth-cookie.ts | Read, set, and clear the browser cookie |
| apps/api/src/core/auth/login-limiter.ts | Bound login attempts and password verification |
| apps/api/src/core/middleware/auth.ts | Choose Agent bearer or browser JWT and enforce access |
| apps/api/src/core/middleware/web-origin.ts | Validate browser write Origin |
| apps/api/src/modules/auth/ | Validate login, own auth rules, and adapt HTTP responses |
| apps/api/src/app.ts | Create one limiter per app and inject auth dependencies |

Auth has no repository, database migration, session store, or token revocation list. Domain modules keep their existing route-to-repository flow.

## Frontend integration

The frontend places /login outside AppShell, checks /api/v1/auth/status before mounting private routes, sends same-origin requests with browser cookies, and provides logout in the sidebar and mobile drawer. The browser never reads or persists the JWT. A status 401 goes to login; a network/server error shows a retry state. Domain 401 responses clear protected UI without retrying interrupted writes.

The frontend preserves only a validated internal return destination and checks existing dirty forms before deliberate logout. After logout 204, it clears private UI and navigates to /login. Other tabs clear their UI through a non-secret BroadcastChannel logout event where supported; they share the browser cookie. Logout does not revoke a copied JWT, so frontend copy does not claim server-side revocation.

The Vite proxy no longer injects the Agent bearer key. The [login screen specification](frontend-screens/auth.md) describes the UI. Production proxy verification remains before public deployment.

## Verification and open decisions

Relevant checks cover valid and invalid JWT signatures, scopes, 24-hour expiry, restart behavior, secret rotation, cookie settings, logout semantics, Origin enforcement, Agent bearer precedence, login limits, and safe error envelopes. Repository verification runs without an auth database.

The deployment host/provider and production proxy verification remain open. The login implementation follows the documented Hermes visual baseline.
