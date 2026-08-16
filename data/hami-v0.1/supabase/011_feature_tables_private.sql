-- HAMI: create the Habits, Beauty, and Photos feature tables with per-user
-- (creator-only) RLS from the start. Run in the HAMI Supabase project.
-- Replaces the household-wide 007/008/009 migrations, and assumes
-- 010_own_or_assigned.sql already ran (for public.my_member_ids()).

-- ---------- Habits ----------
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
drop trigger if exists set_habits_updated_at on public.habits;
create trigger set_habits_updated_at before update on public.habits for each row execute function public.set_updated_at();

create table if not exists public.habit_logs (
  id uuid primary key default gen_random_uuid(),
  habit_id uuid not null references public.habits(id) on delete cascade,
  on_date date not null,
  created_at timestamptz not null default now(),
  unique (habit_id, on_date)
);
alter table public.habit_logs enable row level security;

create or replace function public.can_see_habit(hid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.habits h
    where h.id = hid and public.is_household_member(h.household_id)
      and h.created_by in (select public.my_member_ids())
  );
$$;

drop policy if exists "household members manage habits" on public.habits;
drop policy if exists "own habits" on public.habits;
create policy "own habits" on public.habits for all
  using (public.is_household_member(household_id) and created_by in (select public.my_member_ids()))
  with check (public.is_household_member(household_id) and created_by in (select public.my_member_ids()));

drop policy if exists "household members manage habit logs" on public.habit_logs;
drop policy if exists "logs of own habits" on public.habit_logs;
create policy "logs of own habits" on public.habit_logs for all
  using (public.can_see_habit(habit_id)) with check (public.can_see_habit(habit_id));

-- ---------- Beauty ----------
create table if not exists public.beauty_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  category text,
  brand text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.beauty_items enable row level security;
drop trigger if exists set_beauty_items_updated_at on public.beauty_items;
create trigger set_beauty_items_updated_at before update on public.beauty_items for each row execute function public.set_updated_at();

drop policy if exists "household members manage beauty items" on public.beauty_items;
drop policy if exists "own beauty items" on public.beauty_items;
create policy "own beauty items" on public.beauty_items for all
  using (public.is_household_member(household_id) and created_by in (select public.my_member_ids()))
  with check (public.is_household_member(household_id) and created_by in (select public.my_member_ids()));

-- ---------- Photos ----------
insert into storage.buckets (id, name, public) values ('photos', 'photos', false)
on conflict (id) do nothing;

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  storage_path text not null,
  caption text,
  created_by uuid references public.family_members(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.photos enable row level security;

drop policy if exists "household members manage photos" on public.photos;
drop policy if exists "own photos" on public.photos;
create policy "own photos" on public.photos for all
  using (public.is_household_member(household_id) and created_by in (select public.my_member_ids()))
  with check (public.is_household_member(household_id) and created_by in (select public.my_member_ids()));

-- File objects: only the owner can read; uploads/deletes stay household-scoped by folder.
drop policy if exists "household reads photo files" on storage.objects;
drop policy if exists "own reads photo files" on storage.objects;
create policy "own reads photo files" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and exists (
    select 1 from public.photos p
    where p.storage_path = name and p.created_by in (select public.my_member_ids())));

drop policy if exists "household writes photo files" on storage.objects;
create policy "household writes photo files" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_household_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "household deletes photo files" on storage.objects;
create policy "household deletes photo files" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_household_member(((storage.foldername(name))[1])::uuid));
