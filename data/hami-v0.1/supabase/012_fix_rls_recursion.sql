-- Fix "infinite recursion detected in policy for relation ...".
-- The parent policies in 010 referenced their child assignee tables with an
-- inline subquery; the child policies reference the parent (can_see_*), so
-- under RLS the two relations trigger each other's policies -> recursion.
-- Route the assignee check through SECURITY DEFINER helpers (which bypass RLS),
-- so the parent policy no longer touches the child's RLS. Matches the
-- is_household_member pattern from 001.

create or replace function public.me_assigned_event(eid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.calendar_event_assignees a
                 where a.event_id = eid and a.family_member_id in (select public.my_member_ids()));
$$;
create or replace function public.me_assigned_todo(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.todo_assignees a
                 where a.todo_id = tid and a.family_member_id in (select public.my_member_ids()));
$$;
create or replace function public.me_assigned_chore(cid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.chore_assignees a
                 where a.chore_id = cid and a.family_member_id in (select public.my_member_ids()));
$$;
create or replace function public.me_trip_member(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trip_members m
                 where m.trip_id = tid and m.family_member_id in (select public.my_member_ids()));
$$;

drop policy if exists "own or assigned events" on public.calendar_events;
create policy "own or assigned events" on public.calendar_events for all
  using (public.is_household_member(household_id) and (created_by in (select public.my_member_ids()) or public.me_assigned_event(id)))
  with check (public.is_household_member(household_id) and (created_by in (select public.my_member_ids()) or public.me_assigned_event(id)));

drop policy if exists "own or assigned todos" on public.todos;
create policy "own or assigned todos" on public.todos for all
  using (public.is_household_member(household_id) and (created_by in (select public.my_member_ids()) or public.me_assigned_todo(id)))
  with check (public.is_household_member(household_id) and (created_by in (select public.my_member_ids()) or public.me_assigned_todo(id)));

drop policy if exists "own or assigned chores" on public.chores;
create policy "own or assigned chores" on public.chores for all
  using (public.is_household_member(household_id) and (created_by in (select public.my_member_ids()) or public.me_assigned_chore(id)))
  with check (public.is_household_member(household_id) and (created_by in (select public.my_member_ids()) or public.me_assigned_chore(id)));

drop policy if exists "own or member trips" on public.trips;
create policy "own or member trips" on public.trips for all
  using (public.is_household_member(household_id) and (created_by in (select public.my_member_ids()) or public.me_trip_member(id)))
  with check (public.is_household_member(household_id) and (created_by in (select public.my_member_ids()) or public.me_trip_member(id)));
