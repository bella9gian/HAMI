import { supabase } from '@/lib/supabase';

export type Supplement = {
  id: string;
  name: string;
  dosage: string | null;
  schedule: string | null;
  notes: string | null;
  isActive: boolean;
  inventoryCount: number | null;
  lowThreshold: number | null;
};

type Row = { id: string; name: string; dosage: string | null; schedule: string | null; notes: string | null; is_active: boolean; inventory_count: number | null; low_threshold: number | null };
const select = 'id, name, dosage, schedule, notes, is_active, inventory_count, low_threshold';
const map = (row: Row): Supplement => ({ id: row.id, name: row.name, dosage: row.dosage, schedule: row.schedule, notes: row.notes, isActive: row.is_active, inventoryCount: row.inventory_count, lowThreshold: row.low_threshold });

export type SupplementInput = { name: string; dosage?: string; schedule?: string; notes?: string; isActive?: boolean; inventoryCount?: number | null; lowThreshold?: number | null };

function toColumns(input: SupplementInput) {
  const name = input.name.trim();
  if (!name) throw new Error('Add a supplement name.');
  return {
    name,
    dosage: input.dosage?.trim() || null,
    schedule: input.schedule?.trim() || null,
    notes: input.notes?.trim() || null,
    is_active: input.isActive ?? true,
    inventory_count: input.inventoryCount ?? null,
    low_threshold: input.lowThreshold ?? null,
  };
}

/** True when inventory is being tracked and has hit its low mark (or zero). */
export function isLow(s: Supplement): boolean {
  if (s.inventoryCount == null) return false;
  const threshold = s.lowThreshold ?? 5;
  return s.inventoryCount <= threshold;
}

export async function loadSupplements(): Promise<Supplement[]> {
  const { data, error } = await supabase.from('supplements').select(select).order('is_active', { ascending: false }).order('name');
  if (error) throw error;
  return ((data ?? []) as Row[]).map(map);
}

export async function addSupplement(input: SupplementInput & { householdId: string; createdBy: string }): Promise<void> {
  const { error } = await supabase.from('supplements').insert({ household_id: input.householdId, created_by: input.createdBy, ...toColumns(input) });
  if (error) throw error;
}

export async function updateSupplement(id: string, input: SupplementInput): Promise<void> {
  const { error } = await supabase.from('supplements').update(toColumns(input)).eq('id', id);
  if (error) throw error;
}

export async function deleteSupplement(id: string): Promise<void> {
  const { error } = await supabase.from('supplements').delete().eq('id', id);
  if (error) throw error;
}

/** Record one dose taken now, decrementing inventory when it's being tracked. */
export async function takeDose(s: Supplement, createdBy: string): Promise<void> {
  const { error } = await supabase.from('supplement_logs').insert({ supplement_id: s.id, created_by: createdBy });
  if (error) throw error;
  if (s.inventoryCount != null) {
    const next = Math.max(0, s.inventoryCount - 1);
    const { error: e } = await supabase.from('supplements').update({ inventory_count: next }).eq('id', s.id);
    if (e) throw e;
  }
}

/** Set the units on hand (restock or correction). */
export async function setInventory(id: string, count: number | null): Promise<void> {
  const { error } = await supabase.from('supplements').update({ inventory_count: count }).eq('id', id);
  if (error) throw error;
}

/** ISO timestamps of doses taken since `sinceKey` (YYYY-MM-DD), by supplement id. */
export async function loadDoses(sinceKey: string): Promise<Record<string, string[]>> {
  const { data, error } = await supabase
    .from('supplement_logs')
    .select('supplement_id, taken_at')
    .gte('taken_at', `${sinceKey}T00:00:00`);
  if (error) throw error;
  const out: Record<string, string[]> = {};
  for (const r of (data ?? []) as Array<{ supplement_id: string; taken_at: string }>) {
    (out[r.supplement_id] ??= []).push(r.taken_at);
  }
  return out;
}
