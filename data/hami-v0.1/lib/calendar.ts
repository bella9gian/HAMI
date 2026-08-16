import { supabase } from '@/lib/supabase';

export type FamilyMember = {
  id: string;
  display_name: string;
  first_name: string | null;
  relationship: string | null;
  user_id: string | null;
};

type EventAssigneeRow = {
  family_member_id: string;
  family_members: Array<Pick<FamilyMember, 'id' | 'display_name' | 'first_name'>> | null;
};

export type Recurrence = 'none' | 'daily' | 'weekly' | 'monthly';
export const RECURRENCE_OPTIONS: { value: Recurrence; label: string }[] = [
  { value: 'none', label: 'Does not repeat' },
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
];

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  all_day: boolean;
  recurrence: Recurrence | null;
  recurrence_end: string | null;
  calendar_event_assignees: EventAssigneeRow[] | null;
};

export type CalendarEvent = {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  description: string | null;
  allDay: boolean;
  recurrence: Recurrence;
  recurrenceEnd: string | null;
  assignees: Array<Pick<FamilyMember, 'id' | 'display_name' | 'first_name'>>;
  // Set when this is a synthesized occurrence of a recurring series.
  isOccurrence?: boolean;
  seriesId?: string;
  seriesStartsAt?: string;
  seriesEndsAt?: string | null;
};

const eventSelect = `
  id, title, starts_at, ends_at, location, description, all_day, recurrence, recurrence_end,
  calendar_event_assignees (
    family_member_id,
    family_members (id, display_name, first_name)
  )
`;
const calendarChangeListeners = new Set<() => void>();

export function subscribeToCalendarChanges(listener: () => void) {
  calendarChangeListeners.add(listener);
  return () => { calendarChangeListeners.delete(listener); };
}

function notifyCalendarChanged() {
  calendarChangeListeners.forEach((listener) => listener());
}

