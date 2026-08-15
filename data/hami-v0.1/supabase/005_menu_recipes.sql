-- HAMI recipes + weekly menu (meal planning).
-- Run in the HAMI Supabase project (SQL editor). Reuses set_updated_at() and
-- is_household_member() from 001_schema.sql.

create table if not exists public.recipes (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  category text,
  ingredients text,
  instructions text,
  created_by uuid references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.recipes enable row level security;
create trigger set_recipes_updated_at before update on public.recipes for each row execute function public.set_updated_at();
create policy "household members manage recipes" on public.recipes for all
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

create table if not exists public.menu_entries (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  on_date date not null,
  meal text not null, -- breakfast | lunch | dinner | snack
  recipe_id uuid references public.recipes(id) on delete set null,
  title text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.menu_entries enable row level security;
create trigger set_menu_entries_updated_at before update on public.menu_entries for each row execute function public.set_updated_at();
create policy "household members manage menu" on public.menu_entries for all
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

create index if not exists menu_entries_household_date_idx on public.menu_entries (household_id, on_date);
