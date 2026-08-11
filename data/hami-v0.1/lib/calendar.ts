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

type EventRow = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  location: string | null;
  description: string | null;
  all_day: boolean;
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
  assignees: Array<Pick<FamilyMember, 'id' | 'display_name' | 'first_name'>>;
};

const eventSelect = `
  id, title, starts_at, ends_at, location, description, all_day,
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
    assignees: (row.calendar_event_assignees ?? []).flatMap((assignee) => assignee.family_members ?? []),
  };
}

export async function loadEventsForDate(date: string) {
  const { start, end } = localDayRange(date);
  const { data, error } = await supabase
    .from('calendar_events')
    .select(eventSelect)
    .gte('starts_at', start)
    .lt('starts_at', end)
    .order('starts_at');

  if (error) throw error;
  return ((data ?? []) as unknown as EventRow[]).map(mapEvent);
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
}: {
  householdId: string;
  title: string;
  date: string;
  startTime: string;
  endTime: string;
  allDay: boolean;
  location: string;
  description: string;
  assigneeIds: string[];
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
      title: title.trim(),
      starts_at: startsAt.toISOString(),
      ends_at: endsAt?.toISOString() ?? null,
      location: location.trim() || null,
      description: description.trim() || null,
      all_day: allDay,
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
