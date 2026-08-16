-- HAMI: habit frequency + supplement inventory/administering.
-- Run in the HAMI Supabase project (SQL editor) BEFORE deploying the app build.
-- Assumes 010/011 already ran (my_member_ids(), is_household_member()).

-- ---------- Habits: frequency + weekly target ----------
alter table public.habits add column if not exists frequency text not null default 'daily';
alter table public.habits add column if not exists weekly_target int;
do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'habits_frequency_chk') then
    alter table public.habits add constraint habits_frequency_chk check (frequency in ('daily', 'weekly'));
  end if;
end $$;

-- ---------- Supplements: inventory ----------
alter table public.supplements add column if not exists inventory_count int;
alter table public.supplements add column if not exists low_threshold int;

-- ---------- Supplement administering log ----------
create table if not exists public.supplement_logs (
  id uuid primary key default gen_random_uuid(),
  supplement_id uuid not null references public.supplements(id) on delete cascade,
  taken_at timestamptz not null default now(),
  quantity int not null default 1,
  created_by uuid references public.family_members(id) on delete set null
);
alter table public.supplement_logs enable row level security;
create index if not exists supplement_logs_supp_idx on public.supplement_logs (supplement_id, taken_at);

-- Visibility follows the parent supplement (creator-only), via a SECURITY
-- DEFINER helper so the log policy never triggers the supplement policy.
create or replace function public.can_see_supplement(sid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.supplements s
    where s.id = sid and public.is_household_member(s.household_id)
      and s.created_by in (select public.my_member_ids())
  );
$$;

drop policy if exists "logs of own supplements" on public.supplement_logs;
create policy "logs of own supplements" on public.supplement_logs for all
  using (public.can_see_supplement(supplement_id)) with check (public.can_see_supplement(supplement_id));
