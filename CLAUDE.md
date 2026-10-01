# Agentic OS — Conventions & Context

## Who this is for
Cole, CIS student at ASU (W.P. Carey). This is a portfolio project for a Claude Corps
application. It must honestly support: (1) an app other people used, (2) an automation
that saved someone time, (3) a dashboard/tracker, (4) a project using Claude.

## Goal
An "agentic OS" — a Claude agent that runs Cole's day (calendar, tasks, goals) with a
web dashboard as the control panel. See [PHASE1_PLAN.md](PHASE1_PLAN.md) for the full
spec, data model, and milestones.

## Key decisions
- **Multi-user from day one**: every table has `user_id`, RLS enforced. Friends will
  use this in Phase 4 — don't build single-user shortcuts.
- **Metrics logged from the start**: `agent_runs`, `agent_actions` track runs, tool
  calls, tokens, cost — needed for the resume/portfolio claims.
- **Memory is hybrid**: Obsidian vault for human-editable long-term memory (goals,
  preferences, projects, daily notes); Supabase for structured data (tasks, briefs,
  activity log).
- **Vault location (Phase 1, local)**: `/Users/colegiardina/AgenticOS-Vault`
  - `Memory/about-me.md`, `Memory/goals.md`, `Memory/preferences.md` — agent reads,
    never writes.
  - `Projects/` — agent reads, never writes.
  - `Daily/` — agent writes only here (daily brief notes).
  - Git-synced vault comes in a later phase. Don't build that yet.
- **Code repo**: `/Users/colegiardina/agentic-os` (this folder). Never write code or
  app files into the vault — it's for human-editable notes only.
- **Later phases, don't build yet**: SMS via Twilio, Gmail drafting with an approval
  queue, trackers, weekly review, friend onboarding, vault Git sync.

## How to work with Cole
- Build one milestone at a time (see PHASE1_PLAN.md milestones M1–M5), then stop and
  say exactly what to test.
- Never ask Cole to paste API keys/secrets in chat — tell him which `.env` values to
  fill in and where to get them.
- Ask before adding new dependencies or services beyond what's already decided in
  PHASE1_PLAN.md's stack table.

## Stack
FastAPI (backend) + React/TypeScript/Vite/Tailwind (frontend) + Supabase (Postgres +
Google OAuth) + Claude API (tool use) + Google Calendar API + Obsidian vault (local
read/write) + n8n (daily cron trigger, later milestone).

## Conventions
- Python: type hints everywhere, small functions.
- TypeScript: strict mode.
- Every table: `user_id`, RLS policy restricting to `auth.uid()`.
- Every agent tool call logged to `agent_actions`.
- Memory tools must reject paths outside `Memory/`, `Projects/`, `Daily/` and reject
  any `..` traversal — enforced in code, not just prompted.
