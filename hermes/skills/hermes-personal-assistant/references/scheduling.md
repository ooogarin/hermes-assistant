# Scheduling English Practice

The Hermes gateway owns scheduling and Telegram delivery. The backend has no scheduler or Telegram webhook.

Create three independent jobs so they can have distinct times and Telegram topics. Replace the bracketed values with real schedules and destination IDs; do not guess them.

```bash
hermes cron create "[GRAMMAR_SCHEDULE]" \
  "Generate today's Grammar practice. Fetch Grammar settings, create and persist a practice session with source cron, then return the session code and questions. Do not include answers or explanations." \
  --skill hermes-personal-assistant \
  --deliver "telegram:[CHAT_ID]:[GRAMMAR_THREAD_ID]" \
  --name "daily-grammar"

hermes cron create "[READING_SCHEDULE]" \
  "Generate today's Reading material. Fetch Reading settings, create and persist a fresh passage with source cron and 3-5 comprehension questions, then return the material code, passage, and questions without expected answers." \
  --skill hermes-personal-assistant \
  --deliver "telegram:[CHAT_ID]:[READING_THREAD_ID]" \
  --name "daily-reading"

hermes cron create "[WRITING_SCHEDULE]" \
  "Generate today's Writing prompt. Fetch Writing settings, create and persist a fresh prompt with source cron, then return the material code, prompt, genre, and target word count." \
  --skill hermes-personal-assistant \
  --deliver "telegram:[CHAT_ID]:[WRITING_THREAD_ID]" \
  --name "daily-writing"
```

Hermes accepts natural-language schedules or cron expressions. Set the profile timezone before enabling daily jobs, then verify the calculated next-run times:

```bash
hermes config set timezone Asia/Jakarta
```

After creation:

```bash
hermes cron list
hermes cron status
hermes cron run daily-grammar
hermes cron run daily-reading
hermes cron run daily-writing
hermes cron doctor
```

Each cron run starts in a fresh session. The attached skill supplies the API workflow; each prompt above supplies the complete job-specific instruction. Hermes automatically delivers the final response to the configured Telegram topic, so the job must not call a Telegram send operation itself.
