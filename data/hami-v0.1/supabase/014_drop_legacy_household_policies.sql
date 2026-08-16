-- Fix: per-user visibility was being defeated by leftover household-wide
-- policies. The live project's original policies were named with different
-- casing/wording (e.g. "Household members manage calendar events") than the
-- drop statements in 010/012 targeted, so on calendar_events/todos/chores/etc.
-- the old permissive policy survived ALONGSIDE the new private one. Postgres
-- OR's permissive policies, so any household member saw everything.
--
-- Drop every remaining "Household members manage ..." policy EXCEPT on
-- households and family_members, which intentionally stay household-scoped so
-- members can still be listed and picked as assignees.
do $$
declare r record;
begin
  for r in
    select tablename, policyname
    from pg_policies
    where schemaname = 'public'
      and policyname ilike 'household members manage%'
      and tablename not in ('households', 'family_members')
  loop
    execute format('drop policy if exists %I on public.%I', r.policyname, r.tablename);
  end loop;
end $$;
