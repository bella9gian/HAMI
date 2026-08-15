import { toDateKey } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';

export type Habit = {
  id: string;
  name: string;
  notes: string | null;
  isActive: boolean;
};

type Row = { id: string; name: string; notes: string | null; is_active: boolean };
const select = 'id, name, notes, is_active';
const map = (r: Row): Habit => ({ id: r.id, name: r.name, notes: r.notes, isActive: r.is_active });

export type HabitInput = { name: string; notes?: string; isActive?: boolean };
function toColumns(input: HabitInput) {
  const name = input.name.trim();
  if (!name) throw new Error('Add a habit name.');
  return { name, notes: input.notes?.trim() || null, is_active: input.isActive ?? true };
}

export async function loadHabits(): Promise<Habit[]> {
  const { data, error } = await supabase.from('habits').select(select).order('is_active', { ascending: false }).order('name');
  if (error) throw error;
  return ((data ?? []) as Row[]).map(map);
}

export async function addHabit(input: HabitInput & { householdId: string; createdBy: string }): Promise<void> {
  const { error } = await supabase.from('habits').insert({ household_id: input.householdId, created_by: input.createdBy, ...toColumns(input) });
  if (error) throw error;
}
export async function updateHabit(id: string, input: HabitInput): Promise<void> {
  const { error } = await supabase.from('habits').update(toColumns(input)).eq('id', id);
  if (error) throw error;
}
export async function deleteHabit(id: string): Promise<void> {
  const { error } = await supabase.from('habits').delete().eq('id', id);
  if (error) throw error;
}

/** Load logs (on or after `sinceKey`) as a map of habitId -> set of date keys. */
export async function loadHabitLogs(sinceKey: string): Promise<Record<string, Set<string>>> {
  const { data, error } = await supabase.from('habit_logs').select('habit_id, on_date').gte('on_date', sinceKey);
  if (error) throw error;
  const out: Record<string, Set<string>> = {};
  for (const row of (data ?? []) as Array<{ habit_id: string; on_date: string }>) {
    (out[row.habit_id] ??= new Set()).add(row.on_date);
  }
  return out;
}

export async function setHabitDone(habitId: string, dateKey: string, done: boolean): Promise<void> {
  if (done) {
    const { error } = await supabase.from('habit_logs').upsert({ habit_id: habitId, on_date: dateKey }, { onConflict: 'habit_id,on_date' });
    if (error) throw error;
  } else {
    const { error } = await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('on_date', dateKey);
    if (error) throw error;
  }
}

const prevDay = (key: string) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() - 1); return toDateKey(d); };

/** Current streak: consecutive done days ending today (today may still be pending). */
export function currentStreak(days: Set<string> | undefined, todayKey = toDateKey()): number {
  if (!days || days.size === 0) return 0;
  let cursor = days.has(todayKey) ? todayKey : prevDay(todayKey);
  let streak = 0;
  while (days.has(cursor)) { streak++; cursor = prevDay(cursor); }
  return streak;
}
