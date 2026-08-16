import { supabase } from '@/lib/supabase';

export type Meal = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export const MEALS: Meal[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export type MenuEntry = {
  id: string;
  onDate: string;
  meal: Meal;
  recipeId: string | null;
  recipeName: string | null;
  title: string | null;
};

type Row = {
  id: string;
  on_date: string;
  meal: Meal;
  recipe_id: string | null;
  title: string | null;
  recipes: { name: string } | { name: string }[] | null;
};

const select = 'id, on_date, meal, recipe_id, title, recipes ( name )';

function map(row: Row): MenuEntry {
  const recipe = Array.isArray(row.recipes) ? row.recipes[0] : row.recipes;
  return { id: row.id, onDate: row.on_date, meal: row.meal, recipeId: row.recipe_id, recipeName: recipe?.name ?? null, title: row.title };
}

/** A menu entry's display label — the linked recipe name, or its free-text title. */
export function menuLabel(entry: MenuEntry): string {
  return entry.recipeName ?? entry.title ?? 'Meal';
}

export async function loadMenuForDate(dateKey: string): Promise<MenuEntry[]> {
  const { data, error } = await supabase.from('menu_entries').select(select).eq('on_date', dateKey).order('created_at');
  if (error) throw error;
  return ((data ?? []) as unknown as Row[]).map(map);
}

export async function addMenuEntry(input: {
  householdId: string;
  createdBy: string;
  onDate: string;
  meal: Meal;
  recipeId?: string | null;
  title?: string;
}): Promise<void> {
  const recipeId = input.recipeId || null;
  const title = input.title?.trim() || null;
  if (!recipeId && !title) throw new Error('Pick a recipe or type what you are having.');
  const { error } = await supabase.from('menu_entries').insert({
    household_id: input.householdId,
    created_by: input.createdBy,
    on_date: input.onDate,
    meal: input.meal,
    recipe_id: recipeId,
    title: recipeId ? null : title,
  });
  if (error) throw error;
}

export async function loadMenuForRange(startKey: string, endKey: string): Promise<Record<string, MenuEntry[]>> {
  const { data, error } = await supabase.from('menu_entries').select(select).gte('on_date', startKey).lte('on_date', endKey).order('on_date').order('created_at');
  if (error) throw error;
  const out: Record<string, MenuEntry[]> = {};
  for (const row of (data ?? []) as unknown as Row[]) { const e = map(row); (out[e.onDate] ??= []).push(e); }
  return out;
}

export async function updateMenuEntry(id: string, input: { meal: Meal; recipeId?: string | null; title?: string }): Promise<void> {
  const recipeId = input.recipeId || null;
  const title = input.title?.trim() || null;
  if (!recipeId && !title) throw new Error('Pick a recipe or type what you are having.');
  const { error } = await supabase.from('menu_entries').update({ meal: input.meal, recipe_id: recipeId, title: recipeId ? null : title }).eq('id', id);
  if (error) throw error;
}

export async function deleteMenuEntry(id: string): Promise<void> {
  const { error } = await supabase.from('menu_entries').delete().eq('id', id);
  if (error) throw error;
}

const shiftKey = (key: string, delta: number) => {
  const d = new Date(`${key}T12:00:00`);
  d.setDate(d.getDate() + delta);
  const off = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - off).toISOString().slice(0, 10);
};

function rowFor(entry: MenuEntry, householdId: string, createdBy: string, dateKey: string) {
  return { household_id: householdId, created_by: createdBy, on_date: dateKey, meal: entry.meal, recipe_id: entry.recipeId, title: entry.recipeId ? null : entry.title };
}

/** Duplicate a menu entry onto another day. */
export async function copyMenuEntry(entry: MenuEntry, householdId: string, createdBy: string, targetDateKey: string): Promise<void> {
  const { error } = await supabase.from('menu_entries').insert(rowFor(entry, householdId, createdBy, targetDateKey));
  if (error) throw error;
}

/** Repeat a menu entry daily/weekly from the day after its date through `untilKey`. */
export async function repeatMenuEntry(entry: MenuEntry, householdId: string, createdBy: string, frequency: 'daily' | 'weekly', untilKey: string): Promise<number> {
  const step = frequency === 'weekly' ? 7 : 1;
  const rows: ReturnType<typeof rowFor>[] = [];
  let cursor = shiftKey(entry.onDate, step);
  let guard = 0;
  while (cursor <= untilKey && guard < 366) { rows.push(rowFor(entry, householdId, createdBy, cursor)); cursor = shiftKey(cursor, step); guard++; }
  if (rows.length) { const { error } = await supabase.from('menu_entries').insert(rows); if (error) throw error; }
  return rows.length;
}
