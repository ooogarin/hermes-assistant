# Hermes API Conventions

- Mount application routes below `/api/v1` and use plural, lowercase resource paths.
- `GET` reads, `POST` creates or performs an explicit command, `PATCH` partially updates, and `DELETE` removes.
- Validate every body, query, path parameter, and relevant header with Zod.
- Request bodies, query parameters, and path parameters use `snake_case`. Response JSON also uses `snake_case` recursively, including nested objects, collection metadata, and error fields. Use ISO 8601 date/timestamps and UUID strings for public identifiers unless a feature design explicitly says otherwise.
- Authenticate application endpoints with the Agent's `Authorization: Bearer <INTERNAL_API_KEY>` or a valid browser JWT cookie. Exact login/logout method/path exemptions and required browser Origin checks are defined in [auth-design.md](auth-design.md). `GET /api/v1/auth/status` requires a browser cookie; an Agent key alone does not satisfy it. `GET /health` and `GET /health/ready` are explicitly public.
- Every `/api/*` response, including errors, uses `Cache-Control: private, no-store`.

## Response envelope

```json
{
  "success": true,
  "data": {
    "code": "NT-20260906-001",
    "created_at": "2026-09-06T10:00:00.000Z"
  }
}
```

Collections may add `meta`, for example `{ "page": 1, "limit": 20, "total": 0 }`.

```json
{
  "success": false,
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "Resource not found",
    "details": null
  },
  "request_id": "req_123"
}
```

`data` appears only on success. Error codes use stable `SCREAMING_SNAKE_CASE`; messages are safe for callers. Do not return SQL, stack traces, secrets, or dependency internals.

Framework HTTP exceptions use the same envelope and a safe server-defined message; their raw message and response body are never forwarded.

## Status codes

| Condition | Status |
| --- | ---: |
| Read/update succeeded | 200 |
| Created | 201 |
| No response body | 204 |
| Invalid request | 400 |
| Unauthenticated / unauthorized | 401 / 403 |
| Not found / conflict | 404 / 409 |
| Request too large / unsupported media type | 413 / 415 |
| Rate limited | 429 |
| Unexpected / unavailable dependency | 500 / 503 |

Paginate only when a collection needs it. Validate limits and allow-list filter/sort fields before they reach SQL.
