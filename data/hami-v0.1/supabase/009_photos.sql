-- HAMI photos: a private "photos" storage bucket + metadata table.
-- Run in the HAMI Supabase project (SQL editor). Files are stored under
-- <household_id>/<uuid>.<ext>, and access is scoped to household members.

insert into storage.buckets (id, name, public)
values ('photos', 'photos', false)
on conflict (id) do nothing;

create table if not exists public.photos (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references public.households(id) on delete cascade,
  storage_path text not null,
  caption text,
  created_by uuid references public.family_members(id) on delete set null,
  created_at timestamptz not null default now()
);

alter table public.photos enable row level security;
drop policy if exists "household members manage photos" on public.photos;
create policy "household members manage photos" on public.photos for all
  using (public.is_household_member(household_id)) with check (public.is_household_member(household_id));

-- Storage object policies: the first path segment is the household id.
drop policy if exists "household reads photo files" on storage.objects;
create policy "household reads photo files" on storage.objects for select to authenticated
  using (bucket_id = 'photos' and public.is_household_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "household writes photo files" on storage.objects;
create policy "household writes photo files" on storage.objects for insert to authenticated
  with check (bucket_id = 'photos' and public.is_household_member(((storage.foldername(name))[1])::uuid));

drop policy if exists "household deletes photo files" on storage.objects;
create policy "household deletes photo files" on storage.objects for delete to authenticated
  using (bucket_id = 'photos' and public.is_household_member(((storage.foldername(name))[1])::uuid));
