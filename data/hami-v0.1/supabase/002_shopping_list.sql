-- HAMI shopping list.
-- Run this in the HAMI Supabase project (SQL editor). It reuses the household
-- model, the set_updated_at() trigger function, and the is_household_member()
-- helper defined in 001_schema.sql.

create table if not exists public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  quantity text,
  category text,
  is_purchased boolean not null default false,
  purchased_at timestamptz,
  created_by uuid references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.shopping_items enable row level security;

create trigger set_shopping_items_updated_at
  before update on public.shopping_items
  for each row execute function public.set_updated_at();

create policy "household members manage shopping items"
  on public.shopping_items for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
