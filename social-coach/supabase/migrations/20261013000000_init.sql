-- Norm initial schema. Every table is keyed to auth.users and locked
-- down with RLS so a user can only read/write their own rows. The coach Edge
-- Function writes with the user's JWT, so RLS applies there too; only
-- delete_all uses the service role (to remove the auth user).

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  consent_at timestamptz,
  consent_version text,
  consent_withdrawn_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  kind text not null default 'practice' check (kind in ('practice', 'prep')),
  scenario_id text not null,
  custom_description text,
  difficulty text not null check (difficulty in ('easy', 'medium', 'hard')),
  prompt_version text not null,
  crisis boolean not null default false,
  ended_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.messages (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  role text not null check (role in ('user', 'partner')),
  text text not null,
  created_at timestamptz not null default now()
);

create table public.debriefs (
  id bigint generated always as identity primary key,
  session_id uuid not null references public.sessions (id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  body jsonb not null,
  prompt_version text not null,
  created_at timestamptz not null default now()
);

create table public.usage (
  id bigint generated always as identity primary key,
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  session_id uuid references public.sessions (id) on delete set null,
  kind text not null check (kind in ('turn', 'debrief', 'prep')),
  model text not null,
  input_tokens integer not null default 0,
  output_tokens integer not null default 0,
  cache_read_input_tokens integer not null default 0,
  cache_creation_input_tokens integer not null default 0,
  created_at timestamptz not null default now()
);

create index on public.sessions (user_id, created_at desc);
create index on public.messages (session_id, id);
create index on public.usage (user_id, kind, created_at);

alter table public.profiles enable row level security;
alter table public.sessions enable row level security;
alter table public.messages enable row level security;
alter table public.debriefs enable row level security;
alter table public.usage enable row level security;

create policy "own profile" on public.profiles
  for all using (id = auth.uid()) with check (id = auth.uid());
create policy "own sessions" on public.sessions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own messages" on public.messages
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own debriefs" on public.debriefs
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());
-- Usage is append-only from the user's side: read and insert, no edits.
create policy "read own usage" on public.usage
  for select using (user_id = auth.uid());
create policy "insert own usage" on public.usage
  for insert with check (user_id = auth.uid());

-- Owner-facing cost view (query from the SQL editor; not exposed to users).
create view public.usage_daily with (security_invoker = true) as
  select date_trunc('day', created_at) as day, model, kind,
         count(*) as calls,
         sum(input_tokens) as input_tokens,
         sum(output_tokens) as output_tokens,
         sum(cache_read_input_tokens) as cache_read_input_tokens
  from public.usage
  group by 1, 2, 3
  order by 1 desc;
