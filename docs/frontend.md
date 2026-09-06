# Hermes Report Frontend

## Scope

`apps/web` is a React and Tailwind CSS application for read-oriented Hermes reports. The first feature is the Finance report, using the existing Finance summary API. The frontend does not own durable data, financial calculations, or category aggregation; those remain in the API and PostgreSQL.

The initial implementation deliberately uses React's built-in `useState` and `useEffect`, plus focused custom hooks such as `useFinanceReport`. It does not use a state-management library, UI kit, or chart library. Reusable UI is implemented as small Tailwind components in `src/components`.

## Structure

```text
apps/web/src/
├── components/              # Card, Button, filter controls, and other small shared UI
├── features/
│   └── finance/             # Finance report view, types, and useFinanceReport hook
├── lib/                     # fetch wrapper, response types, currency/date formatting
├── app.tsx                  # application composition
├── main.tsx                 # React entry point
└── styles.css               # Tailwind entry point and global base styles
```

The Finance report's first screen is read-only and defaults to the current month. It will show expense, income, net balance, and category breakdown returned by:

```text
GET /api/v1/finance/summary?from=YYYY-MM-DD&to=YYYY-MM-DD&mode=net
```

## Local development and API key safety

Start the API and frontend in separate terminals:

```sh
bun run dev:api
bun run dev:web
```

`apps/web/vite.config.ts` loads `.env` from the workspace root. It forwards relative `/api` requests to `API_PROXY_TARGET` (default `http://127.0.0.1:3000`) and adds the internal bearer credential only in the Vite server process.

`INTERNAL_API_KEY` is an internal service credential, not a browser credential. Never prefix it with `VITE_`, interpolate it into frontend source, place it in local storage, or send it from browser code. This proxy is for local development only. A deployed frontend needs an explicit user authentication or backend-for-frontend design before it can safely access protected API routes.

Shared navigation, screen, state, and accessibility conventions are defined in [frontend-screens.md](frontend-screens.md). Module-specific screen specifications will be added only after the related API data is available.
