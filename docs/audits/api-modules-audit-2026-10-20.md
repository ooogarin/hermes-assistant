# API Modules Audit

Date: 2026-10-20. Scope: `apps/api/src/modules/**` (7 modules, 12 sub-modules),
`apps/api/src/shared/**`, and `apps/api/src/core/**`. The rules come from
[architecture.md](../architecture.md) and
[coding-conventions.md](../coding-conventions.md).

Method: every source file under `apps/api/src` was read, the import graph was
built to find unused exports, and `bun test tests/module-contract.test.ts` was
run (4 pass). The twelve transaction blocks were checked by hand, because the
enforced harness only checks one direction of the transaction rule.

## Summary

| Rule | Status |
| --- | --- |
| Layer boundary, route → validator → handler → service → repository | Pass, with deviations |
| Only repositories and `core/database` reach PostgreSQL | Pass |
| No SQL in handlers or services | Pass |
| Repository naming | Pass, 68 of 68 methods conform |
| `trx` parameter rules | Pass, 34 pool-only, 28 transaction-only, 6 mixed |
| One result responsibility per repository method | Pass |
| Bulk writes use `jsonb_to_recordset` | Pass, no `UNNEST` anywhere |
| Request schemas reject unknown fields | Pass |
| `snake_case` across the boundary | Pass |
| Typed application errors | Pass, with one raw error in a service |
| The Notes module is the reference | Partial, nine deviations |

The enforced rules hold. The debt is structural drift from the Notes
reference, and duplication between Notes and Junk and between the three
settings sub-modules.

## Breaking the contract

### B-1. `core` imports a module service

`apps/api/src/core/middleware/auth.ts:3`

```ts
import { requireWebJwt } from '../../modules/auth/auth.service';
```

`core` is the lowest layer. [auth-design.md](../auth-design.md) puts JWT
verification in `core/auth/web-jwt.ts`, so the middleware can call it directly
and keep `core` free of module imports. The same requirement is currently
served twice: `core/middleware/auth.ts:68` and `modules/auth/auth.handler.ts:23`
both call the module service.

### B-2. Four modules do not compose an explicit request contract

[architecture.md](../architecture.md) requires a handler to compose an explicit
`*Request` contract from its validated input and the request scope. Notes,
Junk, and Finance comply. These forward bare values instead:

- `modules/reading/reading.handler.ts:33, 42, 50, 59`
- `modules/grammar/grammar.handler.ts:34, 42, 51, 59, 68, 76`
- `modules/writing/writing-material/writing-material.handler.ts:27`
- `modules/writing/writing-submission/writing-submission.handler.ts:25, 33, 50, 59`

The matching service methods take a bare `code: string`. The seven
`*Params` types that already exist (`NoteCodeParams`, `JunkCodeParams`,
`ReadingMaterialParams`, `GrammarSessionParams`, `TransactionReferenceParams`,
`WritingMaterialParams`, `WritingSubmissionParams`) are declared in every
module and used nowhere, so they are the natural home for these contracts.

## Drifted from the Notes reference

### R-1. The collection wrapper is composed in different layers

Notes, Junk, and Finance build `{ items }` in the handler. Reading, Grammar, and
Writing build it in the service.

### R-2. Reading returns raw database rows

`apps/api/src/modules/reading/reading.service.ts:115`

```ts
return { items: rows.map((row) => ({ ...row, created_at: toIsoTimestamp(row.created_at) })) };
```

[architecture.md](../architecture.md) says the application must not leak
database rows. Grammar, Finance, and Writing have an explicit row-to-domain
mapper; Reading spreads the row.

### R-3. A service interface omits an operation that is called

`apps/api/src/modules/writing/writing-material/writing-material.types.ts:45-49`
declares `createMaterial`, `listMaterials`, and `getMaterial`. The
`writing-submission` service imports and calls `getMaterialReference`
(`writing-submission.service.ts:8, 33`), which the interface does not declare.

### R-4. Two comments describe the opposite of their code

`apps/api/src/modules/notes/notes.repository.ts:160-162` and
`apps/api/src/modules/junk/junk.repository.ts:148-150`

```ts
// A repository method that later needs an explicit transaction takes a required
// `trx: DatabaseReservedConnection` as its final parameter and runs through it directly.
export const updateOneByCode = async (code: string, input: UpdateNotePayload) => {
```

`updateOneByCode` takes no `trx` and uses the pool.

### R-5. Two settings services miss the helper banner

The `// ==========[ Helper functions ] ==========` banner is present in the other
six services and missing in `reading-setting/reading-setting.service.ts:43` and
`writing-setting/writing-setting.service.ts:43`.

### R-6. The two word-count settings services are the same code

`reading-setting.service.ts:11-41` and `writing-setting.service.ts:11-41` are
94 percent identical, down to the error factory, and both re-implement the
timestamp mapping that `shared/date/date.ts:26` already provides.

### R-7. The Grammar settings service has no validation

`grammar-setting.service.ts:16-25` validates nothing, while the two
word-count siblings validate their range. The Grammar feature has no such
range, so this is asymmetry rather than a defect.

