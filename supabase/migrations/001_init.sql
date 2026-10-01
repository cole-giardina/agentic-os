-- Phase 1 schema: profiles, tasks, briefs, agent_runs, agent_actions.
-- Every table carries user_id and has RLS restricting rows to auth.uid().

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

-- Indexes for the common access patterns (per-user lookups, brief-by-date).
create index tasks_user_id_idx on tasks(user_id);
create index briefs_user_id_idx on briefs(user_id);
create index agent_runs_user_id_idx on agent_runs(user_id);
create index agent_actions_run_id_idx on agent_actions(run_id);
create index agent_actions_user_id_idx on agent_actions(user_id);

-- Row Level Security: every table restricted to auth.uid().
alter table profiles enable row level security;
alter table tasks enable row level security;
alter table briefs enable row level security;
alter table agent_runs enable row level security;
alter table agent_actions enable row level security;

create policy "profiles_select_own" on profiles
  for select using (auth.uid() = id);
create policy "profiles_insert_own" on profiles
  for insert with check (auth.uid() = id);
create policy "profiles_update_own" on profiles
  for update using (auth.uid() = id);

create policy "tasks_select_own" on tasks
  for select using (auth.uid() = user_id);
create policy "tasks_insert_own" on tasks
  for insert with check (auth.uid() = user_id);
create policy "tasks_update_own" on tasks
  for update using (auth.uid() = user_id);
create policy "tasks_delete_own" on tasks
  for delete using (auth.uid() = user_id);

create policy "briefs_select_own" on briefs
  for select using (auth.uid() = user_id);
create policy "briefs_insert_own" on briefs
  for insert with check (auth.uid() = user_id);
create policy "briefs_update_own" on briefs
  for update using (auth.uid() = user_id);

create policy "agent_runs_select_own" on agent_runs
  for select using (auth.uid() = user_id);
create policy "agent_runs_insert_own" on agent_runs
  for insert with check (auth.uid() = user_id);
create policy "agent_runs_update_own" on agent_runs
  for update using (auth.uid() = user_id);

create policy "agent_actions_select_own" on agent_actions
  for select using (auth.uid() = user_id);
create policy "agent_actions_insert_own" on agent_actions
  for insert with check (auth.uid() = user_id);

-- New signups get a profile row automatically.
create function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$ language plpgsql security definer set search_path = public;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
