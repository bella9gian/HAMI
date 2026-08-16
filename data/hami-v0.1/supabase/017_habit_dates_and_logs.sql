-- HAMI: habit start/end dates + make streak logging reliable.
-- Run in the HAMI Supabase project (SQL editor) before deploying.

-- Start / end dates for a habit.
alter table public.habits add column if not exists start_date date;
alter table public.habits add column if not exists end_date date;

-- One log row per habit per day (harmless if it already exists as a constraint).
create unique index if not exists habit_logs_habit_date_uidx on public.habit_logs (habit_id, on_date);

-- Logs are gated by can_see_habit(), which requires the habit to have an owner.
-- Backfill any habit with no created_by so its logs can be written and read.
update public.habits set created_by = (
  select fm.id from public.family_members fm
  where fm.household_id = habits.household_id and fm.first_name ilike 'bella' and fm.user_id is not null
  limit 1
) where created_by is null;

-- Ensure the helper + log policy exist (idempotent).
create or replace function public.can_see_habit(hid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.habits h
    where h.id = hid and public.is_household_member(h.household_id)
      and h.created_by in (select public.my_member_ids())
  );
$$;

alter table public.habit_logs enable row level security;
drop policy if exists "household members manage habit logs" on public.habit_logs;
drop policy if exists "logs of own habits" on public.habit_logs;
create policy "logs of own habits" on public.habit_logs for all
  using (public.can_see_habit(habit_id)) with check (public.can_see_habit(habit_id));
