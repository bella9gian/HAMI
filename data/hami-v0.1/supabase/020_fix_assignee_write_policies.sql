-- Fix "new row violates row-level security policy for table
-- calendar_event_assignees" (and the todo/chore equivalents).
--
-- Saving an event/todo/chore deletes all assignee rows then re-inserts them.
-- The old assignee policy used can_see_* (creator OR assigned), so a non-creator
-- editor briefly lost access after the delete and the re-insert was rejected.
--
-- Scope the assignee JOIN tables to household membership instead, via
-- SECURITY DEFINER helpers that read the parent's household without triggering
-- the parent's RLS. The parent event/todo/chore rows stay private (their
-- policies are unchanged, and they read assignees through their own definer
-- helpers), so this only makes the who-is-assigned join manageable by any
-- household member.

create or replace function public.event_in_my_household(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_household_member((select household_id from public.calendar_events where id = eid));
$$;
create or replace function public.todo_in_my_household(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_household_member((select household_id from public.todos where id = tid));
$$;
create or replace function public.chore_in_my_household(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.is_household_member((select household_id from public.chores where id = cid));
$$;

do $$
declare r record; t text;
begin
  foreach t in array array['calendar_event_assignees','todo_assignees','chore_assignees'] loop
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "manage event assignees" on public.calendar_event_assignees for all
  using (public.event_in_my_household(event_id)) with check (public.event_in_my_household(event_id));

create policy "manage todo assignees" on public.todo_assignees for all
  using (public.todo_in_my_household(todo_id)) with check (public.todo_in_my_household(todo_id));

create policy "manage chore assignees" on public.chore_assignees for all
  using (public.chore_in_my_household(chore_id)) with check (public.chore_in_my_household(chore_id));
