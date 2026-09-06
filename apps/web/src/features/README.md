# Frontend feature boundaries

Create one folder per implemented product feature. A feature owns its route-level views, request hooks, transport schemas, and response-to-view-model mapping. Group route-level views by use case when a feature has multiple pages, for example `finance/daily/page.tsx` and `finance/report/page.tsx`.

Place visual components that belong to one feature under `src/components/<feature>/`. Keep cross-feature UI primitives in their existing shared groups such as `src/components/ui/`, `src/components/layout/`, or `src/components/feedback/`. Promote helpers to `src/lib` only after multiple features require the same behavior. Do not add browser-only domain calculations, mock persistence, or API capabilities that the backend contract does not provide.
