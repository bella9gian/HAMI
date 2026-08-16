-- Fix: recipes / menu (and other reference lists) were still visible to the
-- whole household because a leftover permissive policy with a non-standard name
-- (not "Household members manage ...") survived the 014 cleanup. Postgres OR's
-- permissive policies, so it re-shared the table.
--
-- For each creator-only list, drop EVERY policy except the intended private one
-- (regardless of name), ensure RLS is on, and (re)create the creator-only
-- policy. Guarded by existence so missing feature tables are skipped.
do $$
declare
  tables text[][] := array[
    ['recipes','own recipes'],
    ['menu_entries','own menu'],
    ['supplements','own supplements'],
    ['shopping_items','own shopping items'],
    ['beauty_items','own beauty items'],
    ['habits','own habits'],
    ['photos','own photos']
  ];
  i int; t text; keep text; r record;
begin
  for i in 1 .. array_length(tables, 1) loop
    t := tables[i][1]; keep := tables[i][2];
    if to_regclass('public.' || t) is null then continue; end if;
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t and policyname <> keep loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
    execute format('drop policy if exists %I on public.%I', keep, t);
    execute format($f$create policy %I on public.%I for all using (public.is_household_member(household_id) and created_by in (select public.my_member_ids())) with check (public.is_household_member(household_id) and created_by in (select public.my_member_ids()))$f$, keep, t);
  end loop;
end $$;
