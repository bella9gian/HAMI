import { supabase } from '@/lib/supabase';

export type ShoppingItem = {
  id: string;
  name: string;
  quantity: string | null;
  category: string | null;
  isPurchased: boolean;
  purchasedAt: string | null;
};

type Row = {
  id: string;
  name: string;
  quantity: string | null;
  category: string | null;
  is_purchased: boolean;
  purchased_at: string | null;
};

const select = 'id, name, quantity, category, is_purchased, purchased_at';
const map = (row: Row): ShoppingItem => ({
  id: row.id,
  name: row.name,
  quantity: row.quantity,
  category: row.category,
  isPurchased: row.is_purchased,
  purchasedAt: row.purchased_at,
});

export async function loadShoppingItems(): Promise<ShoppingItem[]> {
  const { data, error } = await supabase
    .from('shopping_items')
    .select(select)
    .order('is_purchased', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(map);
}

export async function addShoppingItem(input: {
  householdId: string;
  createdBy: string;
  name: string;
  quantity?: string;
  category?: string;
}): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error('Add an item name.');
  const { error } = await supabase.from('shopping_items').insert({
    household_id: input.householdId,
    created_by: input.createdBy,
    name,
    quantity: input.quantity?.trim() || null,
    category: input.category?.trim() || null,
    is_purchased: false,
  });
  if (error) throw error;
}

export async function setShoppingItemPurchased(id: string, purchased: boolean): Promise<void> {
  const { error } = await supabase
    .from('shopping_items')
    .update({ is_purchased: purchased, purchased_at: purchased ? new Date().toISOString() : null })
    .eq('id', id);
  if (error) throw error;
}

export async function deleteShoppingItem(id: string): Promise<void> {
  const { error } = await supabase.from('shopping_items').delete().eq('id', id);
  if (error) throw error;
}

export async function clearPurchasedItems(): Promise<void> {
  const { error } = await supabase.from('shopping_items').delete().eq('is_purchased', true);
  if (error) throw error;
}
