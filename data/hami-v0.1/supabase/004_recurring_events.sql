-- Recurring calendar events.
-- Run this in the HAMI Supabase project (SQL editor).
-- recurrence is one of: none | daily | weekly | monthly.
-- recurrence_end (optional) is the last date the series repeats through.

alter table public.calendar_events add column if not exists recurrence text not null default 'none';
alter table public.calendar_events add column if not exists recurrence_end date;
