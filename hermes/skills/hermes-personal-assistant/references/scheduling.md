# Scheduling English Practice

The Hermes gateway owns scheduling and Telegram delivery. The backend has no scheduler or Telegram webhook.

## Before Creating a Job

Confirm all of these first:

- the `hermes-gateway` service is running;
- the profile timezone is `Asia/Jakarta`;
- the API-backed skill is installed and `hermes skills check` succeeds;
- the API base URL/key work for the `hermes-agent` user;
- the user has chosen a schedule and destination topic.

Never guess a time, chat ID, or topic ID. A valid Telegram delivery target has this
shape:

```text
telegram:<group_chat_id>:<topic_thread_id>
```

For the current group, the known destinations are:

| Job | Topic | Delivery target |
| --- | --- | --- |
| Grammar | Grammar (`4`) | `telegram:-1003982488692:4` |
| Reading | Reading (`5`) | `telegram:-1003982488692:5` |
| Writing | Writing (`6`) | `telegram:-1003982488692:6` |

The destination is the topic where the generated exercise should appear. Do not use
`General` or `Service Info` for the exercise itself.

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

## Verification Checklist

After creating jobs:

1. Run `hermes cron list` and verify the job name, schedule, skill, and delivery target.
2. Run `hermes cron status` and confirm the next-run time uses `Asia/Jakarta`.
3. Run `hermes cron doctor` and resolve any warning before relying on the job.
4. Manually run one job with `hermes cron run <name>`.
5. Confirm the result appears in the intended topic and includes the generated code
   (`GR-...`, `RD-...`, or `WR-...`) without exposing answers prematurely.

Do not create duplicate jobs after a timeout. Check `hermes cron list` first; a job may
already have been created even when the terminal command did not display its final
response.
