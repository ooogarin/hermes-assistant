# Personal Login Screen

> Status: Frontend design, 2026-10-01. The backend JWT API contracts in [Personal Web Authentication Design](../auth-design.md) are implemented. Frontend login and protected routing are not implemented yet. Three image concepts have been presented in the design conversation; the selected visual is still open.

## Scope and screen map

The owner enters one static password to open Hermes. There is no username, email, user profile, registration, forgot-password link, role, or account management. Credential changes happen through server configuration.

| ID | Surface | Route | Purpose |
| --- | --- | --- | --- |
| SCR-AUTH-001 | Login | `/login` | Enter password and sign in |
| SCR-AUTH-002 | Auth status / retry | Protected route before shell mounts | Resolve whether private content may load |
| SCR-AUTH-003 | Logout action | Sidebar footer / mobile drawer | Clear the JWT cookie and return to login |

`/login` sits outside `AppShell`. It has no sidebar, private-content preview, collection, or dashboard. A signed-in owner opening `/login` goes to the validated return destination or `/finance`. An unknown frontend route does not become an accepted post-login redirect.

## Visual baseline

Follow the existing [Frontend Screen Guide](../frontend-screens.md), tokens, `Field`/`Input`, `Button`, and functional Lucide icons:

| Token / element | Treatment |
| --- | --- |
| Page | Warm off-white `#fbfaf7` |
| Main text | Slate `#132238` |
| Supporting copy | `#657083` |
| Primary action | Emerald `#087a55`, hover `#056443` |
| Input surface/border | `#fffefd` / `#c8cbc4` |
| Error | `#b42318`; optional subtle `#fef3f2` surface |
| Type | Existing Inter/system sans; body 14–16px |
| Controls | 8px radius; at least 44px height/touch target; proposed login height 48px |
| Layout | Generous whitespace, form width 360–400px, minimal rules, no decorative illustration or nested cards |

The three concepts vary grouping and heading placement within this baseline. They do not change auth fields or behavior. Exact headline copy/layout is selected with the visual; tokens and this behavior specification remain authoritative if generated pixels introduce a gradient or inaccurate dimensions.

## SCR-AUTH-001 — Login

### Content and hierarchy

1. `Hermes` text wordmark.
2. Short welcome heading, for example `Selamat datang kembali`, and one sentence such as `Masuk ke ruang personalmu.`
3. Visible `Kata sandi` label and a single password input.
4. Full-width primary `Masuk` button.
5. Quiet supporting line `Hanya untuk penggunaan pribadi.`

The password starts empty and masked. A functional `Eye`/`EyeOff` button toggles masking with accessible labels `Tampilkan kata sandi` / `Sembunyikan kata sandi`. Set `type="button"` so this control never submits the form. Keep its hit target at least 44px.

Use `autocomplete="current-password"`, `name="password"`, `maxLength={512}`, spellcheck off, and capitalization off. Support paste/password managers. Do not trim the entered value. Client validation requires a non-empty value and the same maximum length as the API; it does not impose a different password-strength policy at login.

### Interactions

- Enter submits the form. Empty input displays `Masukkan kata sandi.` and focuses the field; a non-empty whitespace value is sent exactly as entered.
- Disable duplicate submissions while pending and display `Memeriksa…` through the shared button pending state. Keep entered data visible while waiting.
- Submit only to the same-origin login endpoint. On success, confirm the cookie through the status endpoint, clear the password state, and navigate with history replacement to the safe return destination or `/finance`.
- A credential mismatch clears the field, announces the error, and focuses the password input for retry. A recoverable network/service error preserves the input for retry within the mounted page.
- Clear login password state on unmount. Never persist it, record it in analytics, or include it in a navigation notice.
- Show API-safe errors in Indonesian. Users do not need to see environment keys, SQL, token formats, stack traces, or other implementation details.

### States and copy

