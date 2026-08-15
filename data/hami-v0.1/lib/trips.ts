import { supabase } from '@/lib/supabase';

export type Trip = {
  id: string;
  name: string;
  destination: string | null;
  startsOn: string | null;
  endsOn: string | null;
  notes: string | null;
};

export type TripTask = {
  id: string;
  title: string;
  completed: boolean;
};

type TripRow = { id: string; name: string; destination: string | null; starts_on: string | null; ends_on: string | null; notes: string | null };
const tripSelect = 'id, name, destination, starts_on, ends_on, notes';
const mapTrip = (r: TripRow): Trip => ({ id: r.id, name: r.name, destination: r.destination, startsOn: r.starts_on, endsOn: r.ends_on, notes: r.notes });

export type TripInput = { name: string; destination?: string; startsOn?: string; endsOn?: string; notes?: string };
function tripColumns(input: TripInput) {
  const name = input.name.trim();
  if (!name) throw new Error('Add a trip name.');
  return {
    name,
    destination: input.destination?.trim() || null,
    starts_on: input.startsOn?.trim() || null,
    ends_on: input.endsOn?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export async function loadTrips(): Promise<Trip[]> {
  const { data, error } = await supabase.from('trips').select(tripSelect).order('starts_on', { ascending: true, nullsFirst: false });
  if (error) throw error;
  return ((data ?? []) as TripRow[]).map(mapTrip);
}

export async function addTrip(input: TripInput & { householdId: string }): Promise<void> {
  const { error } = await supabase.from('trips').insert({ household_id: input.householdId, ...tripColumns(input) });
  if (error) throw error;
}
export async function updateTrip(id: string, input: TripInput): Promise<void> {
  const { error } = await supabase.from('trips').update(tripColumns(input)).eq('id', id);
  if (error) throw error;
}
export async function deleteTrip(id: string): Promise<void> {
  const { error } = await supabase.from('trips').delete().eq('id', id);
  if (error) throw error;
}

type TaskRow = { id: string; title: string; completed_at: string | null };
export async function loadTripTasks(tripId: string): Promise<TripTask[]> {
  const { data, error } = await supabase.from('trip_tasks').select('id, title, completed_at').eq('trip_id', tripId).order('created_at');
  if (error) throw error;
  return ((data ?? []) as TaskRow[]).map((r) => ({ id: r.id, title: r.title, completed: !!r.completed_at }));
}
export async function addTripTask(tripId: string, title: string): Promise<void> {
  const trimmed = title.trim();
  if (!trimmed) return;
  const { error } = await supabase.from('trip_tasks').insert({ trip_id: tripId, title: trimmed });
  if (error) throw error;
}
export async function setTripTaskCompleted(id: string, completed: boolean): Promise<void> {
  const { error } = await supabase.from('trip_tasks').update({ completed_at: completed ? new Date().toISOString() : null }).eq('id', id);
  if (error) throw error;
}
export async function deleteTripTask(id: string): Promise<void> {
  const { error } = await supabase.from('trip_tasks').delete().eq('id', id);
  if (error) throw error;
}
