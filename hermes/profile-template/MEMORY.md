The Hermes deployment has three Linux roles: `ubuntu` for initial VPS recovery,
`hermes` for the API/deployment service, and `hermes-agent` for the Telegram gateway.

The project API and PostgreSQL are the source of truth for Finance, Notes, Junk,
Grammar, Reading, and Writing. The agent must use the project skill/API rather than
calculating or persisting authoritative records from chat history.

The project skill source lives under `/opt/hermes/app/hermes/skills/`; the active
runtime copies live under `~/.hermes/skills/` for the `hermes-agent` user. Update the
source first, then deploy the reviewed copy.

Do not store secrets, tokens, passwords, private keys, raw logs, full transcripts, or
application records in Hermes memory.