| State | Display and behavior |
| --- | --- |
| Initial | Empty password field; `Masuk` button |
| Local validation | `Masukkan kata sandi.` linked to the field |
| Submitting | `Memeriksa…`; prevent duplicate submit |
| Wrong password (`401 INVALID_CREDENTIALS`) | `Kata sandi tidak sesuai. Coba lagi.` below field |
| Rate limited (`429`) | `Terlalu banyak percobaan. Coba lagi dalam {N} detik.`; use server `Retry-After`, announce once, re-enable after wait |
| Network error | `Layanan belum dapat dihubungi. Periksa koneksi lalu coba lagi.` |
| Service error (`5xx`) | `Belum bisa masuk. Coba lagi sebentar.` |
| Origin/config error (`403`) | `Permintaan masuk tidak dapat diproses dari alamat ini.`; avoid an automatic retry loop |
| Cookie unavailable | `Sesi belum tersimpan. Pastikan cookie diizinkan, lalu coba masuk lagi.` |
| Session ended | Notice above form: `Sesi berakhir. Masuk lagi untuk melanjutkan.` |
| Logout completed | Optional notice `Kamu sudah keluar.`; keep form usable |

## SCR-AUTH-002 — Auth status check

Check `/api/v1/auth/status` before mounting `AppShell` or feature queries. Show a small, stable layout with `Memeriksa akses…`, without rendering private data or a dashboard skeleton that exposes prior content.

- Valid JWT: mount the requested application page.
- `401`: navigate to login with a validated internal return destination.
- Network/`5xx`: show `Sesi belum dapat diperiksa.` and a `Coba lagi` button; do not label the owner signed out or repeatedly redirect.
- A protected data request later returns `401`: unmount/clear the private UI, ignore outstanding responses, and show login once. Do not automatically resubmit an interrupted create/edit/delete request after login.
- When a JWT expires during editing, unsaved in-memory input may be lost. Preserve only the destination, not form drafts in URLs or browser storage. This is a proposed MVP limitation, not an automatic draft-recovery feature.

## SCR-AUTH-003 — Logout

Place a `Keluar` action with the Lucide `LogOut` icon at the bottom of the expanded sidebar and mobile drawer. The collapsed icon rail uses an accessible label and tooltip. It is reachable from every protected page and does not imply a user profile/menu.

- Apply the existing unsaved-change prompt before deliberate logout when needed; no extra confirmation for ordinary logout.
- Send `POST /api/v1/auth/logout`, disable the action while pending, then clear protected state and replace the route with `/login` after `204`.
- If logout fails, display `Belum bisa keluar. Coba lagi.` and allow retry. Do not announce successful logout until the server has cleared the cookie.
- Other tabs check auth status on focus or receive a non-secret logout event and clear their content. A `BroadcastChannel` event may say `logout` but carries no credential or private data. Logout clears the shared browser cookie; a copied JWT remains valid until expiry.

## Responsive and accessible behavior

- Desktop: use the selected concept at approximately 1440px and 1024px widths; preserve a compact form with generous surrounding space.
- Mobile: one column, 24px horizontal padding, full available form width, no horizontal overflow. If the selected desktop design has two columns, hide/reduce secondary introductory text and keep the form primary.
- Use `min-height: 100dvh` with scrollable content so a soft keyboard cannot hide the field/error/button. Mobile password text is at least 16px.
- Keep the real label visible; placeholder text is not a label. Use semantic `<main>`, heading, and `<form>`.
- Link field errors with `aria-describedby` and `aria-invalid`. Announce failures through a controlled `role="alert"`; announce checking/success through a polite status region.
- Keep keyboard order predictable: input → masking toggle → submit. Visible focus follows existing emerald token treatment. Respect reduced-motion preferences and avoid decorative animation.
- Session notices never show a private record title, query result, or other fetched content.

## Definition of done for implementation

Login, reload, expired JWT, direct link, logout, and retry work through the real API with cookie authentication. Anonymous reads/writes remain blocked even when the route guard is bypassed. The Vite and production proxies inject no bearer key. Selected desktop/mobile visuals follow the Hermes tokens, and keyboard/password-manager flows work. No browser credential is stored outside the HttpOnly cookie.