### R-8. The pagination meta builder is written twice

`writing-material.service.ts:166-170` and `writing-submission.service.ts:239-243`
are identical, and `WritingPaginationMeta` is declared in both type files.

### R-9. One sub-module reaches into the validator of its sibling

`modules/writing/writing-submission/writing-submission.validator.ts:3, 6`

```ts
import { materialCodeSchema } from '../writing-material/writing-material.validator';
const materialCode = materialCodeSchema.shape.code;
```

## Cleanup

- `reading/reading.service.ts:88` throws a raw `Error`. It is the only raw
  error in a service file, and it reports an invariant violation inside the
  transaction, so a 500 is right. The message never reaches the client.
- Twenty-four raw `throw new Error` calls sit in repositories. They all report
  that a query returned no row, which is also a 500, and none of them reach the
  client.
- `finance/finance.service.ts:35` falls back to `category_id: 0` for a missing
  category. The value is unreachable because the category service throws
  first, but an insert with `category_id = 0` would be worse than a failure.
- `finance/finance.service.ts:188-190` reimplements a date formatter that
  belongs beside `toIsoTimestamp` in `shared/date`.
- The `meta` channel of the shared response envelope
  (`shared/response/api-response.ts:20`, `core/http/response.ts:21-31`) is never
  used. Writing nests its pagination inside `data` instead, which
  `docs/feature-docs/writing-submission-contract.md` pins and the frontend
  consumes. The two placements disagree; the boundary capability is unused.
- `core/middleware/error-handler.ts:104-111` logs the raw database error
  message. The client path is safe; the log path can carry the failing value.
- `/api/v1/junk` is not a plural resource path, unlike the other modules.
- The path-parameter schemas of Reading and Grammar are the only object schemas
  that are not strict. The rule exempts path parameters, so this is compliant,
  but every other module writes them strictly.

## Duplication

Notes and Junk are the same module twice. Measured as the share of lines that
appear verbatim after normalizing the module nouns:

| File pair | Identical |
| --- | --- |
| `notes.repository.ts` ↔ `junk.repository.ts` | 80% |
| `notes.handler.ts` ↔ `junk.handler.ts` | 75% |
| `notes.validator.ts` ↔ `junk.validator.ts` | 68% |
| `notes.service.ts` ↔ `junk.service.ts` | 65% |
| `notes.types.ts` ↔ `junk.types.ts` | 63% |
| `notes.route.ts` ↔ `junk.route.ts` | 58% |

The three settings sub-modules are closer still: the handler and the route of
every pair are identical, and the two word-count services are 94 percent
identical.

The same repository operation is written again in each module:
`getLastSequenceByDateForUpdate` in six, `getOneByCode` in six, `getAll` in
six, `insert` in six, `softDeleteOneByCode` in three. The transaction scaffold
appears twelve times.

Two repositories also repeat their own SQL: `writing-material.repository.ts`
writes the `material_summary` CTE twice, and `writing-submission.repository.ts`
writes its whole `WHERE` predicate twice.

## Dead code

No dead files. Fourteen exported symbols are imported by nothing: `DatabaseExecutor`,
`Environment`, and `AppErrorOptions` are unused outright, and eleven more are
exported but only used inside their own file, including the seven `*Params`
types mentioned above.

## Largest files

| Lines | File |
| --- | --- |
| 542 | `modules/grammar/grammar.service.ts` |
| 392 | `modules/finance/finance.repository.ts` |
| 361 | `modules/grammar/grammar.repository.ts` |
| 299 | `modules/reading/reading.repository.ts` |
| 297 | `modules/writing/writing-submission/writing-submission.repository.ts` |
| 260 | `modules/reading/reading.service.ts` |
| 251 | `modules/writing/writing-submission/writing-submission.service.ts` |
| 242 | `core/database/migration-runner.ts` |
| 241 | `modules/writing/writing-material/writing-material.repository.ts` |
| 220 | `modules/notes/notes.repository.ts` |

`grammar.service.ts` is the outlier: eight exported operations, fourteen helper
mappers, and nine error factories in one file, about 2.5 times the Notes
reference service at 143 lines.

## The harness has a gap

`apps/api/tests/module-contract.test.ts:108-145` only checks methods that
declare an optional `trx`. It does not check the opposite: a method without
`trx` that is called from inside a transaction would silently run outside it.
All twelve transaction blocks were checked by hand and are correct today, so
the gap has not caused a defect yet.

## Recommended order

1. B-1, so `core` does not depend on a module.
2. B-2, using the `*Params` types that already exist and are unused.
3. R-2 and R-3, the two places where a contract or an interface is missing.
4. R-4, R-5, and the cleanup list, which are small and safe.
5. The dead exports, once the `*Params` types have either become the request
   contracts or been removed.
6. The duplicate settings sub-modules, and then Notes against Junk. The two
   are close enough that a shared implementation is worth considering, but the
   divergence between them is a product decision, not a technical one.
7. Extend the enforced harness with the inverse transaction check.
