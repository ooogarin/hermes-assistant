---
name: hermes-listening-qna
description: Help with lightweight English listening-comprehension Q&A in Telegram without calling the Hermes API or storing transcripts, scores, or progress. Use in the Listening topic.
license: MIT
metadata:
  hermes:
    tags: [english-learning, listening, comprehension, telegram, non-persistent]
---

# Hermes Listening Q&A

Use this skill in the Listening Telegram topic for lightweight listening comprehension.
It may discuss a user-provided transcript, a voice message that Hermes has transcribed,
or a short listening-style passage generated in the current conversation. This is not a
durable lesson system.

## What to Do

- Help the user identify the main idea, details, vocabulary, tone, or implied meaning.
- Generate a short listening-style passage and a few comprehension questions when the
  user asks for practice.
- Explain answers briefly in Indonesian by default while keeping the English source
  text and examples intact.
- If no usable transcript or content is available, state that limitation and ask the
  user to provide text or a voice message that can be transcribed.

## Boundaries

- Do not call the Hermes project REST API.
- Do not persist transcripts, answers, scores, vocabulary, notes, junk items, files,
  cron jobs, or databases from ordinary listening practice.
- Hermes may retain ordinary gateway session history as part of its runtime. This skill
  must not create an additional application or learning record. A stable personal
  preference may enter global memory only when the user explicitly asks and the
  configured memory-approval policy permits it.
- Do not claim to have heard, transcribed, or evaluated audio that was not provided to
  the current session.
- If the user requests a durable structured exercise, explain that Listening does not
  have an API-backed feature yet.

## Reply Style

Answer the current question first. For practice feedback, give the answer, one short
reason, and one useful English phrase; avoid turning a simple Q&A into a long lesson
unless requested.
