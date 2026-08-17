-- Fix "Unable to add trips": ensure trips (and their child tables) have a
-- working creator-or-member RLS policy and the created_by column, clearing any
-- leftover/broken policy that was blocking inserts.

alter table public.trips add column if not exists created_by uuid references public.family_members(id) on delete set null;

create or replace function public.me_trip_member(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trip_members m where m.trip_id = tid and m.family_member_id in (select public.my_member_ids()));
$$;
create or replace function public.can_see_trip(tid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.trips t
    where t.id = tid and public.is_household_member(t.household_id)
      and (t.created_by in (select public.my_member_ids()) or public.me_trip_member(t.id)));
$$;
create or replace function public.can_see_trip_task(ttid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select public.can_see_trip(trip_id) from public.trip_tasks where id = ttid;
$$;

do $$
declare r record; t text;
begin
  foreach t in array array['trips','trip_members','trip_tasks','trip_task_assignees'] loop
    for r in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
      execute format('drop policy if exists %I on public.%I', r.policyname, t);
    end loop;
    execute format('alter table public.%I enable row level security', t);
  end loop;
end $$;

create policy "own or member trips" on public.trips for all
  using (public.is_household_member(household_id) and (created_by in (select public.my_member_ids()) or public.me_trip_member(id)))
  with check (public.is_household_member(household_id) and (created_by in (select public.my_member_ids()) or public.me_trip_member(id)));

create policy "members of visible trips" on public.trip_members for all
  using (public.can_see_trip(trip_id)) with check (public.can_see_trip(trip_id));

create policy "tasks of visible trips" on public.trip_tasks for all
  using (public.can_see_trip(trip_id)) with check (public.can_see_trip(trip_id));

create policy "assignees of visible trip tasks" on public.trip_task_assignees for all
  using (public.can_see_trip_task(trip_task_id)) with check (public.can_see_trip_task(trip_task_id));
