-- HAMI habits + daily logs (for streaks).
-- Run in the HAMI Supabase project (SQL editor).

create table if not exists public.habits (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.habits enable row level security;
create trigger set_habits_updated_at before update on public.habits for each row execute function public.set_updated_at();
create policy "household members manage habits" on public.habits for all
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  on_date date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, on_date)
);

alter table public.habit_logs enable row level security;
create policy "household members manage habit logs" on public.habit_logs for all
  using (exists (select 1 from public.habits h where h.id = habit_id and public.is_household_member(h.household_id)))
  with check (exists (select 1 from public.habits h where h.id = habit_id and public.is_household_member(h.household_id)));
