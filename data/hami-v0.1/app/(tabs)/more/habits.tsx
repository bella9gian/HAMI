import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, Check } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { toDateKey } from '@/lib/calendar';
import { loadHouseholdContext } from '@/lib/members';
import { addHabit, currentStreak, deleteHabit, Habit, loadHabitLogs, loadHabits, setHabitDone, updateHabit } from '@/lib/habits';

const since = () => { const d = new Date(); d.setDate(d.getDate() - 90); return toDateKey(d); };

export default function Habits() {
  const router = useRouter();
  const todayKey = toDateKey();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [habits, setHabits] = useState<Habit[]>([]);
  const [logs, setLogs] = useState<Record<string, Set<string>>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Habit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const ctx = await loadHouseholdContext();
      setHouseholdId(ctx.householdId); setMeId(ctx.currentMember.id);
      setHabits(await loadHabits());
      setLogs(await loadHabitLogs(since()));
    } catch (e: any) { setError(e?.message ?? 'Unable to load habits.'); }
    finally { setLoading(false); }
  }
  async function refresh() { setHabits(await loadHabits()); setLogs(await loadHabitLogs(since())); }

  function reset() { setName(''); setNotes(''); setActive(true); setConfirmDelete(false); }
  function openNew() { reset(); setEditing(null); setShowNew(true); }
  function startEdit(h: Habit) {
    if (editing?.id === h.id) { setEditing(null); return; }
    setName(h.name); setNotes(h.notes ?? ''); setActive(h.isActive); setConfirmDelete(false); setShowNew(false); setEditing(h);
  }
  function closeForms() { setShowNew(false); setEditing(null); reset(); }

  async function save() {
    if (!name.trim() || !householdId || !meId) { setError('Add a habit name.'); return; }
    setSaving(true); setError('');
    try {
      const values = { name, notes, isActive: active };
      if (editing) await updateHabit(editing.id, values);
      else await addHabit({ ...values, householdId, createdBy: meId });
      await refresh(); closeForms();
    } catch (e: any) { setError(e?.message ?? 'Unable to save this habit.'); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!editing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try { await deleteHabit(editing.id); await refresh(); closeForms(); }
    catch (e: any) { setError(e?.message ?? 'Unable to delete this habit.'); }
    finally { setSaving(false); }
  }
  async function toggleToday(h: Habit) {
    const done = logs[h.id]?.has(todayKey) ?? false;
    setLogs((prev) => { const next = { ...prev }; const set = new Set(next[h.id] ?? []); if (done) set.delete(todayKey); else set.add(todayKey); next[h.id] = set; return next; });
    try { await setHabitDone(h.id, todayKey, !done); }
    catch (e: any) { setError(e?.message ?? 'Unable to update this habit.'); await refresh(); }
  }

  function form(isEdit: boolean) {
    return (
      <Card style={isEdit ? s.inlineForm : s.form}>
        <View style={s.head}><Text style={s.formTitle}>{isEdit ? 'Edit habit' : 'New habit'}</Text><Pressable onPress={closeForms}><Ionicons name="close" size={22} color={colors.muted}/></Pressable></View>
        <View style={s.field}><Text style={s.label}>Name</Text><TextInput value={name} onChangeText={setName} placeholder="e.g. Drink water" placeholderTextColor={colors.muted} style={s.input}/></View>
        <View style={s.field}><Text style={s.label}>Notes</Text><TextInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" placeholderTextColor={colors.muted} multiline style={[s.input, s.multi]}/></View>
        {!!error && <Text style={s.error}>{error}</Text>}
        <Pressable disabled={saving} onPress={save} style={s.save}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={s.white}>{isEdit ? 'Save changes' : 'Add habit'}</Text>}</Pressable>
        {isEdit && <Pressable onPress={remove} style={s.delete}><Text style={s.deleteText}>{confirmDelete ? 'Tap again to delete' : 'Delete habit'}</Text></Pressable>}
      </Card>
    );
  }

  return (
    <Screen>
      <View style={s.headBar}>
        <Ionicons name="chevron-back" size={25} color={colors.forest} onPress={() => router.back()}/>
        <Text style={s.title}>Habits</Text>
        <Pressable onPress={openNew} accessibilityLabel="Add habit"><Ionicons name="add" size={26} color={colors.forest}/></Pressable>
      </View>

      {showNew && form(false)}

      {loading ? (
        <View style={s.loading}><ActivityIndicator color={colors.forest}/><Text style={s.metaText}>Loading habits…</Text></View>
      ) : error && !showNew && !editing ? (
        <Card style={s.message}><Text style={s.error}>{error}</Text><Pressable onPress={load}><Text style={s.action}>Try again</Text></Pressable></Card>
      ) : habits.length === 0 ? (
        <Card><Text style={s.metaText}>No habits yet. Tap + to start one.</Text></Card>
      ) : (
        <Card>
          {habits.map((h, i) => {
            const done = logs[h.id]?.has(todayKey) ?? false;
            const streak = currentStreak(logs[h.id], todayKey);
            return (
              <View key={h.id}>
                <View style={[s.row, (i < habits.length - 1 || editing?.id === h.id) && s.sep]}>
                  <Pressable onPress={() => toggleToday(h)} accessibilityLabel={done ? 'Mark not done today' : 'Mark done today'}><Check done={done}/></Pressable>
                  <Pressable style={{ flex: 1 }} onPress={() => startEdit(h)}>
                    <Text style={[s.name, !h.isActive && s.dim]}>{h.name}</Text>
                    <Text style={s.metaText}>{streak > 0 ? `🔥 ${streak} day${streak === 1 ? '' : 's'} streak` : 'No streak yet'}{!h.isActive ? ' · paused' : ''}</Text>
                  </Pressable>
                  <Pressable onPress={() => startEdit(h)}><Ionicons name={editing?.id === h.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted}/></Pressable>
                </View>
                {editing?.id === h.id && form(true)}
              </View>
            );
          })}
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  headBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  form: { gap: 10, marginBottom: 14 },
  inlineForm: { gap: 10, marginTop: 10, marginBottom: 10, backgroundColor: colors.surfaceMuted },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  field: { gap: 6 },
  label: { color: colors.text, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, color: colors.text, backgroundColor: '#fff', minHeight: 44 },
  multi: { minHeight: 70, textAlignVertical: 'top' },
  error: { color: '#A33', fontSize: 13 },
  action: { color: colors.forest, fontWeight: '700' },
  save: { minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest, borderRadius: radius.sm },
  white: { color: '#fff', fontWeight: '700' },
  delete: { alignItems: 'center', padding: 7 },
  deleteText: { color: '#A33', fontWeight: '700' },
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 8 },
  message: { gap: 7 },
  row: { minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sep: { borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  dim: { color: colors.muted },
  metaText: { fontSize: 12, color: colors.muted, marginTop: 3 },
});
