-- Recipes and the menu are shared across the whole household (no per-user
-- ownership), unlike the other reference lists. Revert them from creator-only
-- (015) back to household-wide read/write. Everything else stays private.
do $$
declare t text; r record;
begin
  foreach t in array array['recipes','menu_entries'] loop
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "shared recipes" on public.recipes for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));

create policy "shared menu" on public.menu_entries for all
  using (public.is_household_member(household_id))
  with check (public.is_household_member(household_id));
