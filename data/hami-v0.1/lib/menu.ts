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
    on_date: input.onDate,
    meal: input.meal,
    recipe_id: recipeId,
    title: recipeId ? null : title,
  });
  if (error) throw error;
}

export async function deleteMenuEntry(id: string): Promise<void> {
  const { error } = await supabase.from('menu_entries').delete().eq('id', id);
  if (error) throw error;
}
