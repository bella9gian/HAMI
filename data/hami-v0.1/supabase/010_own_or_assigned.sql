-- HAMI per-user visibility.
-- Changes the model from "any household member sees everything" to
-- "you see an item only if you created it OR you're assigned/added to it".
-- Fully symmetric — there is no admin override.
--
-- Defensive: feature tables that don't exist in this project (e.g. beauty,
-- habits, photos, if their migrations were never run) are skipped, not errored.
-- households and family_members stay household-scoped so people can still be
-- picked as assignees and shown by name.

-- ---------------------------------------------------------------------------
-- 0. Ownership columns for the two core tables that never had one.
-- ---------------------------------------------------------------------------
alter table public.trips        add column if not exists created_by uuid references public.family_members(id) on delete set null;
alter table public.menu_entries add column if not exists created_by uuid references public.family_members(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 1. Helpers.
-- ---------------------------------------------------------------------------
create or replace function public.my_member_ids()
returns setof uuid language sql stable security definer set search_path = public
as $$ select id from public.family_members where user_id = auth.uid() and is_active; $$;

create or replace function public._fallback_owner(hid uuid)
returns uuid language sql stable set search_path = public
as $$
  select coalesce(
    (select id from public.family_members where household_id = hid and first_name ilike 'bella' and user_id is not null limit 1),
    (select id from public.family_members where household_id = hid order by created_at limit 1)
  );
$$;

-- Backfill orphaned owners on the core tables (present in every project).
update public.calendar_events set created_by = public._fallback_owner(household_id) where created_by is null;
update public.todos           set created_by = public._fallback_owner(household_id) where created_by is null;
update public.chores          set created_by = public._fallback_owner(household_id) where created_by is null;
update public.shopping_items  set created_by = public._fallback_owner(household_id) where created_by is null;
update public.recipes         set created_by = public._fallback_owner(household_id) where created_by is null;
update public.menu_entries    set created_by = public._fallback_owner(household_id) where created_by is null;
update public.supplements     set created_by = public._fallback_owner(household_id) where created_by is null;
update public.trips           set created_by = public._fallback_owner(household_id) where created_by is null;

-- Parent-visibility predicates (used by child tables so they follow the parent).
create or replace function public.can_see_event(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.calendar_events e
    where e.id = eid and public.is_household_member(e.household_id)
      and ( e.created_by in (select public.my_member_ids())
         or exists (select 1 from public.calendar_event_assignees a
                    where a.event_id = e.id and a.family_member_id in (select public.my_member_ids())) )
  );
$$;

create or replace function public.can_see_todo(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.todos t
    where t.id = tid and public.is_household_member(t.household_id)
      and ( t.created_by in (select public.my_member_ids())
         or exists (select 1 from public.todo_assignees a
                    where a.todo_id = t.id and a.family_member_id in (select public.my_member_ids())) )
  );
$$;

create or replace function public.can_see_chore(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.chores c
    where c.id = cid and public.is_household_member(c.household_id)
      and ( c.created_by in (select public.my_member_ids())
         or exists (select 1 from public.chore_assignees a
                    where a.chore_id = c.id and a.family_member_id in (select public.my_member_ids())) )
  );
$$;

create or replace function public.can_see_trip(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.trips t
    where t.id = tid and public.is_household_member(t.household_id)
      and ( t.created_by in (select public.my_member_ids())
         or exists (select 1 from public.trip_members m
                    where m.trip_id = t.id and m.family_member_id in (select public.my_member_ids())) )
  );
$$;

create or replace function public.can_see_trip_task(ttid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_see_trip(trip_id) from public.trip_tasks where id = ttid;
$$;

-- ---------------------------------------------------------------------------
-- 2. Assignable items (core, always present): creator OR anyone assigned.
-- ---------------------------------------------------------------------------
drop policy if exists "household members manage events" on public.calendar_events;
drop policy if exists "own or assigned events" on public.calendar_events;
create policy "own or assigned events" on public.calendar_events for all
  using (public.is_household_member(household_id) and (
    created_by in (select public.my_member_ids())
    or exists (select 1 from public.calendar_event_assignees a where a.event_id = calendar_events.id and a.family_member_id in (select public.my_member_ids()))))
  with check (public.is_household_member(household_id) and (
    created_by in (select public.my_member_ids())
    or exists (select 1 from public.calendar_event_assignees a where a.event_id = calendar_events.id and a.family_member_id in (select public.my_member_ids()))));

drop policy if exists "household members manage event assignees" on public.calendar_event_assignees;
drop policy if exists "assignees of visible events" on public.calendar_event_assignees;
create policy "assignees of visible events" on public.calendar_event_assignees for all
  using (public.can_see_event(event_id)) with check (public.can_see_event(event_id));

drop policy if exists "household members manage todos" on public.todos;
drop policy if exists "own or assigned todos" on public.todos;
create policy "own or assigned todos" on public.todos for all
  using (public.is_household_member(household_id) and (
    created_by in (select public.my_member_ids())
    or exists (select 1 from public.todo_assignees a where a.todo_id = todos.id and a.family_member_id in (select public.my_member_ids()))))
  with check (public.is_household_member(household_id) and (
    created_by in (select public.my_member_ids())
    or exists (select 1 from public.todo_assignees a where a.todo_id = todos.id and a.family_member_id in (select public.my_member_ids()))));

drop policy if exists "household members manage todo assignees" on public.todo_assignees;
drop policy if exists "assignees of visible todos" on public.todo_assignees;
create policy "assignees of visible todos" on public.todo_assignees for all
  using (public.can_see_todo(todo_id)) with check (public.can_see_todo(todo_id));

drop policy if exists "household members manage chores" on public.chores;
drop policy if exists "own or assigned chores" on public.chores;
create policy "own or assigned chores" on public.chores for all
  using (public.is_household_member(household_id) and (
    created_by in (select public.my_member_ids())
    or exists (select 1 from public.chore_assignees a where a.chore_id = chores.id and a.family_member_id in (select public.my_member_ids()))))
  with check (public.is_household_member(household_id) and (
    created_by in (select public.my_member_ids())
    or exists (select 1 from public.chore_assignees a where a.chore_id = chores.id and a.family_member_id in (select public.my_member_ids()))));

drop policy if exists "household members manage chore assignees" on public.chore_assignees;
drop policy if exists "assignees of visible chores" on public.chore_assignees;
create policy "assignees of visible chores" on public.chore_assignees for all
  using (public.can_see_chore(chore_id)) with check (public.can_see_chore(chore_id));

drop policy if exists "household members manage chore completions" on public.chore_completions;
drop policy if exists "completions of visible chores" on public.chore_completions;
create policy "completions of visible chores" on public.chore_completions for all
  using (public.can_see_chore(chore_id)) with check (public.can_see_chore(chore_id));

-- ---------------------------------------------------------------------------
-- 3. Trips (core): creator OR trip members.
-- ---------------------------------------------------------------------------
drop policy if exists "household members manage trips" on public.trips;
drop policy if exists "own or member trips" on public.trips;
create policy "own or member trips" on public.trips for all
  using (public.is_household_member(household_id) and (
    created_by in (select public.my_member_ids())
    or exists (select 1 from public.trip_members m where m.trip_id = trips.id and m.family_member_id in (select public.my_member_ids()))))
  with check (public.is_household_member(household_id) and (
    created_by in (select public.my_member_ids())
    or exists (select 1 from public.trip_members m where m.trip_id = trips.id and m.family_member_id in (select public.my_member_ids()))));

drop policy if exists "household members manage trip members" on public.trip_members;
drop policy if exists "members of visible trips" on public.trip_members;
create policy "members of visible trips" on public.trip_members for all
  using (public.can_see_trip(trip_id)) with check (public.can_see_trip(trip_id));

drop policy if exists "household members manage trip tasks" on public.trip_tasks;
drop policy if exists "tasks of visible trips" on public.trip_tasks;
create policy "tasks of visible trips" on public.trip_tasks for all
  using (public.can_see_trip(trip_id)) with check (public.can_see_trip(trip_id));

drop policy if exists "household members manage trip task assignees" on public.trip_task_assignees;
drop policy if exists "assignees of visible trip tasks" on public.trip_task_assignees;
create policy "assignees of visible trip tasks" on public.trip_task_assignees for all
  using (public.can_see_trip_task(trip_task_id)) with check (public.can_see_trip_task(trip_task_id));

-- ---------------------------------------------------------------------------
-- 4. Creator-only lists (core, always present).
-- ---------------------------------------------------------------------------
drop policy if exists "household members manage shopping items" on public.shopping_items;
drop policy if exists "own shopping items" on public.shopping_items;
create policy "own shopping items" on public.shopping_items for all
  using (public.is_household_member(household_id) and created_by in (select public.my_member_ids()))
  with check (public.is_household_member(household_id) and created_by in (select public.my_member_ids()));

drop policy if exists "household members manage recipes" on public.recipes;
drop policy if exists "own recipes" on public.recipes;
create policy "own recipes" on public.recipes for all
  using (public.is_household_member(household_id) and created_by in (select public.my_member_ids()))
  with check (public.is_household_member(household_id) and created_by in (select public.my_member_ids()));

drop policy if exists "household members manage menu" on public.menu_entries;
drop policy if exists "own menu" on public.menu_entries;
create policy "own menu" on public.menu_entries for all
  using (public.is_household_member(household_id) and created_by in (select public.my_member_ids()))
  with check (public.is_household_member(household_id) and created_by in (select public.my_member_ids()));

drop policy if exists "household members manage supplements" on public.supplements;
drop policy if exists "own supplements" on public.supplements;
create policy "own supplements" on public.supplements for all
  using (public.is_household_member(household_id) and created_by in (select public.my_member_ids()))
  with check (public.is_household_member(household_id) and created_by in (select public.my_member_ids()));

-- ---------------------------------------------------------------------------
-- 5. Optional feature tables — applied only if they exist in this project.
-- ---------------------------------------------------------------------------
do $$
begin
  if to_regclass('public.beauty_items') is not null then
    update public.beauty_items set created_by = public._fallback_owner(household_id) where created_by is null;
    drop policy if exists "household members manage beauty items" on public.beauty_items;
    drop policy if exists "own beauty items" on public.beauty_items;
    create policy "own beauty items" on public.beauty_items for all
      using (public.is_household_member(household_id) and created_by in (select public.my_member_ids()))
      with check (public.is_household_member(household_id) and created_by in (select public.my_member_ids()));
  end if;

  if to_regclass('public.habits') is not null then
    create or replace function public.can_see_habit(hid uuid)
    returns boolean language sql stable security definer set search_path = public as $b$
      select exists (
        select 1 from public.habits h
        where h.id = hid and public.is_household_member(h.household_id)
          and h.created_by in (select public.my_member_ids())
      );
    $b$;
    update public.habits set created_by = public._fallback_owner(household_id) where created_by is null;
    drop policy if exists "household members manage habits" on public.habits;
    drop policy if exists "own habits" on public.habits;
    create policy "own habits" on public.habits for all
      using (public.is_household_member(household_id) and created_by in (select public.my_member_ids()))
      with check (public.is_household_member(household_id) and created_by in (select public.my_member_ids()));

    if to_regclass('public.habit_logs') is not null then
      drop policy if exists "household members manage habit logs" on public.habit_logs;
      drop policy if exists "logs of own habits" on public.habit_logs;
      create policy "logs of own habits" on public.habit_logs for all
        using (public.can_see_habit(habit_id)) with check (public.can_see_habit(habit_id));
    end if;
  end if;

  if to_regclass('public.photos') is not null then
    update public.photos set created_by = public._fallback_owner(household_id) where created_by is null;
    drop policy if exists "household members manage photos" on public.photos;
    drop policy if exists "own photos" on public.photos;
    create policy "own photos" on public.photos for all
      using (public.is_household_member(household_id) and created_by in (select public.my_member_ids()))
      with check (public.is_household_member(household_id) and created_by in (select public.my_member_ids()));

    drop policy if exists "household reads photo files" on storage.objects;
    drop policy if exists "own reads photo files" on storage.objects;
    create policy "own reads photo files" on storage.objects for select to authenticated
      using (bucket_id = 'photos' and exists (
        select 1 from public.photos p
        where p.storage_path = name and p.created_by in (select public.my_member_ids())));
  end if;
end $$;

-- ---------------------------------------------------------------------------
drop function if exists public._fallback_owner(uuid);
