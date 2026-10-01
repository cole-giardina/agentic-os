# Agentic OS — Phase 1 Plan

> Hand this file to Claude Code. Put it in the repo root and say:
> "Read PHASE1_PLAN.md and build Milestone 1. Stop after each milestone so I can test."

## Goal

A personal AI agent that knows my calendar, tasks, and goals, writes me a daily plan every morning, and shows everything on a web dashboard. Built multi-user-ready so friends can use it in Phase 4.

**Phase 1 is done when:** every morning, without me doing anything, a brief is generated from my real calendar, tasks, and Obsidian goals, saved, and visible on the dashboard, and I can add/complete tasks from the dashboard.

## Scope

**In:** Claude agent with tool use, Google Calendar (read-only), tasks (Supabase), Obsidian memory (read; write to agent folders only), morning brief, dashboard (Today, Tasks, Activity Log), Google login, deployment.

**Out (later phases):** SMS/Twilio, Gmail, approval queue, trackers, weekly review, friend onboarding, vault Git sync.

## Stack

| Layer | Choice |
|---|---|
| Frontend | React + TypeScript (Vite), Tailwind |
| Backend | Python FastAPI |
| Database + auth | Supabase (Postgres + Google OAuth) |
| AI | Claude API via `anthropic` Python SDK, tool use |
| Calendar | Google Calendar API (read-only scope) |
| Memory | Obsidian vault (local folder path in Phase 1) |
| Scheduling | n8n calls `POST /agent/run-brief` daily at 6:00 AM (America/Phoenix) |
| Hosting | Vercel (frontend), Render or Railway (backend) |

Model: use a current Claude Sonnet model; check https://docs.claude.com for the model string. Put it in an env var.

## Repo structure

```
agentic-os/
  PHASE1_PLAN.md
  CLAUDE.md                 # conventions for Claude Code
  backend/
    app/
      main.py               # FastAPI app, routes
      config.py             # env vars
      db.py                 # Supabase client
      auth.py               # verify Supabase JWT -> user_id
      agent/
        runner.py           # agent loop (tool use until done)
        prompts.py          # system prompt + brief prompt
        tools/
          calendar.py
          tasks.py
          memory.py         # Obsidian read/write
      routes/
        tasks.py
        briefs.py
        agent.py
        activity.py
    tests/
    requirements.txt
  frontend/
    src/
      pages/ Today.tsx, Tasks.tsx, Activity.tsx, Login.tsx
      components/
      lib/api.ts, supabase.ts
  supabase/
    migrations/001_init.sql
```

## Data model (every table has `user_id`)

```sql
create table profiles (
  id uuid primary key references auth.users(id),
  display_name text,
  timezone text default 'America/Phoenix',
  vault_path text,              -- Phase 1: local path to Obsidian vault
  created_at timestamptz default now()
);

create table tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  title text not null,
  notes text,
  due_date date,
  priority int default 2,       -- 1 high, 2 normal, 3 low
  status text default 'open',   -- open | done
  source text default 'user',   -- user | agent
  created_at timestamptz default now(),
  completed_at timestamptz
);

create table briefs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  brief_date date not null,
  content_md text not null,
  created_at timestamptz default now(),
  unique (user_id, brief_date)
);

create table agent_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id),
  trigger text not null,        -- schedule | manual | chat
  status text default 'running',-- running | success | error
  input_tokens int,
  output_tokens int,
  error text,
  started_at timestamptz default now(),
  finished_at timestamptz
);

create table agent_actions (
  id uuid primary key default gen_random_uuid(),
  run_id uuid references agent_runs(id),
  user_id uuid not null references auth.users(id),
  tool_name text not null,
  tool_input jsonb,
  tool_output_summary text,
  created_at timestamptz default now()
);
```

Enable Row Level Security on all tables: users can only read/write rows where `user_id = auth.uid()`.

## Agent tools (Phase 1)

| Tool | Input | Does |
|---|---|---|
| `get_calendar_events` | `start_date`, `end_date` | Read events from Google Calendar |
| `list_tasks` | `status?`, `due_before?` | Read tasks |
| `create_task` | `title`, `due_date?`, `priority?`, `notes?` | Add a task (`source = 'agent'`) |
| `complete_task` | `task_id` | Mark a task done |
| `read_memory` | `path` | Read a note from the vault (allowed: `Memory/`, `Projects/`, `Daily/`) |
| `search_memory` | `query` | Simple keyword search over vault notes, return paths + snippets |
| `write_daily_note` | `date`, `content` | Write/append to `Daily/YYYY-MM-DD.md` only |

