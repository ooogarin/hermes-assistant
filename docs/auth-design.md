# Personal Web Authentication Design

> Status: Technical design and backend implemented, 2026-10-01. Browser session middleware, login/session/logout endpoints, ENV validation, and login limits are available. Login visual selection, frontend integration, and removal of Vite bearer injection remain a separate stage; the frontend is not ready for public deployment yet.

## Purpose and scope

Hermes is a private, single-owner application whose web frontend may be publicly reachable. The owner signs in with one static password configured on the API server. There is no user entity, username, registration, role, permission matrix, or authentication database migration.

The public frontend shell may be downloaded by anyone. Every application data endpoint must enforce authentication on the API server, including reads. A frontend route guard improves navigation but is not the security boundary.

The existing Hermes Agent continues to use `INTERNAL_API_KEY`. Browser authentication uses a separate password and session cookie. Both credentials grant access to the existing application operations; this design introduces no RBAC or domain-specific permissions.

## Deployment assumptions

- Serve the built frontend and `/api` through one HTTPS origin, for example `https://hermes.example.com`. A reverse proxy can send `/api/*` to Bun while serving the frontend build separately.
- Run one API process/instance. Session state lives in that process. A restart or redeploy signs out all browser sessions; the Agent remains usable with its API key.
- The reverse proxy forwards cookies and `Set-Cookie`, preserves `Origin`, and does not inject an internal bearer key into browser requests.
- Production never serves the Vite development server. `/api/*` is forwarded to the API rather than falling back to SPA HTML, and API responses are not cached.

The implementation targets one HTTPS origin and one API process. The exact host/provider remains an open deployment decision. Cross-origin hosting or multiple API instances requires revisiting this design before deployment.

## Data and ENV

### Server configuration

| Variable | Meaning | Proposed validation/default |
| --- | --- | --- |
| `WEB_AUTH_PASSWORD_HASH` | Hash of the one static browser password | Required valid Argon2id PHC hash; never a frontend variable |
| `WEB_AUTH_ORIGIN` | Exact browser origin allowed to send writes | Required URL containing only scheme, host, and optional port; HTTPS in staging/production; reject credentials, paths, queries, and fragments |
| `WEB_AUTH_SESSION_TTL_SECONDS` | Absolute session lifetime | Integer from 300 through 604800; default 604800 (7 days) |
| `INTERNAL_API_KEY` | Existing Agent bearer credential | Existing validation remains; independent of the browser password |

Keep these values server-side. No auth secrets belong in `VITE_*`, the frontend bundle, browser storage, URLs, logs, or response JSON. The actual password never needs to be stored in ENV: the hash represents the static credential. Provision a unique random password/passphrase of at least 20 characters, up to the login field limit of 512 characters.

Use native `Bun.password.hash(password, { algorithm: 'argon2id' })` during credential provisioning and asynchronous `Bun.password.verify(password, hash)` during login. Generate/provision the password through a local prompt or secret manager, keeping it out of shell arguments/history and captured tool output. In Bun dotenv files, escape every literal `$` as `\$`, including inside quoted values; quoting alone does not disable variable substitution. A real process environment variable supplied through a secret manager uses the plain PHC hash without dotenv backslashes. Startup validates the hash using a fixed, non-empty verification probe and reports invalid configuration keys only. Supported Argon2id v19 parameters are 19456–65536 KiB memory, 2–4 iterations, and parallelism 1–4; Bun's default hash parameters fit these bounds. The bounds reject malformed/weak configuration and limit verification resource usage. Bun supplies these password APIs directly. [Bun password documentation](https://bun.sh/docs/runtime/hashing#bunpassword).

Dotenv structure only (replace the salt and digest with those from your generated hash):

```dotenv
WEB_AUTH_PASSWORD_HASH='\$argon2id\$v=19\$m=65536,t=2,p=1\$<salt>\$<digest>'
```

There is no runtime auth-off switch. API startup requires browser auth configuration in development too. Database-only migration configuration does not need web-auth variables. The existing FE development proxy still injects the Agent key until the frontend stage is implemented, so ordinary local FE domain requests currently use Agent authentication.

