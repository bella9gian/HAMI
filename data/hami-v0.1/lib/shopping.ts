import { supabase } from '@/lib/supabase';

export type ShoppingItem = {
  id: string;
  name: string;
  quantity: string | null;
  store: string | null;
  buyBy: string | null;
  notes: string | null;
  isPurchased: boolean;
  purchasedAt: string | null;
};

type Row = {
  id: string;
  name: string;
  quantity: string | null;
  store: string | null;
  buy_by: string | null;
  notes: string | null;
  is_purchased: boolean;
  purchased_at: string | null;
};

const select = 'id, name, quantity, store, buy_by, notes, is_purchased, purchased_at';
const map = (row: Row): ShoppingItem => ({
  id: row.id,
  name: row.name,
  quantity: row.quantity,
  store: row.store,
  buyBy: row.buy_by,
  notes: row.notes,
  isPurchased: row.is_purchased,
  purchasedAt: row.purchased_at,
});

export type ShoppingItemInput = {
  name: string;
  quantity?: string;
  store?: string;
  buyBy?: string;
  notes?: string;
};

function toColumns(input: ShoppingItemInput) {
  const name = input.name.trim();
  if (!name) throw new Error('Add an item name.');
  return {
    name,
    quantity: input.quantity?.trim() || null,
    store: input.store?.trim() || null,
    buy_by: input.buyBy?.trim() || null,
    notes: input.notes?.trim() || null,
  };
}

export async function loadShoppingItems(): Promise<ShoppingItem[]> {
  const { data, error } = await supabase
    .from('shopping_items')
    .select(select)
    .order('is_purchased', { ascending: true })
    .order('created_at', { ascending: true });
  if (error) throw error;
  return ((data ?? []) as Row[]).map(map);
}

export async function addShoppingItem(input: ShoppingItemInput & { householdId: string; createdBy: string }): Promise<void> {
  const { error } = await supabase.from('shopping_items').insert({
    household_id: input.householdId,
    created_by: input.createdBy,
    is_purchased: false,
    ...toColumns(input),
  });
  if (error) throw error;
}

export async function updateShoppingItem(id: string, input: ShoppingItemInput): Promise<void> {
  const { error } = await supabase.from('shopping_items').update(toColumns(input)).eq('id', id);
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
