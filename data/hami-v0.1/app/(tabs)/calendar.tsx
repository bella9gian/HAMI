import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, NativeScrollEvent, NativeSyntheticEvent, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { DateField } from '@/components/DateField';
import { Card, MemberChips, ScreenHeader, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { CalendarEvent, createCalendarEvent, deleteCalendarEvent, FamilyMember, formatEventTime, loadEventDays, loadEventsForDate, toDateKey, updateCalendarEvent } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';

const eventColors = ['#D98D62', '#8BAEBB', '#94A783', '#A18AB6'];
const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'short' });
const dateFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'long', day: 'numeric' });
const dateFromKey = (key: string) => new Date(`${key}T12:00:00`);
const monthYearFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEK_SPAN = 26; // weeks navigable either side of the anchor

function addMinutesToTime(time: string, mins: number): string {
  const [h, m] = time.split(':').map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return time;
  let total = (h * 60 + m + mins) % (24 * 60);
  if (total < 0) total += 24 * 60;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}
function minutesBetweenTimes(start: string, end: string): number {
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return 60;
  return (eh * 60 + em) - (sh * 60 + sm);
}

export default function Calendar() {
  const [selectedDate, setSelectedDate] = useState(toDateKey());
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true); const [saving, setSaving] = useState(false); const [error, setError] = useState(''); const [showForm, setShowForm] = useState(false); const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null); const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState(''); const [date, setDate] = useState(toDateKey()); const [startTime, setStartTime] = useState('09:00'); const [endTime, setEndTime] = useState('10:00'); const [allDay, setAllDay] = useState(false); const [location, setLocation] = useState(''); const [description, setDescription] = useState(''); const [assigneeIds, setAssigneeIds] = useState<string[]>([]);
  const stripRef = useRef<ScrollView>(null);
  const [stripWidth, setStripWidth] = useState(0);
  const [centerWeek, setCenterWeek] = useState(WEEK_SPAN);
  const didInitStrip = useRef(false);
  const todayKey = toDateKey();
  const [anchorKey, setAnchorKey] = useState(todayKey);
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(dateFromKey(todayKey).getFullYear());
  const [eventDays, setEventDays] = useState<Set<string>>(new Set());
  const weeks = useMemo(() => {
    const base = dateFromKey(anchorKey);
    const sunday = new Date(base); sunday.setDate(base.getDate() - base.getDay());
    return Array.from({ length: WEEK_SPAN * 2 + 1 }, (_, wi) => {
      const start = new Date(sunday); start.setDate(sunday.getDate() + (wi - WEEK_SPAN) * 7);
      return Array.from({ length: 7 }, (_, di) => { const day = new Date(start); day.setDate(start.getDate() + di); return { key: toDateKey(day), day }; });
    });
  }, [anchorKey]);
  const monthLabel = monthYearFormatter.format(weeks[centerWeek]?.[3]?.day ?? dateFromKey(anchorKey));

  function scrollToCenter(animated: boolean) {
    if (stripWidth) requestAnimationFrame(() => stripRef.current?.scrollTo({ x: WEEK_SPAN * stripWidth, animated }));
  }
  useEffect(() => {
    if (stripWidth && !didInitStrip.current) { didInitStrip.current = true; scrollToCenter(false); }
  }, [stripWidth]);
  useEffect(() => { setCenterWeek(WEEK_SPAN); scrollToCenter(false); }, [anchorKey]);
  useEffect(() => { if (householdId) void refreshEventDays(); }, [householdId, anchorKey]);

  async function refreshEventDays() {
    try {
      const first = weeks[0][0].key;
      const last = weeks[weeks.length - 1][6].key;
      setEventDays(new Set(await loadEventDays(first, last)));
    } catch { /* ignore — dots are best-effort */ }
  }

  function onStripScrollEnd(e: NativeSyntheticEvent<NativeScrollEvent>) {
    if (!stripWidth) return;
    const index = Math.round(e.nativeEvent.contentOffset.x / stripWidth);
    if (index !== centerWeek) setCenterWeek(index);
  }
  function goWeek(delta: number) {
    const index = Math.min(weeks.length - 1, Math.max(0, centerWeek + delta));
    stripRef.current?.scrollTo({ x: index * stripWidth, animated: true });
    setCenterWeek(index);
  }
  function goToday() {
    setSelectedDate(todayKey);
    if (anchorKey !== todayKey) setAnchorKey(todayKey);
    else { setCenterWeek(WEEK_SPAN); scrollToCenter(true); }
  }
  function openMonthPicker() {
    setPickerYear(dateFromKey(weeks[centerWeek]?.[3]?.key ?? anchorKey).getFullYear());
    setMonthPickerOpen((v) => !v);
  }
  function jumpToMonth(year: number, month0: number) {
    const key = `${year}-${String(month0 + 1).padStart(2, '0')}-01`;
    setSelectedDate(key); setAnchorKey(key); setMonthPickerOpen(false);
  }
  function onStartTimeChange(value: string) {
    const duration = minutesBetweenTimes(startTime, endTime);
    setStartTime(value);
    setEndTime(addMinutesToTime(value, duration > 0 ? duration : 60));
  }

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
    try { const values = { householdId, title, date, startTime, endTime, allDay, location, description, assigneeIds }; if (editingEvent) await updateCalendarEvent({ ...values, id: editingEvent.id }); else await createCalendarEvent(values); setSelectedDate(date); setEvents(await loadEventsForDate(date)); await refreshEventDays(); setShowForm(false); resetForm(); }
    catch (err: any) { setError(err?.message ?? 'Unable to save this event.'); } finally { setSaving(false); }
  }
  async function removeEvent() { if (!editingEvent) return; if (!confirmDelete) { setConfirmDelete(true); return; } setSaving(true); setError(''); try { await deleteCalendarEvent(editingEvent.id); setEvents(await loadEventsForDate(selectedDate)); await refreshEventDays(); setShowForm(false); resetForm(); } catch (err: any) { setError(err?.message ?? 'Unable to delete this event.'); } finally { setSaving(false); } }
  const toggleAssignee = (id: string) => setAssigneeIds((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id]);

  return <Screen>
    <ScreenHeader title="Calendar" right={<Pressable onPress={() => { resetForm(); setShowForm(true); }} accessibilityLabel="Add event"><Ionicons name="add" size={28} color={colors.forest}/></Pressable>}/>
    <View style={s.calStrip}>
      <View style={s.calHead}>
        <Pressable onPress={openMonthPicker} hitSlop={8} style={s.monthLabelWrap} accessibilityLabel="Pick month or year">
          <Text style={s.monthLabel}>{monthLabel}</Text>
          <Ionicons name={monthPickerOpen ? 'chevron-up' : 'chevron-down'} size={16} color={colors.forest}/>
        </Pressable>
        <View style={s.calNav}>
          <Pressable onPress={goToday} hitSlop={8} accessibilityLabel="Go to today"><Text style={s.todayBtn}>Today</Text></Pressable>
          <Pressable onPress={() => goWeek(-1)} hitSlop={10} accessibilityLabel="Previous week"><Ionicons name="chevron-back" size={20} color={colors.forest}/></Pressable>
          <Pressable onPress={() => goWeek(1)} hitSlop={10} accessibilityLabel="Next week"><Ionicons name="chevron-forward" size={20} color={colors.forest}/></Pressable>
        </View>
      </View>
      {monthPickerOpen && (
        <Card style={s.monthPicker}>
          <View style={s.yearRow}>
            <Pressable onPress={() => setPickerYear((y) => y - 1)} hitSlop={10}><Ionicons name="chevron-back" size={20} color={colors.forest}/></Pressable>
            <Text style={s.yearText}>{pickerYear}</Text>
            <Pressable onPress={() => setPickerYear((y) => y + 1)} hitSlop={10}><Ionicons name="chevron-forward" size={20} color={colors.forest}/></Pressable>
          </View>
          <View style={s.monthGrid}>
            {MONTHS.map((m, i) => (
              <Pressable key={m} onPress={() => jumpToMonth(pickerYear, i)} style={s.monthChip}><Text style={s.monthChipText}>{m}</Text></Pressable>
            ))}
          </View>
        </Card>
      )}
      <View onLayout={(e) => setStripWidth(e.nativeEvent.layout.width)}>
        {stripWidth > 0 && (
          <ScrollView ref={stripRef} horizontal pagingEnabled showsHorizontalScrollIndicator={false} onMomentumScrollEnd={onStripScrollEnd}>
            {weeks.map((wk, wi) => (
              <View key={wi} style={[s.days, { width: stripWidth }]}>
                {wk.map(({ key, day }) => (
                  <Pressable key={key} onPress={() => setSelectedDate(key)} style={s.day}>
                    <Text style={s.dayName}>{dayFormatter.format(day).charAt(0)}</Text>
                    <View style={[s.dayNum, key === todayKey && key !== selectedDate && s.todayRing, key === selectedDate && s.active]}>
                      <Text style={[s.num, key === todayKey && key !== selectedDate && s.todayText, key === selectedDate && s.activeText]}>{day.getDate()}</Text>
                    </View>
                    <View style={[s.dot, eventDays.has(key) && s.dotOn, key === selectedDate && eventDays.has(key) && s.dotSelected]}/>
                  </Pressable>
                ))}
              </View>
            ))}
          </ScrollView>
        )}
      </View>
    </View>
    {showForm && <Card style={s.form}>
      <View style={s.formHead}><Text style={s.formTitle}>{editingEvent ? 'Edit event' : 'New event'}</Text><Pressable onPress={() => { setShowForm(false); resetForm(); }}><Ionicons name="close" size={22} color={colors.muted}/></Pressable></View>
      <TextInput value={title} onChangeText={setTitle} placeholder="Event title" placeholderTextColor={colors.muted} style={s.input}/><Text style={s.label}>Date</Text><DateField value={date} onChange={setDate} mode="date"/>
      <View style={s.allDayRow}><Text style={s.label}>All day</Text><Switch value={allDay} onValueChange={setAllDay} trackColor={{ false: colors.border, true: colors.forestSoft }} thumbColor={allDay ? colors.forest : '#fff'}/></View>
      {!allDay && <View style={s.timeRow}><View style={s.timeInput}><DateField value={startTime} onChange={onStartTimeChange} mode="time"/></View><Text style={s.to}>to</Text><View style={s.timeInput}><DateField value={endTime} onChange={setEndTime} mode="time"/></View></View>}
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
  calStrip: { paddingTop: 4 }, calHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 4, paddingBottom: 4 }, monthLabelWrap: { flexDirection: 'row', alignItems: 'center', gap: 4 }, monthLabel: { fontSize: 15, fontWeight: '800', color: colors.text }, calNav: { flexDirection: 'row', alignItems: 'center', gap: 16 }, todayBtn: { color: colors.forest, fontWeight: '800', fontSize: 13 },
  monthPicker: { marginTop: 6, gap: 12 }, yearRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 24 }, yearText: { fontSize: 16, fontWeight: '800', color: colors.text, minWidth: 60, textAlign: 'center' }, monthGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' }, monthChip: { width: '23%', alignItems: 'center', paddingVertical: 10, borderRadius: radius.sm, backgroundColor: colors.surfaceMuted }, monthChipText: { fontWeight: '700', color: colors.text },
  days: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8 }, day: { alignItems: 'center', gap: 5, flex: 1 }, dayName: { fontSize: 11, color: colors.muted, fontWeight: '700' }, dayNum: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' }, active: { backgroundColor: colors.forest }, num: { fontWeight: '700', color: colors.text }, activeText: { color: '#fff' }, todayRing: { borderWidth: 1.5, borderColor: colors.forest }, todayText: { color: colors.forest }, dot: { width: 5, height: 5, borderRadius: 3, backgroundColor: 'transparent' }, dotOn: { backgroundColor: colors.clay }, dotSelected: { backgroundColor: colors.forest },
  form: { marginTop: 12, gap: 10 }, formHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, formTitle: { fontSize: 18, fontWeight: '700', color: colors.text }, input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, paddingHorizontal: 12, paddingVertical: 11, color: colors.text, fontSize: 14, backgroundColor: '#fff' }, description: { minHeight: 80, textAlignVertical: 'top' }, allDayRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }, label: { color: colors.text, fontSize: 14, fontWeight: '700' }, timeRow: { flexDirection: 'row', alignItems: 'center', gap: 8 }, timeInput: { flex: 1 }, to: { color: colors.muted }, assigneeHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }, allButton: { color: colors.forest, fontWeight: '700', fontSize: 13 }, assignees: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, assignee: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 }, assigneeActive: { backgroundColor: colors.forest, borderColor: colors.forest }, assigneeText: { color: colors.text, fontWeight: '600', fontSize: 13 }, assigneeTextActive: { color: '#fff' }, saveButton: { backgroundColor: colors.forest, borderRadius: radius.sm, alignItems: 'center', justifyContent: 'center', minHeight: 46, marginTop: 4 }, saveText: { color: '#fff', fontWeight: '700' }, deleteButton: { alignItems: 'center', paddingVertical: 8 }, deleteText: { color: '#A33', fontWeight: '700', fontSize: 13 }, disabled: { opacity: 0.65 },
  loading: { minHeight: 150, alignItems: 'center', justifyContent: 'center' }, message: { gap: 7 }, error: { color: '#A33', fontSize: 14 }, retry: { color: colors.forest, fontWeight: '700' }, empty: { color: colors.text, fontWeight: '700' }, emptySub: { color: colors.muted, fontSize: 13 }, event: { flexDirection: 'row', alignItems: 'center', minHeight: 76, gap: 10 }, sep: { borderBottomWidth: 1, borderBottomColor: colors.border }, time: { width: 72 }, timeText: { fontWeight: '700', color: colors.text, fontSize: 12 }, meta: { fontSize: 12, color: colors.muted, marginTop: 3 }, line: { width: 4, height: 44, borderRadius: 4 }, eventContent: { flex: 1 }, title: { fontWeight: '700', fontSize: 15, color: colors.text },
});
