---
name: postman-request
description: Create or update Hermes Postman collection requests for backend endpoints when the user explicitly asks to add, sync, or refresh Postman requests. Do not use for backend implementation alone or for non-Postman API documentation.
---

# Hermes Postman Requests

Create or update Postman requests for Hermes endpoints while preserving the established Postman presentation style and the backend's actual HTTP contract.

## Authority and scope

- Handle application endpoints mounted below `/api/v1` in `src/app.ts`.
- Skip `/health`, `/health/ready`, test-only routes, webhooks, cron entrypoints, and unrelated routes unless the user explicitly includes them.
- Treat the composed Hono route, its Zod validators, `docs/api-conventions.md`, and the matching feature document as the contract source of truth.
- Use an existing request only as a presentation template. Never let an older Postman request override the current method, path, parameter names, accepted fields, or validation rules.
- Do not use Guestpedia workspace IDs, collection IDs, folders, domains, tokens, or `/v2` routing assumptions.

Read [references/request-style.md](references/request-style.md) before constructing or modifying requests.

## Preflight

1. Derive the endpoint set from the current task or the user-specified diff. Compose each full path from the mount in `src/app.ts` and its module-relative route. Record method, full path, module, validator, request body, query parameters, and path parameters exactly once.
2. Confirm that Postman collection read and request create/update tools are available. If they are unavailable, report the missing capability and stop without fabricating a successful sync.
3. Resolve the target from a workspace or collection the user named. Otherwise, search accessible Postman collections for one clearly belonging to Hermes and use it only when the match is unique. If none or more than one match, ask the user for the collection; never guess.
4. Fetch a minimal collection model first and locate the destination folder. Prefer the collection's established structure. For a new collection, use `V1 - API` › `<Module>` and add a resource subfolder when a module contains multiple resource families.
5. Fetch one full reference request from the destination folder, or the closest sibling folder when it is empty. Match its header order, query presentation, description tone, raw-body formatting, and indentation where those choices do not conflict with the Hermes contract.

If the initiating request explicitly says to add, update, refresh, or sync Postman, it authorizes the matching request mutations. Otherwise, present the planned changes and obtain authorization before the first external mutation.

## Folder selection

Map `/api/v1/<module>/...` to `V1 - API` › `<Module in Title Case>` unless the collection already has an unambiguous equivalent folder.

When a module has multiple independently named resources, keep action-first request names by using resource subfolders. For example:

```text
V1 - API
└── Finance
    ├── Transactions
    ├── Categories
    └── Summary
```

Do not create or reorganize folders unless the available Postman tool supports that operation and the user's request authorizes it. If the required folder does not exist and cannot be created safely, ask the user to create or identify it.

## Build and upsert

For each endpoint:

1. Build the request according to [references/request-style.md](references/request-style.md).
2. Identify an existing request by destination folder, HTTP method, and normalized full path. A matching display name alone is not sufficient.
3. Update an exact match instead of creating a duplicate. Preserve its UID and unrelated scripts or examples unless the user asked to replace them.
4. Otherwise create a request with its resolved folder, name, method, URL, query parameters, raw JSON body when applicable, and description. Follow the schema exposed by the available Postman tool rather than assuming an unsupported argument shape.
5. If one independent request fails, continue with the remaining endpoints and retain the exact failure for the final report. Do not convert a failed update into delete-and-recreate without explicit authorization.

When several requests for one resource are created together, use this order:

```text
Get All → Get One → Create → Update → Delete → other named actions in route order
```

Reorder only the affected folder and only when the tool can preserve every unrelated item. Otherwise report the intended order for manual adjustment.

## Verify and report

Re-fetch the affected folder after mutation and verify each request's folder, method, normalized path, query parameters, body mode, and name. Verification by name alone is insufficient.

Report:

- created requests;
- updated requests;
- unchanged requests;
- skipped routes and the reason;
- failures or manual folder/order work still required.

Do not claim completion for any request that was not visible in the verification fetch.