Rules enforced in code, not just the prompt:
- Memory tools reject any path outside the allowed folders and any `..` traversal.
- The agent can never edit `Memory/` notes in Phase 1 (read-only).
- Every tool call is logged to `agent_actions`.
- Agent loop stops after 15 tool calls.

## Obsidian vault structure

```
Vault/
  Memory/
    about-me.md        # who I am, schedule, priorities
    goals.md           # current goals (school, job search, fitness)
    preferences.md     # how I want plans written
  Projects/            # one note per active project
  Daily/               # agent writes the daily brief here
```

Each note uses frontmatter:
```yaml
---
type: goal | project | preference
status: active | paused | done
updated: 2026-10-01
---
```

## System prompt (draft; test in the Console Workbench first)

```
You are Cole's personal operations agent. Your job is to help him run his day:
school, job search, work, and personal goals.

Before planning, read Memory/about-me.md, Memory/goals.md, and Memory/preferences.md.
Use tools to get facts. Never invent calendar events, tasks, or deadlines.
Be brief and direct. Prioritize ruthlessly: at most 3 top priorities per day.
You may create tasks only when they clearly follow from a deadline or goal you read;
mark them source=agent and say why in the notes field.
If something is ambiguous or important, flag it for Cole instead of guessing.
```

## Morning brief

Trigger: n8n → `POST /agent/run-brief` with a shared secret header (`X-Cron-Secret`), runs for every user with a profile.

Agent steps:
1. Read memory notes (about-me, goals, preferences).
2. Get today's and tomorrow's calendar events.
3. List open tasks and overdue tasks.
4. Write the brief in this format:

```
## Today — Wed Oct 1
**Top 3:** ...
**Schedule:** ...
**Due soon / overdue:** ...
**Heads up:** conflicts, prep needed, anything slipping
```

5. Save to `briefs`, write to `Daily/YYYY-MM-DD.md`.

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| GET | `/health` | Health check |
| GET | `/tasks` | List my tasks |
| POST | `/tasks` | Create task |
| PATCH | `/tasks/{id}` | Update / complete |
| DELETE | `/tasks/{id}` | Delete |
| GET | `/briefs/today` | Today's brief |
| POST | `/agent/run-brief` | Cron-triggered (secret) |
| POST | `/agent/run-brief/me` | Manual "regenerate my brief" button |
| GET | `/activity` | Recent agent runs + actions |

All user routes require a Supabase JWT; backend derives `user_id` from it, never from the request body.

## Dashboard

- **Today:** brief (rendered Markdown), today's calendar, top tasks, "Regenerate brief" button.
- **Tasks:** list with add, complete, delete, filter open/done; agent-created tasks get a badge.
- **Activity:** each agent run with status, tokens, and the tools it called. (This is the "trust" view; it also demos well.)
- **Login:** Google sign-in via Supabase.

## Environment variables

```
ANTHROPIC_API_KEY=
CLAUDE_MODEL=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=      # backend only, never in frontend
SUPABASE_ANON_KEY=              # frontend
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
CRON_SECRET=
VAULT_PATH=                     # Phase 1 local vault
```

Never commit `.env`. Add `.env.example` with blank values.

## Milestones

**M1 — Skeleton (day 1–2)**
FastAPI with `/health`, Vite React app, Supabase project, migration `001_init.sql`, Google login working.
✅ I can log in and see an empty dashboard.

**M2 — Tasks (day 3–4)**
Task CRUD endpoints + Tasks page, RLS verified.
✅ I can add/complete tasks; a second test account can't see mine.

**M3 — Agent core (day 5–7)**
Agent loop, task tools, memory tools with path restrictions, logging to `agent_runs` / `agent_actions`, unit tests for tool guards.
✅ Manual endpoint: agent reads my vault and tasks and returns a sensible answer; Activity page shows the tool calls.

**M4 — Calendar + brief (day 8–10)**
Google Calendar read tool, brief prompt, `/briefs/today`, Today page, daily note written to vault.
✅ "Regenerate brief" produces an accurate brief from my real data.

**M5 — Schedule + deploy (day 11–14)**
n8n daily trigger, deploy frontend and backend, set Anthropic spend limit.
✅ Brief appears automatically at 6 AM for 5 days straight.

Note: while the vault is local, the scheduled brief needs the backend running on my Mac (or skip memory when the vault is unreachable). Git-synced vault comes in a later phase.

## Track from day one (for the resume)

- Days the brief ran successfully
- Tasks created/completed
- Agent runs and average cost per run
- Later: weekly active users once friends join

## Notes for Claude Code

- Build one milestone at a time; stop and summarize what to test.
- Write tests for auth, RLS assumptions, and memory path guards.
- Keep functions small; type hints in Python, strict TypeScript.
- Ask before adding new dependencies or services.
