import { supabase } from '@/lib/supabase';

export const BEAUTY_CATEGORIES = ['Skincare', 'Makeup', 'Haircare', 'Nails', 'Fragrance', 'Other'];

export type BeautyItem = {
  id: string;
  name: string;
  category: string | null;
  brand: string | null;
  notes: string | null;
  isActive: boolean;
};

type Row = { id: string; name: string; category: string | null; brand: string | null; notes: string | null; is_active: boolean };
const select = 'id, name, category, brand, notes, is_active';
const map = (r: Row): BeautyItem => ({ id: r.id, name: r.name, category: r.category, brand: r.brand, notes: r.notes, isActive: r.is_active });

export type BeautyInput = { name: string; category?: string; brand?: string; notes?: string; isActive?: boolean };
function toColumns(input: BeautyInput) {
  const name = input.name.trim();
  if (!name) throw new Error('Add a product name.');
  return {
    name,
    category: input.category?.trim() || null,
    brand: input.brand?.trim() || null,
    notes: input.notes?.trim() || null,
    is_active: input.isActive ?? true,
  };
}

export async function loadBeautyItems(): Promise<BeautyItem[]> {
  const { data, error } = await supabase.from('beauty_items').select(select).order('category').order('name');
  if (error) throw error;
  return ((data ?? []) as Row[]).map(map);
}

export async function addBeautyItem(input: BeautyInput & { householdId: string; createdBy: string }): Promise<void> {
  const { error } = await supabase.from('beauty_items').insert({ household_id: input.householdId, created_by: input.createdBy, ...toColumns(input) });
  if (error) throw error;
}
export async function updateBeautyItem(id: string, input: BeautyInput): Promise<void> {
  const { error } = await supabase.from('beauty_items').update(toColumns(input)).eq('id', id);
  if (error) throw error;
}
export async function deleteBeautyItem(id: string): Promise<void> {
  const { error } = await supabase.from('beauty_items').delete().eq('id', id);
  if (error) throw error;
}
