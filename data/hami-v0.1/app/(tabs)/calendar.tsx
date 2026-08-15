import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { DateField } from '@/components/DateField';
import { Card, MemberChips, ScreenHeader, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { CalendarEvent, createCalendarEvent, deleteCalendarEvent, FamilyMember, formatEventTime, loadEventsForDate, toDateKey, updateCalendarEvent } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';

const eventColors = ['#D98D62', '#8BAEBB', '#94A783', '#A18AB6'];
const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const dateFromKey = (key: string) => new Date(`${key}T12:00:00`);

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(toDateKey());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [showForm, setShowForm] = useState(false); const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null); const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(''); const [date, setDate] = useState(toDateKey()); const [startTime, setStartTime] = useState('09:00'); const [endTime, setEndTime] = useState('10:00'); const [allDay, setAllDay] = useState(false); const [location, setLocation] = useState(''); const [description, setDescription] = useState(''); const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const week = useMemo(() => { const active = dateFromKey(selectedDate); const sunday = new Date(active); sunday.setDate(active.getDate() - active.getDay()); return Array.from({ length: 7 }, (_, index) => { const day = new Date(sunday); day.setDate(sunday.getDate() + index); return { key: toDateKey(day), day }; }); }, [selectedDate]);

  const params = useLocalSearchParams<{ new?: string }>();
  useEffect(() => { void loadHousehold(); }, []);
  useEffect(() => { if (householdId) void loadEvents(); }, [selectedDate, householdId]);
  useEffect(() => { if (params.new === '1') { resetForm(); setShowForm(true); } }, [params.new]);

  async function loadHousehold() {
    setLoading(true); setError('');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) { setError('Sign in on Today to view the family calendar.'); setLoading(false); return; }
    const { data: me, error: meError } = await supabase.from('family_members').select('household_id').eq('user_id', session.user.id).single();
    if (meError) { setError(meError.message); setLoading(false); return; }
    const { data: family, error: familyError } = await supabase.from('family_members').select('id, display_name, first_name, relationship, user_id').eq('household_id', me.household_id).eq('is_active', true).order('created_at');
    if (familyError) { setError(familyError.message); setLoading(false); return; }
    setHouseholdId(me.household_id); setMembers(family ?? []);
  }

  async function loadEvents() { setLoading(true); setError(''); try { setEvents(await loadEventsForDate(selectedDate)); } catch (err: any) { setError(err?.message ?? 'Unable to load calendar events.'); } finally { setLoading(false); } }
  function resetForm() { setTitle(''); setDate(selectedDate); setStartTime('09:00'); setEndTime('10:00'); setAllDay(false); setLocation(''); setDescription(''); setAssigneeIds([]); setEditingEvent(null); setConfirmDelete(false); }
  function openEdit(event: CalendarEvent) { const start = new Date(event.startsAt); const end = event.endsAt ? new Date(event.endsAt) : null; setEditingEvent(event); setConfirmDelete(false); setTitle(event.title); setDate(toDateKey(start)); setStartTime(start.toTimeString().slice(0, 5)); setEndTime(end?.toTimeString().slice(0, 5) ?? '10:00'); setAllDay(event.allDay); setLocation(event.location ?? ''); setDescription(event.description ?? ''); setAssigneeIds(event.assignees.map((member) => member.id)); setShowForm(true); }
  async function saveEvent() {
    if (!householdId || !title.trim()) { setError('Add an event title before saving.'); return; }
    setSaving(true); setError('');
    try { const values = { householdId, title, date, startTime, endTime, allDay, location, description, assigneeIds }; if (editingEvent) await updateCalendarEvent({ ...values, id: editingEvent.id }); else await createCalendarEvent(values); setSelectedDate(date); setEvents(await loadEventsForDate(date)); setShowForm(false); resetForm(); }
    catch (err: any) { setError(err?.message ?? 'Unable to save this event.'); } finally { setSaving(false); }
  }
  async function removeEvent() { if (!editingEvent) return; if (!confirmDelete) { setConfirmDelete(true); return; } setSaving(true); setError(''); try { await deleteCalendarEvent(editingEvent.id); setEvents(await loadEventsForDate(selectedDate)); setShowForm(false); resetForm(); } catch (err: any) { setError(err?.message ?? 'Unable to delete this event.'); } finally { setSaving(false); } }
  const toggleAssignee = (id: string) => setAssigneeIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return <Screen>
    <ScreenHeader title="Calendar" right={<Pressable onPress={() => { resetForm(); setShowForm(true); }} accessibilityLabel="Add event"><Ionicons name="add" size={28} color={colors.forest}/></Pressable>}/>
    <View style={s.days}>{week.map(({ key, day }) => <Pressable key={key} onPress={() => setSelectedDate(key)} style={s.day}><Text style={s.dayName}>{dayFormatter.format(day).charAt(0)}</Text><View style={[s.dayNum, key === selectedDate && s.active]}><Text style={[s.num, key === selectedDate && s.activeText]}>{day.getDate()}</Text></View></Pressable>)}</View>
    {showForm && <Card style={s.form}>
      <View style={s.formHead}><Text style={s.formTitle}>{editingEvent ? 'Edit event' : 'New event'}</Text><Pressable onPress={() => { setShowForm(false); resetForm(); }}><Ionicons name="close" size={22} color={colors.muted}/></Pressable></View>
      <TextInput value={title} onChangeText={setTitle} placeholder="Event title" placeholderTextColor={colors.muted} style={s.input}/><Text style={s.label}>Date</Text><DateField value={date} onChange={setDate} mode="date"/>
      <View style={s.allDayRow}><Text style={s.label}>All day</Text><Switch value={allDay} onValueChange={setAllDay} trackColor={{ false: colors.border, true: colors.forestSoft }} thumbColor={allDay ? colors.forest : '#fff'}/></View>
      {!allDay && <View style={s.timeRow}><View style={s.timeInput}><DateField value={startTime} onChange={setStartTime} mode="time"/></View><Text style={s.to}>to</Text><View style={s.timeInput}><DateField value={endTime} onChange={setEndTime} mode="time"/></View></View>}
      <TextInput value={location} onChangeText={setLocation} placeholder="Location (optional)" placeholderTextColor={colors.muted} style={s.input}/><TextInput value={description} onChangeText={setDescription} placeholder="Description (optional)" placeholderTextColor={colors.muted} multiline style={[s.input, s.description]}/>
      <View style={s.assigneeHead}><Text style={s.label}>Assigned to</Text><Pressable onPress={() => setAssigneeIds(assigneeIds.length === members.length ? [] : members.map((member) => member.id))}><Text style={s.allButton}>{assigneeIds.length === members.length ? 'Clear all' : 'All family'}</Text></Pressable></View>
      <View style={s.assignees}>{members.map((member) => <Pressable key={member.id} onPress={() => toggleAssignee(member.id)} style={[s.assignee, assigneeIds.includes(member.id) && s.assigneeActive]}><Text style={[s.assigneeText, assigneeIds.includes(member.id) && s.assigneeTextActive]}>{member.first_name || member.display_name}</Text></Pressable>)}</View>
      <Pressable onPress={saveEvent} disabled={saving} style={[s.saveButton, saving && s.disabled]}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={s.saveText}>{editingEvent ? 'Save changes' : 'Save event'}</Text>}</Pressable>
      {editingEvent && <Pressable onPress={removeEvent} disabled={saving} style={s.deleteButton}><Text style={s.deleteText}>{confirmDelete ? 'Tap again to delete permanently' : 'Delete event'}</Text></Pressable>}
    </Card>}
    <SectionTitle title={dateFormatter.format(dateFromKey(selectedDate))}/>
    {!!error && <Card style={s.message}><Text style={s.error}>{error}</Text><Pressable onPress={loadEvents}><Text style={s.retry}>Try again</Text></Pressable></Card>}
    {loading ? <View style={s.loading}><ActivityIndicator color={colors.forest}/></View> : !error && events.length === 0 ? <Card style={s.message}><Text style={s.empty}>Nothing on the calendar yet.</Text><Text style={s.emptySub}>Tap + to add your first event.</Text></Card> : <Card>{events.map((event, index) => <Pressable key={event.id} onPress={() => openEdit(event)} style={[s.event, index < events.length - 1 && s.sep]}><View style={s.time}><Text style={s.timeText}>{formatEventTime(event)}</Text>{!event.allDay && event.endsAt && <Text style={s.meta}>{new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' }).format(new Date(event.endsAt))}</Text>}</View><View style={[s.line, { backgroundColor: eventColors[index % eventColors.length] }]}/><View style={s.eventContent}><Text style={s.title}>{event.title}</Text>{event.location && <Text style={s.meta}>{event.location}</Text>}</View><MemberChips ids={event.assignees.map((member) => member.id)} memberOptions={event.assignees}/></Pressable>)}</Card>}
  </Screen>;
}

const s = StyleSheet.create({
  days: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10 }, day: { alignItems: 'center', gap: 7 }, dayName: { fontSize: 11, color: colors.muted, fontWeight: '700' }, dayNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, active: { backgroundColor: colors.forest }, num: { fontWeight: '700', color: colors.text }, activeText: { color: '#fff' },
  form: { marginTop: 12, gap: 10 }, formHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, formTitle: { fontSize: 18, fontWeight: '700', color: colors.text }, input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, fontSize: 14, backgroundColor: '#fff' }, description: { minHeight: 80, textAlignVertical: 'top' }, allDayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, label: { color: colors.text, fontSize: 14, fontWeight: '700' }, timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, timeInput: { flex: 1 }, to: { color: colors.muted }, assigneeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }, allButton: { color: colors.forest, fontWeight: '700', fontSize: 13 }, assignees: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, assignee: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 }, assigneeActive: { backgroundColor: colors.forest, borderColor: colors.forest }, assigneeText: { color: colors.text, fontWeight: '600', fontSize: 13 }, assigneeTextActive: { color: '#fff' }, saveButton: { backgroundColor: colors.forest, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', minHeight: 46, marginTop: 4 }, saveText: { color: '#fff', fontWeight: '700' }, deleteButton: { alignItems: 'center', paddingVertical: 8 }, deleteText: { color: '#A33', fontWeight: '700', fontSize: 13 }, disabled: { opacity: 0.65 },
  loading: { minHeight: 150, alignItems: 'center', justifyContent: 'center' }, message: { gap: 7 }, error: { color: '#A33', fontSize: 14 }, retry: { color: colors.forest, fontWeight: '700' }, empty: { color: colors.text, fontWeight: '700' }, emptySub: { color: colors.muted, fontSize: 13 }, event: { flexDirection: 'row', alignItems: 'center', minHeight: 76, gap: 10 }, sep: { borderBottomWidth: 1, borderBottomColor: colors.border }, time: { width: 72 }, timeText: { fontWeight: '700', color: colors.text, fontSize: 12 }, meta: { fontSize: 12, color: colors.muted, marginTop: 3 }, line: { width: 4, height: 44, borderRadius: 4 }, eventContent: { flex: 1 }, title: { fontWeight: '700', fontSize: 15, color: colors.text },
});
