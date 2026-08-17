import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card, Check } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { DateField } from '@/components/DateField';
import { toDateKey } from '@/lib/calendar';
import { loadHouseholdContext } from '@/lib/members';
import {
  addTrip, addTripTask, deleteTrip, deleteTripTask, loadTrips, loadTripTasks,
  setTripTaskCompleted, Trip, TripTask, updateTrip,
} from '@/lib/trips';

const fmt = (key: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${key}T12:00:00`));

function dateRange(t: Trip): string {
  if (t.startsOn && t.endsOn) return `${fmt(t.startsOn)} – ${fmt(t.endsOn)}`;
  if (t.startsOn) return fmt(t.startsOn);
  return 'Dates TBD';
}
function countdown(t: Trip): string | null {
  if (!t.startsOn) return null;
  const today = toDateKey();
  if (t.endsOn && t.endsOn < today) return 'Past';
  if (t.startsOn <= today && (!t.endsOn || t.endsOn >= today)) return 'Now';
  const days = Math.round((new Date(`${t.startsOn}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
  return days > 0 ? `${days} day${days === 1 ? '' : 's'} to go` : null;
}

export default function Trips() {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [currentMemberId, setCurrentMemberId] = useState<string | null>(null);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [destination, setDestination] = useState('');
  const [startsOn, setStartsOn] = useState('');
  const [endsOn, setEndsOn] = useState('');
  const [notes, setNotes] = useState('');

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [tasks, setTasks] = useState<TripTask[]>([]);
  const [taskInput, setTaskInput] = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const ctx = await loadHouseholdContext();
      setHouseholdId(ctx.householdId);
      setCurrentMemberId(ctx.currentMember.id);
      setTrips(await loadTrips());
    } catch (e: any) { setError(e?.message ?? 'Unable to load trips.'); }
    finally { setLoading(false); }
  }
  async function refresh() { setTrips(await loadTrips()); }

  function reset() { setName(''); setDestination(''); setStartsOn(''); setEndsOn(''); setNotes(''); setConfirmDelete(false); }
  function openNew() { reset(); setEditingId(null); setExpandedId(null); setShowNew(true); }
  function openEdit(t: Trip) {
    setName(t.name); setDestination(t.destination ?? ''); setStartsOn(t.startsOn ?? ''); setEndsOn(t.endsOn ?? ''); setNotes(t.notes ?? '');
    setConfirmDelete(false); setShowNew(false); setEditingId(t.id);
  }
  function closeForms() { setShowNew(false); setEditingId(null); reset(); }

  async function save() {
    if (!name.trim() || !householdId || !currentMemberId) { setError('Add a trip name.'); return; }
    setSaving(true); setError('');
    try {
      const values = { name, destination, startsOn, endsOn, notes };
      if (editingId) await updateTrip(editingId, values);
      else await addTrip({ ...values, householdId, createdBy: currentMemberId });
      await refresh(); closeForms();
    } catch (e: any) { setError(e?.message ?? 'Unable to save this trip.'); }
    finally { setSaving(false); }
  }
  async function removeTrip() {
    if (!editingId) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try { await deleteTrip(editingId); if (expandedId === editingId) setExpandedId(null); await refresh(); closeForms(); }
    catch (e: any) { setError(e?.message ?? 'Unable to delete this trip.'); }
    finally { setSaving(false); }
  }

  async function toggleExpand(t: Trip) {
    if (expandedId === t.id) { setExpandedId(null); return; }
    setExpandedId(t.id); setEditingId(null); setTaskInput('');
    try { setTasks(await loadTripTasks(t.id)); } catch (e: any) { setError(e?.message ?? 'Unable to load trip tasks.'); }
  }
  async function refreshTasks(tripId: string) { setTasks(await loadTripTasks(tripId)); }
  async function addTask(tripId: string) {
    if (!taskInput.trim()) return;
    try { await addTripTask(tripId, taskInput); setTaskInput(''); await refreshTasks(tripId); }
    catch (e: any) { setError(e?.message ?? 'Unable to add this item.'); }
  }
  async function toggleTask(tripId: string, task: TripTask) {
    try { await setTripTaskCompleted(task.id, !task.completed); await refreshTasks(tripId); }
    catch (e: any) { setError(e?.message ?? 'Unable to update this item.'); }
  }
  async function removeTask(tripId: string, id: string) {
    try { await deleteTripTask(id); await refreshTasks(tripId); }
    catch (e: any) { setError(e?.message ?? 'Unable to remove this item.'); }
  }

  function tripForm(isEdit: boolean) {
    return (
      <Card style={isEdit ? s.inlineForm : s.form}>
        <View style={s.head}><Text style={s.formTitle}>{isEdit ? 'Edit trip' : 'New trip'}</Text><Pressable onPress={closeForms}><Ionicons name="close" size={22} color={colors.muted}/></Pressable></View>
        <View style={s.field}><Text style={s.label}>Name</Text><TextInput value={name} onChangeText={setName} placeholder="e.g. Hawaii" placeholderTextColor={colors.muted} style={s.input}/></View>
        <View style={s.field}><Text style={s.label}>Destination</Text><TextInput value={destination} onChangeText={setDestination} placeholder="e.g. Maui, HI" placeholderTextColor={colors.muted} style={s.input}/></View>
        <View style={s.row2}><View style={s.field2}><Text style={s.label}>Start</Text><DateField value={startsOn} onChange={setStartsOn} mode="date"/></View><View style={s.field2}><Text style={s.label}>End</Text><DateField value={endsOn} onChange={setEndsOn} mode="date"/></View></View>
        <View style={s.field}><Text style={s.label}>Notes</Text><TextInput value={notes} onChangeText={setNotes} placeholder="Itinerary, bookings…" placeholderTextColor={colors.muted} multiline style={[s.input, s.multi]}/></View>
        {!!error && <Text style={s.error}>{error}</Text>}
        <Pressable disabled={saving} onPress={save} style={s.save}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={s.white}>{isEdit ? 'Save changes' : 'Add trip'}</Text>}</Pressable>
        {isEdit && <Pressable onPress={removeTrip} style={s.delete}><Text style={s.deleteText}>{confirmDelete ? 'Tap again to delete' : 'Delete trip'}</Text></Pressable>}
      </Card>
    );
  }

  function tripDetail(t: Trip) {
    return (
      <Card style={s.detail}>
        {!!t.notes && <Text style={s.notesText}>{t.notes}</Text>}
        <View style={s.detailHead}><Text style={s.sectionText}>Packing & to-do</Text><Pressable onPress={() => openEdit(t)}><Text style={s.action}>Edit trip</Text></Pressable></View>
        <View style={s.addRow}>
          <TextInput value={taskInput} onChangeText={setTaskInput} placeholder="Add an item…" placeholderTextColor={colors.muted} style={[s.input, s.flex]} onSubmitEditing={() => addTask(t.id)} returnKeyType="done"/>
          <Pressable onPress={() => addTask(t.id)} style={s.addBtn} accessibilityLabel="Add item"><Ionicons name="add" size={22} color="#fff"/></Pressable>
        </View>
        {tasks.length === 0 ? <Text style={s.metaText}>Nothing on the list yet.</Text> : tasks.map((task, i) => (
          <View key={task.id} style={[s.taskRow, i < tasks.length - 1 && s.sep]}>
            <Pressable onPress={() => toggleTask(t.id, task)}><Check done={task.completed}/></Pressable>
            <Text style={[s.taskText, task.completed && s.done]}>{task.title}</Text>
            <Pressable onPress={() => removeTask(t.id, task.id)} hitSlop={8}><Ionicons name="close" size={18} color={colors.muted}/></Pressable>
          </View>
        ))}
      </Card>
    );
  }

  return (
    <Screen>
      <View style={s.headBar}>
        <Ionicons name="chevron-back" size={25} color={colors.forest} onPress={() => router.navigate('/')}/>
        <Text style={s.title}>Trips</Text>
        <Pressable onPress={openNew} accessibilityLabel="Add trip"><Ionicons name="add" size={26} color={colors.forest}/></Pressable>
      </View>

      {showNew && tripForm(false)}

      {loading ? (
        <View style={s.loading}><ActivityIndicator color={colors.forest}/><Text style={s.metaText}>Loading trips…</Text></View>
      ) : error && !showNew && !editingId ? (
        <Card style={s.message}><Text style={s.error}>{error}</Text><Pressable onPress={load}><Text style={s.action}>Try again</Text></Pressable></Card>
      ) : trips.length === 0 ? (
        <Card><Text style={s.metaText}>No trips yet. Tap + to plan one.</Text></Card>
      ) : (
        trips.map((t) => {
          const cd = countdown(t);
          return (
            <View key={t.id}>
              <Pressable onPress={() => toggleExpand(t)} style={s.tripCardWrap}>
                <Card style={s.tripCard}>
                  <View style={s.tripIcon}><Ionicons name="airplane-outline" size={20} color={colors.forest}/></View>
                  <View style={{ flex: 1 }}>
                    <Text style={s.tripName}>{t.name}</Text>
                    <Text style={s.metaText}>{[t.destination, dateRange(t)].filter(Boolean).join(' · ')}</Text>
                  </View>
                  {cd && <Text style={s.countdown}>{cd}</Text>}
                  <Ionicons name={expandedId === t.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted}/>
                </Card>
              </Pressable>
              {editingId === t.id && tripForm(true)}
              {expandedId === t.id && editingId !== t.id && tripDetail(t)}
            </View>
          );
        })
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  headBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  form: { gap: 10, marginBottom: 14 },
  inlineForm: { gap: 10, marginTop: 8, marginBottom: 10, backgroundColor: colors.surfaceMuted },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  field: { gap: 6 },
  row2: { flexDirection: 'row', gap: 10 },
  field2: { flex: 1, gap: 6 },
  label: { color: colors.text, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, color: colors.text, backgroundColor: '#fff', minHeight: 44 },
  multi: { minHeight: 70, textAlignVertical: 'top' },
  flex: { flex: 1 },
  error: { color: '#A33', fontSize: 13 },
  action: { color: colors.forest, fontWeight: '700', fontSize: 13 },
  save: { minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest, borderRadius: radius.sm },
  white: { color: '#fff', fontWeight: '700' },
  delete: { alignItems: 'center', padding: 7 },
  deleteText: { color: '#A33', fontWeight: '700' },
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 8 },
  message: { gap: 7 },
  tripCardWrap: { marginBottom: 10 },
  tripCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  tripIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: colors.forestSoft, alignItems: 'center', justifyContent: 'center' },
  tripName: { fontSize: 16, fontWeight: '800', color: colors.text },
  countdown: { color: colors.clay, fontWeight: '700', fontSize: 12 },
  detail: { marginTop: -2, marginBottom: 12, gap: 10 },
  notesText: { color: colors.text, fontSize: 14, lineHeight: 20 },
  detailHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.7, color: colors.muted, textTransform: 'uppercase' },
  addRow: { flexDirection: 'row', gap: 8 },
  addBtn: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  taskRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sep: { borderBottomWidth: 1, borderBottomColor: colors.border },
  taskText: { flex: 1, fontSize: 15, color: colors.text, fontWeight: '600' },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  metaText: { fontSize: 12, color: colors.muted, marginTop: 3 },
});
