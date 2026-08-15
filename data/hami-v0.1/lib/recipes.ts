import { supabase } from '@/lib/supabase';

export type Recipe = {
  id: string;
  name: string;
  category: string | null;
  ingredients: string | null;
  instructions: string | null;
};

type Row = { id: string; name: string; category: string | null; ingredients: string | null; instructions: string | null };
const select = 'id, name, category, ingredients, instructions';
const map = (row: Row): Recipe => ({ id: row.id, name: row.name, category: row.category, ingredients: row.ingredients, instructions: row.instructions });

export type RecipeInput = { name: string; category?: string; ingredients?: string; instructions?: string };

function toColumns(input: RecipeInput) {
  const name = input.name.trim();
  if (!name) throw new Error('Add a recipe name.');
  return {
    name,
    category: input.category?.trim() || null,
    ingredients: input.ingredients?.trim() || null,
    instructions: input.instructions?.trim() || null,
  };
}

export async function loadRecipes(): Promise<Recipe[]> {
  const { data, error } = await supabase.from('recipes').select(select).order('name');
  if (error) throw error;
  return ((data ?? []) as Row[]).map(map);
}

export async function addRecipe(input: RecipeInput & { householdId: string; createdBy: string }): Promise<void> {
  const { error } = await supabase.from('recipes').insert({
    household_id: input.householdId,
    created_by: input.createdBy,
    ...toColumns(input),
  });
  if (error) throw error;
}

export async function updateRecipe(id: string, input: RecipeInput): Promise<void> {
  const { error } = await supabase.from('recipes').update(toColumns(input)).eq('id', id);
  if (error) throw error;
}

export async function deleteRecipe(id: string): Promise<void> {
  const { error } = await supabase.from('recipes').delete().eq('id', id);
  if (error) throw error;
}
