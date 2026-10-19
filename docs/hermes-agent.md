# Hermes Agent Integration

Hermes Agent is the active assistant runtime. This repository owns the passive REST
API, PostgreSQL persistence, installable API-backed skills, and non-persistent
conversation skills.

```text
API-backed Telegram topic
  -> Hermes gateway
  -> hermes-personal-assistant skill
  -> authenticated curl request
  -> REST API
  -> PostgreSQL
  -> Hermes response

General / Speaking / Listening topic
  -> Hermes gateway
  -> non-persistent Q&A skill
  -> Hermes response
```

The runtime skill sources are located under `hermes/skills`. They are intentionally
separate from `.agents/skills`, which contains code-writing instructions for repository
agents.

| Skill | Telegram topic | Persistence |
| --- | --- | --- |
| `hermes-personal-assistant` | Finance, Notes, Junk, General English, Grammar, Reading, Writing | REST API + PostgreSQL |
| `hermes-general-qna` | General | No project/API record |
| `hermes-speaking-qna` | Speaking | No project/API record |
| `hermes-listening-qna` | Listening | No project/API record |

`Service Info` is intentionally not a conversational skill topic. Reserve it for bot
status or cron delivery.

`docs-vps.md` and the feature-design documents are human operating/design documents;
Hermes does not automatically read them at runtime. The runtime contract comes from
`~/.hermes/config.yaml`, the installed `SKILL.md` files and their references,
`SOUL.md`, and approved memory. Keep behavior-critical rules in those runtime files
and treat the repository documentation as their deployment and design explanation.

## Runtime Configuration

Hermes must provide these environment variables to the skill:

- `HERMES_API_BASE_URL`: reachable backend origin without `/api/v1`, for example `http://127.0.0.1:3000`.
- `HERMES_INTERNAL_API_KEY`: same value as the backend's `INTERNAL_API_KEY`.

Do not put the secret in `SKILL.md`, cron prompts, Telegram messages, or checked-in files. The skill declares both requirements in frontmatter so Hermes can collect the key securely and pass it to terminal execution.

Install every complete skill directory under the active profile's `~/.hermes/skills/`
directory. Then run:

```bash
hermes skills check
hermes tools
```

Enable the terminal toolset for Telegram and cron because the API-backed skill calls
its bundled `curl` wrapper. The three Q&A skills do not require the terminal, API
credentials, or a database connection.

## Telegram Topics

Configure the Hermes gateway and map the group topics in Hermes. The API does not need Telegram credentials, topic IDs, webhook routes, or an adapter.

Topic choice is authoritative for Notes versus Junk. The skill may semantically route structured English requests, but it must not silently move data between the Notes and Junk domains.

General, Speaking, and Listening are intentionally lightweight, non-persistent topics.
They must not create API data, scores, transcripts, vocabulary records, files, cron
jobs, or background work from ordinary Q&A. A future structured Speaking or Listening
feature needs its own approved API design before it may persist data.

Hermes may still retain ordinary Telegram session history as a runtime capability. The
non-persistence rule means these skills do not create an additional project record,
learning record, or API/database data from normal Q&A. A stable user preference may
enter global memory only after the user explicitly requests it and the configured
approval policy permits it.

## Preview-Only API Requests

In any API-backed topic, Hermes interprets preview requests by intent rather than an
exact command. Wording such as `preview saja`, `lihat dulu`, `buat draft`, `jangan
eksekusi`, `jangan kirim`, `jangan simpan`, or equivalent Indonesian/English phrases
must avoid every API call, including read-only `GET` requests. The default `preview`
response contains only the intended result in normal Telegram chat format, with only
non-null/non-empty interpreted fields. It does not include a preview/no-call label,
save status, execution instruction, technical assumptions, amount-calculation
explanation, method, endpoint, or JSON. A request for only the payload/body/JSON
shows the exact complete JSON body that would be sent,
with no status text or wrapper; it is still never sent. A full-preview request shows
both the Telegram-formatted result and the method, endpoint, assumptions, unresolved
values, JSON body, and explicit not-saved status. If the intent is ambiguous, Hermes asks before calling the API and keeps the current conversation/session open.
It must not silently close the chat, discard the draft, mark the task complete, or invoke `/new`, `/reset`, or `/stop` while waiting for the user's decision.

For example, in Finance, `Jangan call API. Preview catat kopi 25 di kantor.` should
show the proposed transaction with `Jumlah: 25.000`, but not the conversion formula,
request diagnostics, null fields, or API details. It must not fetch categories or
create a transaction. The user must clearly authorize the intended
create/save/update/delete action before the normal API workflow resumes; an exact
keyword is not required, but a vague `oke`, `bagus`, `ya`, or `lanjut` is not write
authorization. The full Finance example is in the runtime skill's
`references/finance.md`.

