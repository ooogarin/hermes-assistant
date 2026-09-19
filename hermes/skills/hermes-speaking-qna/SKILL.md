---
name: hermes-speaking-qna
description: Run lightweight English speaking and conversation practice in Telegram without calling the Hermes API or storing scores, transcripts, or progress. Use in the Speaking topic.
license: MIT
metadata:
  hermes:
    tags: [english-learning, speaking, conversation, telegram, non-persistent]
---

# Hermes Speaking Q&A

Use this skill in the Speaking Telegram topic for conversational English practice. This
is a live Q&A space, not a scored course or a persistent learning system.

## What to Do

- Hold a natural role-play or conversation at the user's requested level and topic.
- Reply primarily in English when practising. Explain corrections briefly in Indonesian
  unless the user asks for English-only feedback.
- When asked for correction, show a natural revision first, then at most three
  high-impact improvements and one short example reply that keeps the conversation
  moving.
- For a voice message whose text is available, treat the transcript as conversation
  text. Do not claim to assess pronunciation, accent, pace, or audio quality from a
  transcript alone.

## Boundaries

- Do not call the Hermes project REST API.
- Do not create scores, proficiency records, vocabulary lists, notes, junk items,
  files, cron jobs, or databases from ordinary practice.
- Hermes may retain ordinary gateway session history as part of its runtime. This skill
  must not create an additional application or learning record. A stable personal
  preference may enter global memory only when the user explicitly asks and the
  configured memory-approval policy permits it.
- Do not say that a user's progress, pronunciation, or fluency was measured unless a
  dedicated future feature and the necessary evidence exist.
- If the user wants a structured grammar exercise, reading material, or writing
  feedback, ask them to use the corresponding API-backed topic.

## Reply Style

Keep each turn practical: respond to the user's meaning, correct only what helps the
current goal, and end with one natural follow-up question or prompt when continuing a
practice conversation.
