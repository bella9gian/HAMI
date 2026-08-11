-- HAMI family data model.
-- Reference migration only: review carefully before applying to a Supabase project.
create extension if not exists pgcrypto;

create table if not exists public.households (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.family_members (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  user_id uuid unique references auth.users(id) on delete set null,
  display_name text not null,
  first_name text,
  relationship text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  location text,
  notes text,
  created_by uuid references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.calendar_event_assignees (
  event_id uuid not null references public.calendar_events(id) on delete cascade,
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  primary key (event_id, family_member_id)
);

create table if not exists public.todos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  completed_at timestamptz,
  created_by uuid references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.todo_assignees (
  todo_id uuid not null references public.todos(id) on delete cascade,
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  primary key (todo_id, family_member_id)
);

create table if not exists public.chores (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  title text not null,
  recurrence_rule text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.chore_assignees (
  chore_id uuid not null references public.chores(id) on delete cascade,
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  primary key (chore_id, family_member_id)
);

create table if not exists public.chore_completions (
  id uuid primary key default gen_random_uuid(),
  chore_id uuid not null references public.chores(id) on delete cascade,
  completed_by uuid references public.family_members(id) on delete set null,
  completed_at timestamptz not null default now()
);

create table if not exists public.trips (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  destination text,
  starts_on date,
  ends_on date,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_members (
  trip_id uuid not null references public.trips(id) on delete cascade,
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  primary key (trip_id, family_member_id)
);

create table if not exists public.trip_tasks (
  id uuid primary key default gen_random_uuid(),
  trip_id uuid not null references public.trips(id) on delete cascade,
  title text not null,
  due_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.trip_task_assignees (
  trip_task_id uuid not null references public.trip_tasks(id) on delete cascade,
  family_member_id uuid not null references public.family_members(id) on delete cascade,
  primary key (trip_task_id, family_member_id)
);

create or replace function public.set_updated_at()
returns trigger language plpgsql set search_path = public
as $$ begin new.updated_at = now(); return new; end; $$;

create or replace function public.is_household_member(hid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from public.family_members
    where household_id = hid and user_id = auth.uid() and is_active
  );
$$;

create or replace function public.is_event_member(eid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_household_member(household_id) from public.calendar_events where id = eid; $$;

create or replace function public.is_todo_member(tid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_household_member(household_id) from public.todos where id = tid; $$;

create or replace function public.is_chore_member(cid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_household_member(household_id) from public.chores where id = cid; $$;

create or replace function public.is_trip_member(tid uuid)
returns boolean language sql stable security definer set search_path = public
as $$ select public.is_household_member(household_id) from public.trips where id = tid; $$;

create or replace function public.is_trip_task_member(ttid uuid)
returns boolean language sql stable security definer set search_path = public
as $$
  select public.is_trip_member(trip_id) from public.trip_tasks where id = ttid;
$$;

create trigger set_households_updated_at before update on public.households for each row execute function public.set_updated_at();
create trigger set_family_members_updated_at before update on public.family_members for each row execute function public.set_updated_at();
create trigger set_calendar_events_updated_at before update on public.calendar_events for each row execute function public.set_updated_at();
create trigger set_todos_updated_at before update on public.todos for each row execute function public.set_updated_at();
create trigger set_chores_updated_at before update on public.chores for each row execute function public.set_updated_at();
create trigger set_trips_updated_at before update on public.trips for each row execute function public.set_updated_at();
create trigger set_trip_tasks_updated_at before update on public.trip_tasks for each row execute function public.set_updated_at();

alter table public.households enable row level security;
alter table public.family_members enable row level security;
alter table public.calendar_events enable row level security;
alter table public.calendar_event_assignees enable row level security;
alter table public.todos enable row level security;
alter table public.todo_assignees enable row level security;
alter table public.chores enable row level security;
alter table public.chore_assignees enable row level security;
alter table public.chore_completions enable row level security;
alter table public.trips enable row level security;
alter table public.trip_members enable row level security;
alter table public.trip_tasks enable row level security;
alter table public.trip_task_assignees enable row level security;

create policy "household members manage households" on public.households for all using (public.is_household_member(id)) with check (public.is_household_member(id));
create policy "household members manage family members" on public.family_members for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household members manage events" on public.calendar_events for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household members manage event assignees" on public.calendar_event_assignees for all using (public.is_event_member(event_id)) with check (public.is_event_member(event_id));
create policy "household members manage todos" on public.todos for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household members manage todo assignees" on public.todo_assignees for all using (public.is_todo_member(todo_id)) with check (public.is_todo_member(todo_id));
create policy "household members manage chores" on public.chores for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household members manage chore assignees" on public.chore_assignees for all using (public.is_chore_member(chore_id)) with check (public.is_chore_member(chore_id));
create policy "household members manage chore completions" on public.chore_completions for all using (public.is_chore_member(chore_id)) with check (public.is_chore_member(chore_id));
create policy "household members manage trips" on public.trips for all using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
create policy "household members manage trip members" on public.trip_members for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "household members manage trip tasks" on public.trip_tasks for all using (public.is_trip_member(trip_id)) with check (public.is_trip_member(trip_id));
create policy "household members manage trip task assignees" on public.trip_task_assignees for all using (public.is_trip_task_member(trip_task_id)) with check (public.is_trip_task_member(trip_task_id));
