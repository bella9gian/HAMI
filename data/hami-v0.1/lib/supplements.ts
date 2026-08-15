import { supabase } from '@/lib/supabase';

export type Supplement = {
  id: string;
  name: string;
  dosage: string | null;
  schedule: string | null;
  notes: string | null;
  isActive: boolean;
};

type Row = { id: string; name: string; dosage: string | null; schedule: string | null; notes: string | null; is_active: boolean };
const select = 'id, name, dosage, schedule, notes, is_active';
const map = (row: Row): Supplement => ({ id: row.id, name: row.name, dosage: row.dosage, schedule: row.schedule, notes: row.notes, isActive: row.is_active });

export type SupplementInput = { name: string; dosage?: string; schedule?: string; notes?: string; isActive?: boolean };

function toColumns(input: SupplementInput) {
  const name = input.name.trim();
  if (!name) throw new Error('Add a supplement name.');
  return {
    name,
    dosage: input.dosage?.trim() || null,
    schedule: input.schedule?.trim() || null,
    notes: input.notes?.trim() || null,
    is_active: input.isActive ?? true,
  };
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
