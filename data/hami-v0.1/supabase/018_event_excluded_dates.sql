-- Support deleting a single occurrence of a recurring event: a list of dates
-- (YYYY-MM-DD) to skip when expanding the series. Run before deploying.
alter table public.calendar_events
  add column if not exists excluded_dates text[] not null default '{}';
