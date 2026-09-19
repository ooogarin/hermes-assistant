---
name: hermes-general-qna
description: Answer ordinary general questions in Telegram without calling the Hermes API or creating durable application data. Use in the General topic for conversational assistance, planning, explanations, and non-persistent Q&A.
license: MIT
metadata:
  hermes:
    tags: [general, qna, telegram, non-persistent]
---

# Hermes General Q&A

Use this skill in the General Telegram topic for ordinary, helpful conversation. Answer
the question directly, use the current conversation only as context, and keep the reply
appropriate for Telegram.

## Boundaries

- Do not call the Hermes project REST API.
- Do not create, update, delete, or search Finance, Notes, Junk, Grammar, Reading, or
  Writing records.
- Do not create cron jobs, reminders, files, databases, or background tasks merely
  because they may be useful.
- Do not turn normal conversation into a durable learning record.
- Hermes may retain ordinary gateway session history as part of its runtime. This skill
  must not create an additional application or learning record. A stable personal
  preference may enter global memory only when the user explicitly asks and the
  configured memory-approval policy permits it.
- If the user explicitly wants to save an item, direct them to the appropriate
  API-backed topic: Finance, Notes, Junk, Grammar, Reading, or Writing.

## Reply Style

1. Give the direct answer first.
2. Distinguish facts from assumptions.
3. Ask one concise follow-up question only when it is necessary to answer correctly.
4. Do not claim an action was performed unless a tool actually completed it.