### In-memory session record

```ts
type WebSession = {
  issued_at: number;
  expires_at: number;
};

// Key: SHA-256 digest of the browser's random session token.
type WebSessionStore = Map<string, WebSession>;
```

- Create a fresh token with `randomBytes(32).toString('base64url')`: 256 bits of cryptographic randomness, encoded as 43 characters.
- The cookie carries that opaque token. The process stores only its SHA-256 digest and timestamps in milliseconds since the Unix epoch.
- A token has no user ID, role, password, API key, or JSON payload. It needs no JWT, signature secret, or encryption because the server only accepts tokens present in its store.
- Use a process-owned store shared by the middleware and auth service, created once per `createApp(...)` instance. Never create a new store for each request or a global singleton shared by independent test apps.
- Check expiration on every lookup. Delete expired records during lookup and before insertion. Cap the store at 32 sessions; when full, remove the oldest session before issuing a new one. This bounds memory without a scheduler or external cache.
- Login issues a fresh token and revokes the previous token presented by that browser. Multiple browsers can each hold one session.
- Logout deletes the matching record. A copied token then stops working on its next authenticated request. Requests already executing when logout occurs may finish.
- Restart/redeploy clears the store. Changing the password requires restarting the process, which also clears all sessions. Rotating `INTERNAL_API_KEY` does not change the browser credential.

### Cookie

| Attribute | Production value |
| --- | --- |
| Name | `__Host-hermes_session` |
| Value | Random opaque token |
| `HttpOnly` | `true` |
| `Secure` | `true` |
| `SameSite` | `Lax` |
| `Path` | `/` |
| `Domain` | Omitted; host-only |
| `Max-Age` | Session TTL |

