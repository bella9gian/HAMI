import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { FamilyMember } from '@/lib/calendar';
import {
  addMember,
  deactivateMember,
  isHouseholdAdmin,
  loadHouseholdContext,
  RELATIONSHIP_OPTIONS,
  updateMember,
} from '@/lib/members';

export default function Household() {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [allowed, setAllowed] = useState(true);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [firstName, setFirstName] = useState('');
  const [relationship, setRelationship] = useState<string>('Parent');

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const ctx = await loadHouseholdContext();
      if (!isHouseholdAdmin(ctx.currentMember)) {
        setAllowed(false);
        return;
      }
      setAllowed(true);
      setHouseholdId(ctx.householdId);
      setMembers(ctx.members);
    } catch (e: any) {
      setError(e?.message ?? 'Unable to load your household.');
    } finally {
      setLoading(false);
    }
  }

  function reset() {
    setEditing(null);
    setDisplayName('');
    setFirstName('');
    setRelationship('Parent');
    setConfirmDelete(false);
  }

  function openNew() {
    reset();
    setShowForm(true);
  }

  function edit(member: FamilyMember) {
    setEditing(member);
    setDisplayName(member.display_name);
    setFirstName(member.first_name ?? '');
    setRelationship(member.relationship ?? 'Other');
    setConfirmDelete(false);
    setShowForm(true);
  }

  async function save() {
    if (!householdId) return;
    setSaving(true);
    setError('');
    try {
      if (editing) {
        await updateMember(editing.id, { displayName, firstName, relationship });
      } else {
        await addMember({ householdId, displayName, firstName, relationship });
      }
      await load();
      setShowForm(false);
      reset();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to save this family member.');
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!editing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    setError('');
    try {
      await deactivateMember(editing.id);
      await load();
      setShowForm(false);
      reset();
    } catch (e: any) {
      setError(e?.message ?? 'Unable to remove this family member.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={s.head}>
        <Ionicons name="chevron-back" size={25} color={colors.forest} onPress={() => router.back()} />
        <Text style={s.title}>Household</Text>
        {allowed ? (
          <Pressable accessibilityLabel="Add member" onPress={openNew}>
            <Ionicons name="add" size={26} color={colors.forest} />
          </Pressable>
        ) : <View style={{ width: 26 }} />}
      </View>

      {!loading && !allowed ? (
        <Card style={s.message}>
          <View style={s.lock}><Ionicons name="lock-closed-outline" size={26} color={colors.forest} /></View>
          <Text style={s.restrictedTitle}>Household is private</Text>
          <Text style={s.meta}>Only Bella can view and manage the household members.</Text>
          <Pressable onPress={() => router.back()}><Text style={s.action}>Go back</Text></Pressable>
        </Card>
      ) : (
      <>
      {showForm && (
        <Card style={s.form}>
          <View style={s.formHead}>
            <Text style={s.formTitle}>{editing ? 'Edit member' : 'Add member'}</Text>
            <Pressable onPress={() => { setShowForm(false); reset(); }}>
              <Ionicons name="close" size={22} color={colors.muted} />
            </Pressable>
          </View>

          <TextInput
            value={displayName}
            onChangeText={setDisplayName}
            placeholder="Name (e.g. Mike)"
            placeholderTextColor={colors.muted}
            style={s.input}
          />
          <TextInput
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name (optional)"
            placeholderTextColor={colors.muted}
            style={s.input}
          />

          <Text style={s.label}>Relationship</Text>
          <View style={s.chips}>
            {RELATIONSHIP_OPTIONS.map((option) => {
              const active = relationship === option;
              return (
                <Pressable
                  key={option}
                  onPress={() => setRelationship(option)}
                  style={[s.chip, active && s.chipActive]}
                >
                  <Text style={[s.chipText, active && s.chipTextActive]}>{option}</Text>
                </Pressable>
              );
            })}
          </View>

          {!!error && <Text style={s.error}>{error}</Text>}

          <Pressable disabled={saving} onPress={save} style={s.save}>
            {saving ? <ActivityIndicator color="#fff" /> : (
              <Text style={s.white}>{editing ? 'Save changes' : 'Add member'}</Text>
            )}
          </Pressable>

          {editing && !editing.user_id && (
            <Pressable onPress={remove} style={s.delete}>
              <Text style={s.deleteText}>
                {confirmDelete ? 'Tap again to remove' : 'Remove from household'}
              </Text>
            </Pressable>
          )}
          {editing && editing.user_id && (
            <Text style={s.hint}>Members with a HAMI login can’t be removed here.</Text>
          )}
        </Card>
      )}

      {loading ? (
        <View style={s.loading}>
          <ActivityIndicator color={colors.forest} />
          <Text style={s.meta}>Loading your household…</Text>
        </View>
      ) : error && !showForm ? (
        <Card style={s.message}>
          <Text style={s.error}>{error}</Text>
          <Pressable onPress={load}><Text style={s.action}>Try again</Text></Pressable>
        </Card>
      ) : (
        <>
          <Text style={s.sectionText}>{members.length} {members.length === 1 ? 'member' : 'members'}</Text>
          <Card>
            {members.map((member, index) => (
              <Pressable
                key={member.id}
                onPress={() => edit(member)}
                style={[s.row, index < members.length - 1 && s.sep]}
              >
                <View style={s.avatar}>
                  <Text style={s.avatarText}>{member.display_name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={s.name}>{member.display_name}</Text>
                  <Text style={s.meta}>{member.relationship ?? 'Family'}</Text>
                </View>
                {member.user_id && <Text style={s.loginBadge}>HAMI login</Text>}
                <Ionicons name="chevron-forward" size={18} color={colors.muted} />
              </Pressable>
            ))}
          </Card>

          <Pressable onPress={openNew} style={s.addRow}>
            <Ionicons name="add-circle-outline" size={22} color={colors.forest} />
            <Text style={s.addText}>Add a family member</Text>
          </Pressable>
        </>
      )}
      </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  form: { gap: 11, marginBottom: 14 },
  formHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, color: colors.text, backgroundColor: '#fff' },
  label: { color: colors.text, fontWeight: '700', marginTop: 2 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 13, paddingVertical: 8 },
  chipActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  chipTextActive: { color: '#fff' },
  save: { minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest, borderRadius: radius.sm, marginTop: 4 },
  white: { color: '#fff', fontWeight: '700' },
  delete: { alignItems: 'center', padding: 7 },
  deleteText: { color: '#A33', fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 12, textAlign: 'center' },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 8 },
  message: { gap: 7 },
  lock: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.forestSoft, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  restrictedTitle: { fontSize: 17, fontWeight: '800', color: colors.text },
  error: { color: '#A33', fontSize: 13 },
  action: { color: colors.forest, fontWeight: '700' },
  sectionText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.7, color: colors.muted, textTransform: 'uppercase', marginBottom: 10 },
  row: { minHeight: 64, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sep: { borderBottomWidth: 1, borderBottomColor: colors.border },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forestSoft },
  avatarText: { color: colors.forest, fontWeight: '800' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 3 },
  loginBadge: { fontSize: 11, color: colors.forest, fontWeight: '700' },
  addRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  addText: { color: colors.forest, fontWeight: '700' },
});
