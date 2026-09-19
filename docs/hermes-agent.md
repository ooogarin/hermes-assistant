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

In any API-backed topic, the user can explicitly request a dry run with phrases such as
`preview saja`, `jangan call API`, `jangan simpan`, or `tampilkan payload dulu`. Hermes
must then avoid every API call, including read-only `GET` requests. It should show the
planned endpoint, method, payload/query, assumptions, and unresolved values, and label
the result as not saved.

For example, in Finance, `Jangan call API. Preview catat kopi 25 di kantor.` should
show the proposed transaction and the `25 → Rp25.000` conversion, but must not fetch
categories or create a transaction. The user must explicitly say `simpan`, `jalankan`,
`eksekusi`, or `call API` before the normal API workflow resumes. A vague `oke` is not
write authorization. The full Finance example is in the runtime skill's
`references/finance.md`.

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
