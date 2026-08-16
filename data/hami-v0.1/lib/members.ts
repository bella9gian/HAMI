import { FamilyMember } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';

export const RELATIONSHIP_OPTIONS = [
  'Parent',
  'Child',
  'Partner',
  'Grandparent',
  'Sibling',
  'Caregiver',
  'Other',
] as const;

export type HouseholdContext = {
  householdId: string;
  currentMember: FamilyMember;
  members: FamilyMember[];
};

const memberSelect = 'id, household_id, display_name, first_name, relationship, user_id, is_active';

/**
 * Only the household admin (Bella) may view and manage the Household page.
 * Identified by name on her member record — the app has a single admin.
 */
export function isHouseholdAdmin(member?: Pick<FamilyMember, 'first_name' | 'display_name'> | null): boolean {
  const name = (member?.first_name || member?.display_name || '').trim().toLowerCase();
  return name === 'bella';
}

/** The signed-in user's own member record (lighter than loadHouseholdContext). */
export async function loadCurrentMember(): Promise<FamilyMember> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Sign in on Today to continue.');
  const { data, error } = await supabase
    .from('family_members')
    .select(memberSelect)
    .eq('user_id', session.user.id)
    .single();
  if (error) throw error;
  return data as FamilyMember;
}

const listeners = new Set<() => void>();
export function subscribeToMemberChanges(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
const notify = () => listeners.forEach((listener) => listener());

/** Resolve the signed-in user's household plus everyone active in it. */
export async function loadHouseholdContext(): Promise<HouseholdContext> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) throw new Error('Sign in on Today to manage your household.');

  const { data: me, error: meError } = await supabase
    .from('family_members')
    .select(memberSelect)
    .eq('user_id', session.user.id)
    .single();
  if (meError) throw meError;

  const members = await loadMembers(me.household_id);
  return { householdId: me.household_id, currentMember: me as FamilyMember, members };
}

export async function loadMembers(householdId: string): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_members')
    .select(memberSelect)
    .eq('household_id', householdId)
    .eq('is_active', true)
    .order('created_at');
  if (error) throw error;
  return (data ?? []) as FamilyMember[];
}

export async function addMember(input: {
  householdId: string;
  displayName: string;
  firstName?: string;
  relationship: string;
}): Promise<FamilyMember> {
  const displayName = input.displayName.trim();
  const relationship = input.relationship.trim();
  if (!displayName) throw new Error('Add a name for this family member.');
  if (!relationship) throw new Error('Choose a relationship for this family member.');

  const firstName = (input.firstName?.trim() || displayName.split(/\s+/)[0]) || null;

  const { data, error } = await supabase
    .from('family_members')
    .insert({
      household_id: input.householdId,
      display_name: displayName,
      first_name: firstName,
      relationship,
      is_active: true,
    })
    .select(memberSelect)
    .single();
  if (error) throw error;

  notify();
  return data as FamilyMember;
}

export async function updateMember(id: string, input: {
  displayName: string;
  firstName?: string;
  relationship: string;
}): Promise<void> {
  const displayName = input.displayName.trim();
  const relationship = input.relationship.trim();
  if (!displayName) throw new Error('Add a name for this family member.');
  if (!relationship) throw new Error('Choose a relationship for this family member.');

  const { error } = await supabase
    .from('family_members')
    .update({
      display_name: displayName,
      first_name: input.firstName?.trim() || displayName.split(/\s+/)[0] || null,
      relationship,
    })
    .eq('id', id);
  if (error) throw error;
  notify();
}

/** Soft-remove a member. Members linked to a HAMI login cannot be removed here. */
export async function deactivateMember(id: string): Promise<void> {
  const { error } = await supabase
    .from('family_members')
    .update({ is_active: false })
    .eq('id', id);
  if (error) throw error;
  notify();
}
