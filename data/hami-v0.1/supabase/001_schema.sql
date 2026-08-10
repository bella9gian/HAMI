-- HAMI v0.1 foundation schema. Run only after reviewing in your Supabase SQL editor.
create extension if not exists pgcrypto;

create table if not exists households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now()
);

create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text not null,
  avatar_path text,
  created_at timestamptz not null default now()
);

create table if not exists household_members (
  household_id uuid not null references households(id) on delete cascade,
  profile_id uuid not null references profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','member')),
  primary key (household_id, profile_id)
);

create table if not exists calendar_events (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references households(id) on delete cascade,
  title text not null, starts_at timestamptz not null, ends_at timestamptz, location text, notes text,
  created_by uuid references profiles(id), created_at timestamptz not null default now()
);
create table if not exists calendar_event_assignees (
  event_id uuid references calendar_events(id) on delete cascade,
  profile_id uuid references profiles(id) on delete cascade,
  primary key(event_id, profile_id)
);

create table if not exists todos (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references households(id) on delete cascade,
  title text not null, due_at timestamptz, completed_at timestamptz, created_by uuid references profiles(id), created_at timestamptz not null default now()
);
create table if not exists todo_assignees (
  todo_id uuid references todos(id) on delete cascade, profile_id uuid references profiles(id) on delete cascade,
  primary key(todo_id, profile_id)
);

create table if not exists chores (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references households(id) on delete cascade,
  title text not null, recurrence_rule text, active boolean not null default true, created_at timestamptz not null default now()
);
create table if not exists chore_assignees (
  chore_id uuid references chores(id) on delete cascade, profile_id uuid references profiles(id) on delete cascade,
  primary key(chore_id, profile_id)
);
create table if not exists chore_completions (
  id uuid primary key default gen_random_uuid(), chore_id uuid not null references chores(id) on delete cascade,
  completed_by uuid references profiles(id), completed_at timestamptz not null default now()
);

create table if not exists trips (
  id uuid primary key default gen_random_uuid(), household_id uuid not null references households(id) on delete cascade,
  name text not null, destination text, starts_on date, ends_on date, notes text, created_at timestamptz not null default now()
);
create table if not exists trip_members (
  trip_id uuid references trips(id) on delete cascade, profile_id uuid references profiles(id) on delete cascade,
  primary key(trip_id, profile_id)
);
create table if not exists trip_tasks (
  id uuid primary key default gen_random_uuid(), trip_id uuid not null references trips(id) on delete cascade,
  title text not null, due_at timestamptz, completed_at timestamptz
);
create table if not exists trip_task_assignees (
  trip_task_id uuid references trip_tasks(id) on delete cascade, profile_id uuid references profiles(id) on delete cascade,
  primary key(trip_task_id, profile_id)
);

-- RLS helper: household membership.
create or replace function public.is_household_member(hid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select exists(select 1 from household_members hm where hm.household_id = hid and hm.profile_id = auth.uid()); $$;

alter table households enable row level security;
alter table profiles enable row level security;
alter table household_members enable row level security;
alter table calendar_events enable row level security;
alter table todos enable row level security;
alter table chores enable row level security;
alter table trips enable row level security;

create policy "members read household" on households for select using (public.is_household_member(id));
create policy "profiles read self" on profiles for select using (id = auth.uid());
create policy "members read membership" on household_members for select using (public.is_household_member(household_id));
create policy "members manage events" on calendar_events for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members manage todos" on todos for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members manage chores" on chores for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "members manage trips" on trips for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
