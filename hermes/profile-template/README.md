# Hermes Profile Template

This directory contains the reviewed baseline for the `hermes-agent` runtime profile.
It is intentionally separate from API-backed data and contains no password, bot token,
private key, or API key.

| Source file | Destination on the VPS | Purpose |
| --- | --- | --- |
| `SOUL.md` | `~/.hermes/SOUL.md` | Global voice, response style, and truthfulness rules |
| `USER.md` | `~/.hermes/memories/USER.md` | Stable user preferences |
| `MEMORY.md` | `~/.hermes/memories/MEMORY.md` | Compact environment and workflow facts |
| `config-memory-safety.yaml` | Merge into `~/.hermes/config.yaml` | Approval gates for memory and skill changes |

Copy these only as `hermes-agent`. Do not overwrite a profile that already contains
curated memory without reviewing the existing file first. Start a new Telegram session
with `/new` after changing any of these files, because Hermes loads them at session
start.

Do not use these files for Finance, Notes, Junk, learning submissions, full transcripts,
logs, passwords, tokens, private keys, or server credentials. Those either belong in the
API database, in normal session history, or in a password manager.

The Telegram assistant must not write project/runtime files, code, skills, or
configuration. The narrow exception is a user-requested stable preference proposed
through the memory approval workflow and saved only to `USER.md` or `MEMORY.md`; never
write memory through the terminal or use it to override runtime safety rules.
