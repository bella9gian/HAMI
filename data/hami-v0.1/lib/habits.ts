import { toDateKey } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';

export type Frequency = 'daily' | 'weekly';

export type Habit = {
  id: string;
  name: string;
  notes: string | null;
  isActive: boolean;
  frequency: Frequency;
  weeklyTarget: number | null;
  startDate: string | null;
  endDate: string | null;
};

type Row = { id: string; name: string; notes: string | null; is_active: boolean; frequency: Frequency; weekly_target: number | null; start_date: string | null; end_date: string | null };
const select = 'id, name, notes, is_active, frequency, weekly_target, start_date, end_date';
const map = (r: Row): Habit => ({ id: r.id, name: r.name, notes: r.notes, isActive: r.is_active, frequency: r.frequency ?? 'daily', weeklyTarget: r.weekly_target, startDate: r.start_date, endDate: r.end_date });

export type HabitInput = { name: string; notes?: string; isActive?: boolean; frequency?: Frequency; weeklyTarget?: number | null; startDate?: string | null; endDate?: string | null };
function toColumns(input: HabitInput) {
  const name = input.name.trim();
  if (!name) throw new Error('Add a habit name.');
  const frequency: Frequency = input.frequency ?? 'daily';
  return {
    name,
    notes: input.notes?.trim() || null,
    is_active: input.isActive ?? true,
    frequency,
    weekly_target: frequency === 'weekly' ? Math.max(1, Math.min(7, input.weeklyTarget ?? 3)) : null,
    start_date: input.startDate || null,
    end_date: input.endDate || null,
  };
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
  // Clear any existing entry for the day first so this works whether or not a
  // unique (habit_id, on_date) constraint exists on the table.
  const { error: delError } = await supabase.from('habit_logs').delete().eq('habit_id', habitId).eq('on_date', dateKey);
  if (delError) throw delError;
  if (done) {
    const { error } = await supabase.from('habit_logs').insert({ habit_id: habitId, on_date: dateKey });
    if (error) throw error;
  }
}

const prevDay = (key: string) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() - 1); return toDateKey(d); };
const shiftKey = (key: string, delta: number) => { const d = new Date(`${key}T12:00:00`); d.setDate(d.getDate() + delta); return toDateKey(d); };

/** Current streak: consecutive done days ending today (today may still be pending). */
export function currentStreak(days: Set<string> | undefined, todayKey = toDateKey()): number {
  if (!days || days.size === 0) return 0;
  let cursor = days.has(todayKey) ? todayKey : prevDay(todayKey);
  let streak = 0;
  while (days.has(cursor)) { streak++; cursor = prevDay(cursor); }
  return streak;
}

/** Longest run of consecutive done days ever seen in `days`. */
export function bestStreak(days: Set<string> | undefined): number {
  if (!days || days.size === 0) return 0;
  const sorted = [...days].sort();
  let best = 1, run = 1;
  for (let i = 1; i < sorted.length; i++) {
    run = shiftKey(sorted[i - 1], 1) === sorted[i] ? run + 1 : 1;
    if (run > best) best = run;
  }
  return best;
}

/** Monday (as a date key) of the week containing `key`. */
export function weekStartKey(key: string): string {
  const d = new Date(`${key}T12:00:00`);
  const mondayOffset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - mondayOffset);
  return toDateKey(d);
}

/** How many done days fall in the same week as `todayKey`. */
export function weekDoneCount(days: Set<string> | undefined, todayKey = toDateKey()): number {
  if (!days) return 0;
  const week = weekStartKey(todayKey);
  let count = 0;
  days.forEach((k) => { if (weekStartKey(k) === week) count++; });
  return count;
}

/** Consecutive weeks (ending at the current week) that met `target`. The
 *  in-progress current week only counts once it has already met the target. */
export function weeklyStreak(days: Set<string> | undefined, target: number, todayKey = toDateKey()): number {
  if (!days || target <= 0) return 0;
  const counts = new Map<string, number>();
  days.forEach((k) => { const w = weekStartKey(k); counts.set(w, (counts.get(w) ?? 0) + 1); });
  const met = (w: string) => (counts.get(w) ?? 0) >= target;
  let cursor = weekStartKey(todayKey);
  if (!met(cursor)) cursor = shiftKey(cursor, -7); // current week still in progress
  let streak = 0;
  while (met(cursor)) { streak++; cursor = shiftKey(cursor, -7); }
  return streak;
}