`Lax` supports opening Hermes links from Telegram while the API still enforces write-origin checks. The server's expiration check is authoritative; browser `Max-Age` alone is insufficient. Use Hono's existing cookie helper to read, set, and delete cookies. The host-prefixed cookie requires HTTPS, path `/`, and no domain attribute. [Hono cookie helper](https://hono.dev/docs/helpers/cookie).

For local HTTP development only, use `hermes_session` with `Secure=false` and the same remaining attributes. Local `WEB_AUTH_ORIGIN` is the frontend origin, normally `http://127.0.0.1:5173`; HTTP is accepted only for `localhost`, `127.0.0.1`, or `[::1]` in development. HTTPS origins use the secure cookie in every environment. Cookie naming/security depends on the validated configured origin, never an untrusted request header. Deletion must use the same name and path and includes the appropriate secure flag, HttpOnly, and SameSite attributes.

## API contracts

All responses retain Hermes's `snake_case` success/error envelope. Set `Cache-Control: private, no-store` on all `/api/*` responses, including failures. Successful login returns session metadata, never a token; only `Set-Cookie` carries the credential.

| Method and path | Authentication | Result |
| --- | --- | --- |
| `POST /api/v1/auth/login` | No previous session; allowed Origin required | Verify password, create session, set cookie; `200` |
| `GET /api/v1/auth/session` | Valid browser session cookie only | `200` session metadata, otherwise `401` |
| `POST /api/v1/auth/logout` | Allowed Origin required; session may be absent/expired | Revoke presented session if any, clear cookie; `204` |

### Login

```http
POST /api/v1/auth/login
Content-Type: application/json
Origin: https://hermes.example.com
```

```json
{ "password": "<owner-entered-password>" }
```

Use `z.strictObject({ password: z.string().min(1).max(512) })`. Preserve the exact password: no trimming, lowercasing, or Unicode normalization. Enforce an actual streamed body limit of 4 KiB before parsing, even when `Content-Length` is missing. Require `application/json`, accepting its charset parameter.

Example success body for a login on 2026-10-01 at 12:00 UTC:

```json
{
  "success": true,
  "data": {
    "authenticated": true,
    "expires_at": "2026-10-08T12:00:00.000Z"
  }
}
```

`GET /api/v1/auth/session` returns the same data shape for the existing session and never renews its expiration. An internal bearer key cannot substitute for a browser session on this endpoint.

### Errors

| Status | Stable code | Meaning |
| --- | --- | --- |
| `400` | `VALIDATION_ERROR` | Malformed JSON or invalid body/header structure; details may name fields but never echo password values |
| `401` | `INVALID_CREDENTIALS` | Password did not match; safe message `Invalid credentials` |
| `401` | `UNAUTHENTICATED` | Missing, malformed, unknown, revoked, or expired session / invalid bearer credential |
| `403` | `FORBIDDEN` | Disallowed, missing, or `null` browser write Origin |
| `413` | `PAYLOAD_TOO_LARGE` | Login body exceeds its limit |
| `415` | `UNSUPPORTED_MEDIA_TYPE` | Login is not JSON |
| `429` | `RATE_LIMITED` | Login allowance exhausted or password verification already busy; include `Retry-After` |

Use the existing failure envelope with safe message, `details`, and `request_id`. Register explicit safe mappings for the new statuses rather than returning framework exception text. Do not return a password hint or a configured hash. Auth backend failure is a safe `500`/`503` and cannot fall back to granting access.

### Login throttling

For this single-owner, single-instance application, use one process-wide login limiter: at most 10 attempts in a fixed 60-second window. Count attempts before body/password validation and verification, including successful attempts; reserve each slot synchronously before awaiting work. Permit only one Argon2 verification at a time; other requests receive `429` and `Retry-After: 1`. Always release the verification slot in `finally`.

This is a small bounded counter rather than an IP database or Redis service. The window resets after a restart. A hostile caller can temporarily consume the login allowance, but cannot revoke existing sessions through the limiter. Provider/edge protection can add further limits when the deployment target is selected; client-supplied forwarding headers are unnecessary for this design.

## Middleware and request flow

```text
Browser → same-origin /api → request ID / safe logging / no-store
  ├─ exact POST auth/login → Origin + body/attempt limits → Zod → handler → service
  ├─ exact POST auth/logout → Origin → cookie validation → handler → service
  ├─ exact GET auth/session → browser session middleware → handler → service
  └─ domain API → bearer OR browser session middleware
       → browser-write Origin check when using a cookie
       → existing route → validator → handler → service → repository → PostgreSQL

Hermes Agent → domain API → existing bearer authentication → existing domain flow
```

The global authentication middleware exempts only the exact method/path pairs for login and logout. Do not exempt all `/auth/*` paths or all requests with an Origin header. Existing health endpoints remain public.

For domain requests, the credential selection rule is explicit:

1. If `Authorization` is present, validate its structure with Zod and require the existing valid internal bearer credential. An invalid header fails `401`; do not fall back to a cookie. The key grants the existing internal access.
2. Otherwise validate the cookie token with Zod (`^[A-Za-z0-9_-]{43}$`), digest it, look up the session, and require `expires_at > now`. Missing/invalid sessions fail `401`; malformed cookie parsing must not turn into a `500`.
3. For cookie-authenticated requests whose method is not `GET`, `HEAD`, or `OPTIONS`, require `Origin` to exactly equal configured `WEB_AUTH_ORIGIN`. Apply this same check to login and logout, including unauthenticated logout.
4. Never write data from a `GET` or other safe-method route. Unknown API paths retain the existing safe error boundary; browser API failures remain JSON, with no server redirect to the login HTML.

The Origin comparison includes scheme, host, and port. Reject missing, `null`, malformed, suffix-matching, and other origins. Read the configured public origin rather than reconstructing it from `Host` or forwarding headers. This strict Origin policy, JSON-only login, and `SameSite` cookie form the CSRF protection for the intended browser deployment. No CORS allowance is needed for one-origin hosting. SameSite alone is insufficient for general deployments. [OWASP CSRF guidance](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).

## Code organization

| File | Responsibility |
| --- | --- |
| `apps/api/src/core/config/env.ts` | Validate and expose server auth configuration; fail closed at startup |
| `apps/api/src/core/auth/session-store.ts` | Bounded in-memory create/find/revoke operations with injectable clock |
| `apps/api/src/core/auth/login-limiter.ts` | Bounded attempt counter and verification admission |
| `apps/api/src/core/middleware/auth.ts` | Bearer/session selection, exact public exemptions, session checks; reuse timing-safe bearer comparison |
| `apps/api/src/core/middleware/web-origin.ts` | Validate required browser write Origin |
| `apps/api/src/modules/auth/auth.validator.ts` | Login body and session response/input contracts using Zod |
| `apps/api/src/modules/auth/auth.handler.ts` | Read validated input, call service, set/delete cookie, emit API envelopes |
| `apps/api/src/modules/auth/auth.service.ts` | Verify password and own session issue/check/revoke rules |
| `apps/api/src/modules/auth/auth.route.ts` | Mount three endpoints with relevant middleware and validators |
| `apps/api/src/modules/auth/auth.types.ts` | Request, session, service, and dependency types; no user type |
| `apps/api/src/app.ts` / `index.ts` | Create/inject one store and limiter, pass validated config, mount auth routes |
| `.env.example` | Documents required auth settings with a rejected placeholder hash; no real credential values |

There is no auth repository or migration because this feature does not access PostgreSQL. Auth operations stop at the service and the in-memory infrastructure. Existing domain requests preserve their complete database-layer boundary.

### Reference primitives

This excerpt illustrates the intended service/store operations. It is design code, not the complete implementation: the surrounding flow must also apply limits, old-session revocation, configuration validation, and HTTP error mapping described above.

```ts
import { createHash, randomBytes } from 'node:crypto';
import { z } from 'zod';

const loginBodySchema = z.strictObject({
  password: z.string().min(1).max(512),
});
const tokenSchema = z.string().regex(/^[A-Za-z0-9_-]{43}$/);
const digestToken = (token: string): string =>
  createHash('sha256').update(token).digest('hex');

type Session = { issued_at: number; expires_at: number };

const issueSession = (
  sessions: Map<string, Session>,
  now: number,
  ttlSeconds: number,
): { token: string; session: Session } => {
  const token = randomBytes(32).toString('base64url');
  const session = { issued_at: now, expires_at: now + ttlSeconds * 1000 };
  sessions.set(digestToken(token), session);
  return { token, session };
};

const findSession = (
  sessions: Map<string, Session>,
  rawToken: unknown,
  now: number,
): Session | undefined => {
  const parsedToken = tokenSchema.safeParse(rawToken);
  if (!parsedToken.success) return undefined;

  const key = digestToken(parsedToken.data);
  const session = sessions.get(key);
  if (session === undefined) return undefined;
  if (session.expires_at <= now) {
    sessions.delete(key);
    return undefined;
  }
  return session;
};

const verifyPassword = async (rawBody: unknown, passwordHash: string): Promise<boolean> => {
  const { password } = loginBodySchema.parse(rawBody);
  return Bun.password.verify(password, passwordHash);
};
```

Cookie setting belongs to the handler, using `setCookie(context, cookieName, token, options)` from `hono/cookie`. Session-store functions never receive a Hono context. Keep the existing raw SQL and repository code untouched.

## Frontend integration

- Add public `/login` outside `AppShell`. Wrap all current application routes with a protected layout; mount the shell and feature queries only after a successful session check.
- Add a small `AuthProvider` using React context and existing hooks. Track `checking`, `authenticated`, `unauthenticated`, and `error`; this is UI state, not a user record or persistent token.
- Use relative `/api/v1/auth/*` requests through the existing API client with `credentials: 'same-origin'`. Validate response data with Zod. No JavaScript reads or stores the cookie.
- On startup/reload, call the session endpoint. On a session `401`, go to login; a network/`5xx` failure shows a retry state rather than pretending the session is absent.
- On protected-domain `401`, stop showing protected content, abort/ignore pending queries, reset in-memory feature state, and show login with a session-ended message. Concurrent failures cause one transition. Do not automatically retry write requests after a new login.
- Keep auth-endpoint errors local: a wrong password is an inline login error rather than another global redirect.
- Preserve only the desired internal pathname/query/hash as `return_to`, validated with Zod and URL parsing against the current origin. Accept known application destinations only; reject external/protocol-relative URLs, backslashes/control characters, `/login`, `/api`, and unknown routes. Validate again immediately before navigation. Never put a password, token, or form draft in the URL.
- After login, use the safe return destination; use `/finance` as the proposed fallback because Ringkasan is currently a placeholder. After explicit logout, return to `/login` without automatically re-entering the previous page.
- Add `Keluar` at the bottom of the sidebar and in the mobile drawer. Respect the existing unsaved-change prompt before an intentional logout. Clear protected UI after successful logout; if the request fails, show an error and allow retry rather than claiming the server session was revoked.
- Treat a cookie as unavailable when login succeeds but the follow-up session check fails. Show a safe cookie/browser-storage message and remain outside the protected shell.

Implementation files: `features/auth/auth-api.ts`, `features/auth/auth-context.tsx`, `features/auth/protected-layout.tsx`, `features/auth/login/page.tsx`, plus small changes in `app.tsx`, `app/routes.tsx`, `lib/api/api-client.ts`, `components/layout/app-shell.tsx`, and `vite.config.ts`.

The Vite proxy must stop adding `Authorization` for every browser request. Otherwise a protected API request would still pass via the Agent key even after browser logout. Keep forwarding `/api` for local development and preserve cookies, but pass no credential except what the browser sends. Production proxy configuration follows the same rule.

Detailed page behavior is in [Login screen specification](frontend-screens/auth.md).

## Implementation and verification

1. **Implemented:** ENV validation, bounded session store, and login limits with injected dependencies/clock; no new package or SQL migration.
2. **Implemented:** auth routes, safe cookie/error handling, centralized bearer/session authentication, and Origin checks. Existing Agent contracts remain supported.
3. **Pending frontend stage:** remove Vite bearer injection and implement auth API/context, protected layout, login, and logout together.
4. **Pending frontend/deployment stage:** verify the built frontend against the selected login mockup at desktop/mobile widths and exercise the deployed same-origin proxy before publishing it.

Meaningful automated coverage:

| Area | Required checks |
| --- | --- |
| Config | Missing/invalid hash, origin, and TTL fail without exposing values; production HTTP is rejected |
| Login | Correct/wrong password, exact whitespace preservation, invalid JSON/type/size, absent/disallowed Origin, limits, concurrent verification release |
| Sessions | Cookie attributes, random issuance, expiry at boundary, malformed/unknown tokens, old-token revocation, logout replay rejection, cap eviction, process restart |
| Access boundary | Anonymous domain reads and writes return `401`; cookie permits existing operations; bearer still works for Agent; bad bearer cannot fall back; auth/session requires a browser session |
| CSRF | Cookie writes with absent/foreign/`null` Origin fail; allowed Origin succeeds; suffix origins fail; internal bearer writes keep working without Origin |
| FE | Session bootstrap, direct-link return, safe redirect validation, no protected-query mount before check, wrong-password feedback, network retry, one transition on concurrent `401`, logout failure, disabled duplicate submit |
| Deployment | Vite/production proxy forwards cookie without key injection, `/api` never returns SPA HTML, unauthenticated data access fails, API errors remain uncached, bundle contains no secrets |

Run repository `bun run verify` for the backend stage and the frontend production build when integrating the frontend. Auth route/store tests run without PostgreSQL using injected dependencies. Native Argon2 verification is covered both in Hono request tests and a listening Bun server test that exercises login, protected access, logout, and rejected replay. Existing domain API tests now supply a test browser-auth configuration while continuing to exercise bearer authentication.

## Decisions to confirm

The static credential, absence of user/RBAC, and middleware-based API protection come directly from the owner's request. Backend implementation uses the current design defaults: same-origin deployment, one API instance with logout on restart, and a configurable seven-day absolute session lifetime. It uses opaque server-held sessions rather than JWT so logout immediately revokes the presented token.

The exact deployment host/provider remains open. The login visual is awaiting selection from the three generated concepts, and `/finance` remains the proposed post-login fallback for the frontend stage. The owner authorized design and backend implementation only; frontend routing, login/logout UI, and removal of Vite bearer injection are deferred together. No frontend or production deployment is included in these two stages.
