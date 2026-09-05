# Hermes Postman Request Style

Use these rules to preserve the Guestpedia-inspired Postman style while representing the Hermes API contract accurately.

## Request names and ordering

- Use short, action-first Title Case names: `Get All`, `Get One`, `Create`, `Update`, `Delete`, or a specific command such as `Evaluate` or `Submit Answer`.
- Use one request per method and path. Separate resource folders when short names would otherwise collide.
- Order CRUD requests as `Get All`, `Get One`, `Create`, `Update`, `Delete`, followed by named actions in route order.
- Map `PATCH` to the display name `Update`; do not change it to `PUT`.

## URLs and parameters

- Use `{{DOMAIN}}` as the host and keep the complete Hermes route, for example `{{DOMAIN}}/api/v1/notes/:code`.
- Preserve every path parameter name from the Hono route. Do not rename `:code`, `:date`, `:dailyNumber`, or another meaningful parameter to `:id`.
- Give path variables realistic sample values in Postman's path-variable data, not as literal replacements in the URL.
- Include supported query parameters with editable realistic values. Required parameters come first. When supported, order pagination controls as `page` then `limit`; do not add either parameter if its Zod validator does not define it.
- Represent each query parameter once. When the Postman tool accepts both a URL and a `queryParams` field, follow its schema so parameters are not duplicated.
- Do not invent filters, sorting, pagination, or defaults that are absent from the route validator.

Examples:

```text
{{DOMAIN}}/api/v1/notes?q=advisory&tag=postgres&category=Tech%2FProgramming&limit=20
{{DOMAIN}}/api/v1/finance/transactions/:date/:dailyNumber
```

Suggested path-variable values for the second example are `2026-09-05` and `1`.

## Authentication and headers

- Hermes application endpoints use inherited Bearer authentication with `{{internal_api_key}}`.
- Do not add a request-level `Authorization` header when the collection or parent folder demonstrably supplies that auth. If inherited auth is absent, stop and report the required collection setup rather than silently creating requests that cannot authenticate.
- Public health endpoints carry no auth when the user explicitly asks to include them.
- Raw JSON bodies use `Content-Type: application/json` when Postman does not add it automatically.
- Never place real API keys, credentials, or user data in the collection.

## JSON bodies

- Use Postman raw JSON mode and set the language to JSON.
- Use Hermes `camelCase` field names exactly as defined by the Zod schema.
- Use realistic but unmistakably sample values. IDs and codes must match the validated shape.
- Use one or two items in arrays and nested collections.
- Include useful optional fields or omit them. Use explicit `null` only when the endpoint accepts it and the example intentionally demonstrates clearing a nullable value.
- Do not put Postman variables such as `{{...}}` in JSON bodies.
- Never copy credentials, production payloads, or sensitive values from logs or local environment files.

## Descriptions

Use a concise verb-object sentence such as:

- `List notes using optional search filters.`
- `Get a note by code.`
- `Create a note.`
- `Update a note by code.`
- `Delete a note by code.`

Do not include setup instructions such as “Set the variable first” in the description.

## Golden examples

Use these only when no suitable Hermes request exists in the target or sibling folder. The current backend route and validators always take precedence.

### Get All

```json
{
  "name": "Get All",
  "method": "GET",
  "url": "{{DOMAIN}}/api/v1/notes?q=advisory&tag=postgres&category=Tech%2FProgramming&limit=20",
  "description": "List notes using optional search filters."
}
```

### Get One

```json
{
  "name": "Get One",
  "method": "GET",
  "url": "{{DOMAIN}}/api/v1/notes/:code",
  "pathVariables": {
    "code": "NT-20260905-001"
  },
  "description": "Get a note by code."
}
```

### Create

```json
{
  "name": "Create",
  "method": "POST",
  "url": "{{DOMAIN}}/api/v1/notes",
  "body": {
    "title": "PostgreSQL advisory locks",
    "content": "Advisory locks can serialize scoped number allocation.",
    "type": "fact",
    "category": "Tech/Programming",
    "source": "PostgreSQL documentation",
    "sourceContext": "Concurrency control",
    "sourceReference": "Chapter 13",
    "tags": ["postgres", "concurrency"]
  },
  "description": "Create a note."
}
```

### Update

```json
{
  "name": "Update",
  "method": "PATCH",
  "url": "{{DOMAIN}}/api/v1/notes/:code",
  "pathVariables": {
    "code": "NT-20260905-001"
  },
  "body": {
    "title": "PostgreSQL advisory lock patterns",
    "tags": ["postgres", "concurrency"]
  },
  "description": "Update a note by code."
}
```

### Delete

```json
{
  "name": "Delete",
  "method": "DELETE",
  "url": "{{DOMAIN}}/api/v1/notes/:code",
  "pathVariables": {
    "code": "NT-20260905-001"
  },
  "description": "Delete a note by code."
}
```

## Pre-mutation checklist

- The method and composed path match `src/app.ts` plus the module route.
- Body, query, and path fields match the applied Zod validators.
- JSON uses `camelCase` and realistic sample literals.
- URL uses `{{DOMAIN}}`; dynamic segments retain their original names.
- No unsupported pagination or filters were added.
- Authentication is inherited and no real secret is present.
- The lookup used folder, method, and normalized path rather than display name alone.
- The request matches the closest reference's presentation where that does not conflict with the backend contract.