function localDayRange(date: string) {
  const start = new Date(`${date}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

function mapEvent(row: EventRow): CalendarEvent {
  return {
    id: row.id,
    title: row.title,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    location: row.location,
    description: row.description,
    allDay: row.all_day,
    recurrence: row.recurrence ?? 'none',
    recurrenceEnd: row.recurrence_end,
    assignees: (row.calendar_event_assignees ?? []).flatMap((assignee) => assignee.family_members ?? []),
  };
}

// Does a recurring series with this start / rule land on the target day?
function occursOnKey(startsAt: string, recurrence: Recurrence, recurrenceEnd: string | null, dateKey: string): boolean {
  if (recurrence === 'none') return false;
  const startKey = toDateKey(new Date(startsAt));
  if (dateKey < startKey) return false;
  if (recurrenceEnd && dateKey > recurrenceEnd) return false;
  if (recurrence === 'daily') return true;
  const start = new Date(`${startKey}T12:00:00`);
  const target = new Date(`${dateKey}T12:00:00`);
  if (recurrence === 'weekly') return start.getDay() === target.getDay();
  if (recurrence === 'monthly') return start.getDate() === target.getDate();
  return false;
}

// Build the occurrence of a series on `dateKey`, preserving time-of-day + duration.
function occurrenceFor(event: CalendarEvent, dateKey: string): CalendarEvent {
  const start = new Date(event.startsAt);
  const end = event.endsAt ? new Date(event.endsAt) : null;
  const durationMs = end ? end.getTime() - start.getTime() : 0;
  const newStart = new Date(`${dateKey}T00:00:00`);
  newStart.setHours(start.getHours(), start.getMinutes(), 0, 0);
  const newEnd = end ? new Date(newStart.getTime() + durationMs) : null;
  return {
    ...event,
    id: `${event.id}::${dateKey}`,
    startsAt: newStart.toISOString(),
    endsAt: newEnd?.toISOString() ?? null,
    isOccurrence: true,
    seriesId: event.id,
    seriesStartsAt: event.startsAt,
    seriesEndsAt: event.endsAt,
  };
}

function eachDateKey(startKey: string, endKey: string): string[] {
  const keys: string[] = [];
  const cursor = new Date(`${startKey}T12:00:00`);
  const end = new Date(`${endKey}T12:00:00`);
  while (cursor <= end) { keys.push(toDateKey(cursor)); cursor.setDate(cursor.getDate() + 1); }
  return keys;
}

export async function loadEventsForDate(date: string) {
  const { start, end } = localDayRange(date);
  const [oneOffRes, recurringRes] = await Promise.all([
    supabase.from('calendar_events').select(eventSelect).gte('starts_at', start).lt('starts_at', end).order('starts_at'),
    supabase.from('calendar_events').select(eventSelect).neq('recurrence', 'none').lte('starts_at', end),
  ]);
  if (oneOffRes.error) throw oneOffRes.error;
  if (recurringRes.error) throw recurringRes.error;

  const oneOff = ((oneOffRes.data ?? []) as unknown as EventRow[]).map(mapEvent);
  const occurrences = ((recurringRes.data ?? []) as unknown as EventRow[])
    .map(mapEvent)
    // the series' own start day is already covered by the one-off query
    .filter((e) => toDateKey(new Date(e.startsAt)) !== date && occursOnKey(e.startsAt, e.recurrence, e.recurrenceEnd, date))
    .map((e) => occurrenceFor(e, date));

  return [...oneOff, ...occurrences].sort((a, b) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0));
}

export async function loadEventsForRange(startKey: string, endKey: string): Promise<Record<string, CalendarEvent[]>> {
  const startIso = new Date(`${startKey}T00:00:00`).toISOString();
  const endIso = new Date(`${endKey}T23:59:59`).toISOString();
  const [oneOffRes, recurringRes] = await Promise.all([
    supabase.from('calendar_events').select(eventSelect).gte('starts_at', startIso).lte('starts_at', endIso).order('starts_at'),
    supabase.from('calendar_events').select(eventSelect).neq('recurrence', 'none').lte('starts_at', endIso),
  ]);
  if (oneOffRes.error) throw oneOffRes.error;
  if (recurringRes.error) throw recurringRes.error;

  const out: Record<string, CalendarEvent[]> = {};
  const push = (key: string, ev: CalendarEvent) => { (out[key] ??= []).push(ev); };
  for (const row of (oneOffRes.data ?? []) as unknown as EventRow[]) { const ev = mapEvent(row); push(toDateKey(new Date(ev.startsAt)), ev); }
  const range = eachDateKey(startKey, endKey);
  for (const row of (recurringRes.data ?? []) as unknown as EventRow[]) {
    const ev = mapEvent(row);
    const startDay = toDateKey(new Date(ev.startsAt));
    for (const key of range) {
      if (key !== startDay && occursOnKey(ev.startsAt, ev.recurrence, ev.recurrenceEnd, key)) push(key, occurrenceFor(ev, key));
    }
  }
  for (const key of Object.keys(out)) out[key].sort((a, b) => (a.startsAt < b.startsAt ? -1 : a.startsAt > b.startsAt ? 1 : 0));
  return out;
}

export async function loadEventDays(startKey: string, endKey: string): Promise<string[]> {
  const startIso = new Date(`${startKey}T00:00:00`).toISOString();
  const endIso = new Date(`${endKey}T23:59:59`).toISOString();
  const [oneOffRes, recurringRes] = await Promise.all([
    supabase.from('calendar_events').select('starts_at').gte('starts_at', startIso).lte('starts_at', endIso),
    supabase.from('calendar_events').select('starts_at, recurrence, recurrence_end').neq('recurrence', 'none').lte('starts_at', endIso),
  ]);
  if (oneOffRes.error) throw oneOffRes.error;
  if (recurringRes.error) throw recurringRes.error;

  const days = new Set<string>();
  for (const row of (oneOffRes.data ?? []) as Array<{ starts_at: string }>) days.add(toDateKey(new Date(row.starts_at)));
  const range = eachDateKey(startKey, endKey);
  for (const row of (recurringRes.data ?? []) as Array<{ starts_at: string; recurrence: Recurrence | null; recurrence_end: string | null }>) {
    for (const key of range) {
      if (occursOnKey(row.starts_at, row.recurrence ?? 'none', row.recurrence_end, key)) days.add(key);
    }
  }
  return [...days];
}

export async function createCalendarEvent({
  householdId,
  title,
  date,
  startTime,
  endTime,
  allDay,
  location,
  description,
  assigneeIds,
  recurrence = 'none',
  recurrenceEnd = null,
  createdBy,
}: {
  householdId: string;
  createdBy: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  description: string;
  assigneeIds: string[];
  recurrence?: Recurrence;
  recurrenceEnd?: string | null;
}) {
  const startsAt = new Date(`${date}T${allDay ? '00:00' : startTime}:00`);
  const endsAt = allDay ? null : new Date(`${date}T${endTime}:00`);

  if (Number.isNaN(startsAt.valueOf()) || (!allDay && Number.isNaN(endsAt?.valueOf() ?? NaN))) {
    throw new Error('Use YYYY-MM-DD for the date and HH:MM for times.');
  }
  if (endsAt && endsAt <= startsAt) {
    throw new Error('End time must be after start time.');
  }

  const { data: event, error: eventError } = await supabase
    .from('calendar_events')
    .insert({
      household_id: householdId,
      created_by: createdBy,
      title: title.trim(),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt?.toISOString() ?? null,
      location: location.trim() || null,
      description: description.trim() || null,
      all_day: allDay,
      recurrence,
      recurrence_end: recurrence === 'none' ? null : (recurrenceEnd || null),
    })
    .select(eventSelect)
    .single();

  if (eventError) throw eventError;

  if (assigneeIds.length) {
    const { error: assigneeError } = await supabase
      .from('calendar_event_assignees')
      .insert(assigneeIds.map((family_member_id) => ({ event_id: event.id, family_member_id })));

    if (assigneeError) {
      await supabase.from('calendar_events').delete().eq('id', event.id);
      throw assigneeError;
    }
  }

  notifyCalendarChanged();
  return event.id;
}

export async function updateCalendarEvent({ id, ...values }: Parameters<typeof createCalendarEvent>[0] & { id: string }) {
  const startsAt = new Date(`${values.date}T${values.allDay ? '00:00' : values.startTime}:00`);
  const endsAt = values.allDay ? null : new Date(`${values.date}T${values.endTime}:00`);
  if (Number.isNaN(startsAt.valueOf()) || (!values.allDay && Number.isNaN(endsAt?.valueOf() ?? NaN))) throw new Error('Use YYYY-MM-DD for the date and HH:MM for times.');
  if (endsAt && endsAt <= startsAt) throw new Error('End time must be after start time.');

  const { error: eventError } = await supabase.from('calendar_events').update({
    title: values.title.trim(), starts_at: startsAt.toISOString(), ends_at: endsAt?.toISOString() ?? null,
    all_day: values.allDay, location: values.location.trim() || null, description: values.description.trim() || null,
    recurrence: values.recurrence ?? 'none', recurrence_end: (values.recurrence ?? 'none') === 'none' ? null : (values.recurrenceEnd || null),
  }).eq('id', id);
  if (eventError) throw eventError;

  const { error: removeError } = await supabase.from('calendar_event_assignees').delete().eq('event_id', id);
  if (removeError) throw removeError;
  if (values.assigneeIds.length) {
    const { error: assigneeError } = await supabase.from('calendar_event_assignees').insert(values.assigneeIds.map((family_member_id) => ({ event_id: id, family_member_id })));
    if (assigneeError) throw assigneeError;
  }
  notifyCalendarChanged();
}

export async function deleteCalendarEvent(id: string) {
  const { error } = await supabase.from('calendar_events').delete().eq('id', id);
  if (error) throw error;
  notifyCalendarChanged();
}

export function toDateKey(value = new Date()) {
  const offset = value.getTimezoneOffset() * 60_000;
  return new Date(value.getTime() - offset).toISOString().slice(0, 10);
}

export function formatEventTime(event: CalendarEvent) {
  if (event.allDay) return 'All day';
  return new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(event.startsAt));
}
