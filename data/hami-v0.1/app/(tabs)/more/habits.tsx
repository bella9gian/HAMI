import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, Check } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { colors, radius } from '@/constants/theme';
import { toDateKey } from '@/lib/calendar';

const fmtDate = (k: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${k}T12:00:00`));
import { loadHouseholdContext } from '@/lib/members';
import { addHabit, bestStreak, currentStreak, deleteHabit, Frequency, Habit, loadHabitLogs, loadHabits, setHabitDone, updateHabit, weekDoneCount, weeklyStreak } from '@/lib/habits';

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
  const [frequency, setFrequency] = useState<Frequency>('daily');
  const [weeklyTarget, setWeeklyTarget] = useState(3);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

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

  function reset() { setName(''); setNotes(''); setActive(true); setFrequency('daily'); setWeeklyTarget(3); setStartDate(''); setEndDate(''); setConfirmDelete(false); }
  function openNew() { reset(); setEditing(null); setShowNew(true); }
  function startEdit(h: Habit) {
    if (editing?.id === h.id) { setEditing(null); return; }
    setName(h.name); setNotes(h.notes ?? ''); setActive(h.isActive); setFrequency(h.frequency); setWeeklyTarget(h.weeklyTarget ?? 3); setStartDate(h.startDate ?? ''); setEndDate(h.endDate ?? ''); setConfirmDelete(false); setShowNew(false); setEditing(h);
  }
  function closeForms() { setShowNew(false); setEditing(null); reset(); }

  async function save() {
    if (!name.trim() || !householdId || !meId) { setError('Add a habit name.'); return; }
    setSaving(true); setError('');
    try {
      const values = { name, notes, isActive: active, frequency, weeklyTarget, startDate, endDate };
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
        <View style={s.field}>
          <Text style={s.label}>Frequency</Text>
          <View style={s.pills}>
            {(['daily', 'weekly'] as Frequency[]).map((f) => (
              <Pressable key={f} onPress={() => setFrequency(f)} style={[s.pill, frequency === f && s.pillOn]}>
                <Text style={[s.pillText, frequency === f && s.pillTextOn]}>{f === 'daily' ? 'Daily' : 'Weekly'}</Text>
              </Pressable>
            ))}
          </View>
        </View>
        {frequency === 'weekly' && (
          <View style={s.field}>
            <Text style={s.label}>Times per week</Text>
            <View style={s.stepper}>
              <Pressable onPress={() => setWeeklyTarget((n) => Math.max(1, n - 1))} style={s.stepBtn}><Ionicons name="remove" size={20} color={colors.forest}/></Pressable>
              <Text style={s.stepValue}>{weeklyTarget}×</Text>
              <Pressable onPress={() => setWeeklyTarget((n) => Math.min(7, n + 1))} style={s.stepBtn}><Ionicons name="add" size={20} color={colors.forest}/></Pressable>
            </View>
          </View>
        )}
        <View style={s.two}>
          <View style={[s.field, s.flex]}><Text style={s.label}>Start date</Text><DateField value={startDate} onChange={setStartDate} mode="date"/></View>
          <View style={[s.field, s.flex]}><Text style={s.label}>End date</Text><DateField value={endDate} onChange={setEndDate} mode="date"/></View>
        </View>
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
            const notStarted = h.startDate && h.startDate > todayKey;
            const ended = h.endDate && h.endDate < todayKey;
            let meta: string;
            if (notStarted) {
              meta = `Starts ${fmtDate(h.startDate!)}`;
            } else if (ended) {
              meta = `Ended ${fmtDate(h.endDate!)}`;
            } else if (h.frequency === 'weekly') {
              const target = h.weeklyTarget ?? 1;
              const progress = weekDoneCount(logs[h.id], todayKey);
              const wStreak = weeklyStreak(logs[h.id], target, todayKey);
              meta = `${progress}/${target} this week${wStreak > 0 ? ` · 🔥 ${wStreak} wk` : ''}`;
            } else {
              const streak = currentStreak(logs[h.id], todayKey);
              const best = bestStreak(logs[h.id]);
              meta = streak > 0 ? `🔥 ${streak} day${streak === 1 ? '' : 's'}${best > streak ? ` · best ${best}` : ''}` : (best > 0 ? `No streak now · best ${best}` : 'No streak yet');
            }
            if (!notStarted && !ended && h.endDate) meta += ` · ends ${fmtDate(h.endDate)}`;
            return (
              <View key={h.id}>
                <View style={[s.row, (i < habits.length - 1 || editing?.id === h.id) && s.sep]}>
                  <Pressable onPress={() => toggleToday(h)} accessibilityLabel={done ? 'Mark not done today' : 'Mark done today'}><Check done={done}/></Pressable>
                  <Pressable style={{ flex: 1 }} onPress={() => startEdit(h)}>
                    <Text style={[s.name, !h.isActive && s.dim]}>{h.name}</Text>
                    <Text style={s.metaText}>{meta}{!h.isActive ? ' · paused' : ''}</Text>
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
  two: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  label: { color: colors.text, fontWeight: '700' },
  pills: { flexDirection: 'row', gap: 8 },
  pill: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff' },
  pillOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  pillText: { color: colors.text, fontWeight: '700' },
  pillTextOn: { color: '#fff' },
  stepper: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  stepBtn: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 18, fontWeight: '800', color: colors.text, minWidth: 40, textAlign: 'center' },
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