## Internal Inconsistency Guardrail

The agent must not improvise when its own plan, payload, target, or tool state is
incomplete or inconsistent with an API contract. It must stop before the API call,
explain the missing or conflicting value, and ask Garin to decide. In particular,
it must not use Python, `execute_code`, temporary JSON files, or helper scripts to
invent, repair, or transform business data or an API request body. Hermes AI must
generate the complete body directly; `api.sh` only transports that completed body.
Hermes may generate content explicitly requested for Grammar, Reading, or Writing,
but it may not guess user facts, amounts, identifiers, targets, or side effects.

The API rejects every request field it does not define, so a body that carries an
extra or misspelled key returns `400` instead of being ignored. Hermes sends only the
fields that the domain reference lists for that endpoint, and each reference documents
the accepted request body for every endpoint it uses.

This is separate from preview mode: preview mode is a user-requested no-call mode,
while the inconsistency guardrail applies whenever Hermes itself detects an internal
problem. A pending skill-change proposal is not a successful change and must be
reviewed or rejected explicitly.

Hermes is also not allowed to edit even one character of project code or project
files. This includes source code, tests, migrations, scripts, skills, documentation,
configuration, `.env` files, and deployment files. It may read files to understand
the contract, but any write must be handled outside the Telegram assistant through
the reviewed development/deployment workflow.

The only allowed network operation for the API-backed skill is the bundled `api.sh`
wrapper against `HERMES_API_BASE_URL`. It must not use arbitrary shell commands,
Python, direct `curl`, browser/web tools, webhooks, external URLs, `sudo`, or package
managers. It must not inspect `.env`, environment dumps, private keys, or logs that
may reveal credentials.

Clear create requests in their matching API topic may run normally. Every update,
delete, settings change, bulk mutation, or cron change requires a stable reference,
an impact summary, and a separate explicit confirmation. A previewed mutation must
use the exact approved body; any changed value or assumption requires a new preview.
When a mutation outcome is uncertain, Hermes must not retry it automatically.

## Telegram Output Discipline

The Telegram user sees only the final user-facing answer. Hermes must not expose its
private reasoning, planning, tool selection, tool-call arguments, shell commands,
raw tool output, execution trace, request headers, logs, paths, or credentials. In
particular, responses must never contain blocks labeled `💭 Reasoning`, `Thinking`, `Analysis`, `Tool`, or `Shell`.

Before sending, Hermes discards any drafted reasoning or planning. The first visible
line must belong to the final user-facing answer and must not introduce, summarize, or quote internal reasoning.

For a list or status request, return the requested information and the minimum
context needed to understand it. If Garin asks why, give a short explanation grounded
in facts or the applicable rule; do not reveal hidden chain-of-thought. A safe,
concise diagnostic may be given only when explicitly requested.

## Persona and Memory Policy

`hermes/profile-template` contains reviewed starting files for the active
`hermes-agent` profile:

- `SOUL.md` controls the global voice, response structure, and truthfulness rules.
- `USER.md` contains stable user preferences.
- `MEMORY.md` contains compact environment and workflow facts.
- `config-memory-safety.yaml` is a merge-only fragment that requires approval before
  Hermes saves memory or edits a skill.

The source template contains no secrets. Do not store credentials, raw logs, data
records, full transcripts, or API contracts in these files. API-backed data belongs in
PostgreSQL; detailed procedures belong in skills; short personal/environment facts
belong in memory.

After updating `SOUL.md`, `USER.md`, or `MEMORY.md`, begin a new Telegram session with
`/new`. Hermes reads memory as a snapshot when the session starts.

## Scheduled Practice

Grammar, Reading, and Writing schedules live in Hermes cron. Installation does not create jobs because this project does not define the user's preferred times or Telegram IDs. Use the verified templates in the skill's `references/scheduling.md` after those values are known.

The gateway must be running for scheduled execution and Telegram delivery. Validate jobs with `hermes cron status`, a manual `hermes cron run`, and `hermes cron doctor` before relying on them.

Set the Hermes profile timezone to `Asia/Jakarta` before creating the schedules so wall-clock times have the intended meaning.

## Ownership Boundary

- Hermes owns Telegram ingress/egress, topic context, intent extraction, learning-content generation/evaluation, and cron.
- The skill owns instructions for translating those actions into safe REST calls.
- The API owns validation, business rules, transactions, persistence, and authoritative reports.
- Only backend repositories access PostgreSQL.
