# Hermes Agent Integration

Hermes Agent is the active assistant runtime. This repository owns only the passive REST API, PostgreSQL persistence, and an installable Hermes skill source.

```text
Telegram topic
  -> Hermes gateway
  -> hermes-personal-assistant skill
  -> authenticated curl request
  -> REST API
  -> PostgreSQL
  -> Hermes response
```

The runtime skill source is located at `hermes/skills/hermes-personal-assistant`. It is intentionally separate from `.agents/skills`, which contains code-writing instructions for repository agents.

## Runtime Configuration

Hermes must provide these environment variables to the skill:

- `HERMES_API_BASE_URL`: reachable backend origin without `/api/v1`, for example `http://127.0.0.1:3000`.
- `HERMES_INTERNAL_API_KEY`: same value as the backend's `INTERNAL_API_KEY`.

Do not put the secret in `SKILL.md`, cron prompts, Telegram messages, or checked-in files. The skill declares both requirements in frontmatter so Hermes can collect the key securely and pass it to terminal execution.

Install the skill using the Hermes skill installation workflow or place the complete directory under the active profile's `~/.hermes/skills/hermes-personal-assistant` directory. Then run:

```bash
hermes skills check
hermes tools
```

Enable the terminal toolset for Telegram and cron because the skill calls its bundled `curl` wrapper.

## Telegram Topics

Configure the Hermes gateway and map the group topics in Hermes. The API does not need Telegram credentials, topic IDs, webhook routes, or an adapter.

Topic choice is authoritative for Notes versus Junk. The skill may semantically route structured English requests, but it must not silently move data between the Notes and Junk domains.

## Scheduled Practice

Grammar, Reading, and Writing schedules live in Hermes cron. Installation does not create jobs because this project does not define the user's preferred times or Telegram IDs. Use the verified templates in the skill's `references/scheduling.md` after those values are known.

The gateway must be running for scheduled execution and Telegram delivery. Validate jobs with `hermes cron status`, a manual `hermes cron run`, and `hermes cron doctor` before relying on them.

Set the Hermes profile timezone to `Asia/Jakarta` before creating the schedules so wall-clock times have the intended meaning.

## Ownership Boundary

- Hermes owns Telegram ingress/egress, topic context, intent extraction, learning-content generation/evaluation, and cron.
- The skill owns instructions for translating those actions into safe REST calls.
- The API owns validation, business rules, transactions, persistence, and authoritative reports.
- Only backend repositories access PostgreSQL.
