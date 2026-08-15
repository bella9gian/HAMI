-- HAMI supplements tracker.
-- Run in the HAMI Supabase project (SQL editor).

create table if not exists public.supplements (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  name text not null,
  dosage text,
  schedule text,
  notes text,
  is_active boolean not null default true,
  created_by uuid references public.family_members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.supplements enable row level security;
create trigger set_supplements_updated_at before update on public.supplements for each row execute function public.set_updated_at();
create policy "household members manage supplements" on public.supplements for all
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));
