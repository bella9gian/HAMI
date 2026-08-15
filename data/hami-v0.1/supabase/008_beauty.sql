-- HAMI beauty items (combined skincare + makeup, organized by category).
-- Run in the HAMI Supabase project (SQL editor).

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
create trigger set_beauty_items_updated_at before update on public.beauty_items for each row execute function public.set_updated_at();
create policy "household members manage beauty items" on public.beauty_items for all
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
