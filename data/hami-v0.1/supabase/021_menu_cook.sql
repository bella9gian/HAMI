-- Menu: who is preparing each meal (optional). Run before deploying.
alter table public.menu_entries
  add column if not exists cook_id uuid references public.family_members(id) on delete set null;
