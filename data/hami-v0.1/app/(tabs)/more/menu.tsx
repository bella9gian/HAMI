import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui';
import { DateField } from '@/components/DateField';
import { colors, radius } from '@/constants/theme';
import { toDateKey } from '@/lib/calendar';
import { loadHouseholdContext } from '@/lib/members';
import { loadRecipes, Recipe } from '@/lib/recipes';
import {
  addMenuEntry, copyMenuEntry, deleteMenuEntry, loadMenuForRange, Meal, MEALS, menuLabel, MenuEntry, repeatMenuEntry, updateMenuEntry,
} from '@/lib/menu';

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
const shortDay = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const monthFormatter = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' });
const dateFromKey = (key: string) => new Date(`${key}T12:00:00`);
const shiftKey = (key: string, delta: number) => { const d = dateFromKey(key); d.setDate(d.getDate() + delta); return toDateKey(d); };
const mealLabel = (m: Meal) => m.charAt(0).toUpperCase() + m.slice(1);
const mealOrder: Record<Meal, number> = { breakfast: 0, lunch: 1, dinner: 2, snack: 3 };

type ViewMode = 'day' | 'week' | 'month';
function rangeFor(mode: ViewMode, key: string): [string, string] {
  if (mode === 'day') return [key, key];
  if (mode === 'week') { const d = dateFromKey(key); const sun = new Date(d); sun.setDate(d.getDate() - d.getDay()); const sat = new Date(sun); sat.setDate(sun.getDate() + 6); return [toDateKey(sun), toDateKey(sat)]; }
  const d = dateFromKey(key); const first = new Date(d.getFullYear(), d.getMonth(), 1, 12); const last = new Date(d.getFullYear(), d.getMonth() + 1, 0, 12); return [toDateKey(first), toDateKey(last)];
}
function daysInRange(a: string, b: string): string[] { const out: string[] = []; let c = a; let guard = 0; while (c <= b && guard < 40) { out.push(c); c = shiftKey(c, 1); guard++; } return out; }

export default function Menu() {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [selectedDate, setSelectedDate] = useState(toDateKey());
  const [entriesByDate, setEntriesByDate] = useState<Record<string, MenuEntry[]>>({});
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');

  const [addMeal, setAddMeal] = useState<Meal>('dinner');
  const [addRecipeId, setAddRecipeId] = useState('');
  const [addTitle, setAddTitle] = useState('');

  const [editingId, setEditingId] = useState<string | null>(null);
  const [eMeal, setEMeal] = useState<Meal>('dinner');
  const [eRecipeId, setERecipeId] = useState('');
  const [eTitle, setETitle] = useState('');
  const [copyDate, setCopyDate] = useState('');
  const [repeatFreq, setRepeatFreq] = useState<'daily' | 'weekly'>('weekly');
  const [repeatUntil, setRepeatUntil] = useState('');

  useEffect(() => { void init(); }, []);
  useEffect(() => { if (householdId) void refresh(); }, [selectedDate, viewMode, householdId]);

  async function init() {
    setLoading(true); setError('');
    try {
      const ctx = await loadHouseholdContext();
      setHouseholdId(ctx.householdId);
      setRecipes(await loadRecipes());
      const [a, b] = rangeFor(viewMode, selectedDate);
      setEntriesByDate(await loadMenuForRange(a, b));
    } catch (e: any) { setError(e?.message ?? 'Unable to load the menu.'); }
    finally { setLoading(false); }
  }
  async function refresh() {
    try { const [a, b] = rangeFor(viewMode, selectedDate); setEntriesByDate(await loadMenuForRange(a, b)); }
    catch (e: any) { setError(e?.message ?? 'Unable to load the menu.'); }
  }
  const dayList = (key: string) => [...(entriesByDate[key] ?? [])].sort((x, y) => mealOrder[x.meal] - mealOrder[y.meal]);

  function shift(delta: number) {
    if (viewMode === 'day') setSelectedDate((k) => shiftKey(k, delta));
    else if (viewMode === 'week') setSelectedDate((k) => shiftKey(k, delta * 7));
    else { const d = dateFromKey(selectedDate); setSelectedDate(toDateKey(new Date(d.getFullYear(), d.getMonth() + delta, 1, 12))); }
    setEditingId(null);
  }
  const navLabel = viewMode === 'month' ? monthFormatter.format(dateFromKey(selectedDate)) : viewMode === 'week' ? `Week of ${shortDay.format(dateFromKey(rangeFor('week', selectedDate)[0]))}` : dayFormatter.format(dateFromKey(selectedDate));

  async function add() {
    if (!householdId) return;
    if (!addRecipeId && !addTitle.trim()) { setError('Pick a recipe or type what you are having.'); return; }
    setSaving(true); setError('');
    try { await addMenuEntry({ householdId, onDate: selectedDate, meal: addMeal, recipeId: addRecipeId || null, title: addTitle }); setAddRecipeId(''); setAddTitle(''); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to add this meal.'); }
    finally { setSaving(false); }
  }

  function startEdit(entry: MenuEntry) {
    if (editingId === entry.id) { setEditingId(null); return; }
    setEMeal(entry.meal); setERecipeId(entry.recipeId ?? ''); setETitle(entry.recipeId ? '' : (entry.title ?? ''));
    setCopyDate(shiftKey(entry.onDate, 1)); setRepeatFreq('weekly'); setRepeatUntil(''); setNote(''); setError(''); setEditingId(entry.id);
  }
  async function saveEdit(id: string) {
    setSaving(true); setError('');
    try { await updateMenuEntry(id, { meal: eMeal, recipeId: eRecipeId || null, title: eTitle }); setEditingId(null); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to save this meal.'); }
    finally { setSaving(false); }
  }
  async function removeEntry(id: string) {
    try { await deleteMenuEntry(id); setEditingId(null); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to remove this meal.'); }
  }
  async function copy(entry: MenuEntry) {
    if (!householdId || !copyDate) return;
    setSaving(true); setError('');
    try { await copyMenuEntry(entry, householdId, copyDate); setNote(`Copied to ${shortDay.format(dateFromKey(copyDate))}.`); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to copy this meal.'); }
    finally { setSaving(false); }
  }
  async function repeat(entry: MenuEntry) {
    if (!householdId || !repeatUntil) { setError('Pick a "repeat until" date.'); return; }
    setSaving(true); setError('');
    try { const n = await repeatMenuEntry(entry, householdId, repeatFreq, repeatUntil); setNote(`Added ${n} ${repeatFreq} cop${n === 1 ? 'y' : 'ies'}.`); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to repeat this meal.'); }
    finally { setSaving(false); }
  }

  const byMealToday = useMemo(() => {
    const map: Record<Meal, MenuEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const e of (entriesByDate[selectedDate] ?? [])) map[e.meal]?.push(e);
    return map;
  }, [entriesByDate, selectedDate]);

  function recipePicker(selected: string, onSelect: (id: string) => void) {
    if (recipes.length === 0) return <Pressable onPress={() => router.push('/more/recipes')}><Text style={s.link}>+ Add recipes to pick from</Text></Pressable>;
    return (
      <>
        <View style={s.head}><Text style={s.label}>From a recipe</Text><Pressable onPress={() => router.push('/more/recipes')}><Text style={s.link}>Manage</Text></Pressable></View>
        <View style={s.recipeChips}>{recipes.map((r) => <Pressable key={r.id} onPress={() => onSelect(selected === r.id ? '' : r.id)} style={[s.recipeChip, selected === r.id && s.recipeChipOn]}><Text style={[s.recipeChipText, selected === r.id && s.white]}>{r.name}</Text></Pressable>)}</View>
      </>
    );
  }

  function editor(entry: MenuEntry) {
    return (
      <Card style={s.editor}>
        <View style={s.mealChips}>{MEALS.map((m) => <Pressable key={m} onPress={() => setEMeal(m)} style={[s.mealChip, eMeal === m && s.mealChipOn]}><Text style={[s.mealChipText, eMeal === m && s.white]}>{mealLabel(m)}</Text></Pressable>)}</View>
        {recipePicker(eRecipeId, (id) => { setERecipeId(id); if (id) setETitle(''); })}
        <TextInput value={eTitle} onChangeText={(t) => { setETitle(t); if (t) setERecipeId(''); }} editable={!eRecipeId} placeholder={eRecipeId ? 'Using selected recipe' : 'or type what you are having…'} placeholderTextColor={colors.muted} style={[s.input, !!eRecipeId && s.inputDisabled]}/>
        <Pressable disabled={saving} onPress={() => saveEdit(entry.id)} style={s.save}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={s.white}>Save changes</Text>}</Pressable>
        <View style={s.divider}/>
        <Text style={s.label}>Copy to another day</Text>
        <View style={s.rowGap}><View style={s.flex}><DateField value={copyDate} onChange={setCopyDate} mode="date"/></View><Pressable disabled={saving} onPress={() => copy(entry)} style={s.smallBtn}><Text style={s.white}>Copy</Text></Pressable></View>
        <Text style={s.label}>Repeat</Text>
        <View style={s.rowGap}>
          {(['daily', 'weekly'] as const).map((f) => <Pressable key={f} onPress={() => setRepeatFreq(f)} style={[s.freqChip, repeatFreq === f && s.mealChipOn]}><Text style={[s.mealChipText, repeatFreq === f && s.white]}>{f[0].toUpperCase() + f.slice(1)}</Text></Pressable>)}
          <View style={s.flex}><DateField value={repeatUntil} onChange={setRepeatUntil} mode="date"/></View>
          <Pressable disabled={saving} onPress={() => repeat(entry)} style={s.smallBtn}><Text style={s.white}>Repeat</Text></Pressable>
        </View>
        {!!note && <Text style={s.note}>{note}</Text>}
        {!!error && <Text style={s.error}>{error}</Text>}
        <Pressable onPress={() => removeEntry(entry.id)} style={s.delete}><Text style={s.deleteText}>Remove</Text></Pressable>
      </Card>
    );
  }

  function overviewDay(key: string) {
    const list = dayList(key);
    const isToday = key === toDateKey();
    return (
      <View key={key}>
        <Pressable onPress={() => { setSelectedDate(key); setViewMode('day'); setEditingId(null); }} style={s.overviewHead}>
          <Text style={s.overviewDate}>{shortDay.format(dateFromKey(key))}{isToday ? ' · Today' : ''}</Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted}/>
        </Pressable>
        {list.length === 0 ? <Card style={s.thin}><Text style={s.meta}>Nothing planned.</Text></Card> : (
          <Card style={s.thin}>{list.map((e, i) => (
            <View key={e.id} style={[s.overRow, i < list.length - 1 && s.sep]}>
              <Text style={s.overMeal}>{mealLabel(e.meal)}</Text>
              <Text style={s.overName}>{menuLabel(e)}</Text>
            </View>
          ))}</Card>
        )}
      </View>
    );
  }

  return (
    <Screen>
      <View style={s.headBar}>
        <Ionicons name="chevron-back" size={25} color={colors.forest} onPress={() => router.back()}/>
        <Text style={s.title}>Menu</Text>
        <Pressable onPress={() => setSelectedDate(toDateKey())}><Text style={s.todayBtn}>Today</Text></Pressable>
      </View>

      <View style={s.segment}>
        {(['day', 'week', 'month'] as ViewMode[]).map((m) => (
          <Pressable key={m} onPress={() => { setViewMode(m); setEditingId(null); }} style={[s.segmentBtn, viewMode === m && s.segmentOn]}><Text style={[s.segmentText, viewMode === m && s.white]}>{m[0].toUpperCase() + m.slice(1)}</Text></Pressable>
        ))}
      </View>

      <View style={s.dayNav}>
        <Pressable onPress={() => shift(-1)} hitSlop={10}><Ionicons name="chevron-back" size={22} color={colors.forest}/></Pressable>
        <Text style={s.dayLabel}>{navLabel}</Text>
        <Pressable onPress={() => shift(1)} hitSlop={10}><Ionicons name="chevron-forward" size={22} color={colors.forest}/></Pressable>
      </View>

      {viewMode === 'day' && (
        <Card style={s.addCard}>
          <View style={s.mealChips}>{MEALS.map((m) => <Pressable key={m} onPress={() => setAddMeal(m)} style={[s.mealChip, addMeal === m && s.mealChipOn]}><Text style={[s.mealChipText, addMeal === m && s.white]}>{mealLabel(m)}</Text></Pressable>)}</View>
          {recipePicker(addRecipeId, (id) => { setAddRecipeId(id); if (id) setAddTitle(''); })}
          <TextInput value={addTitle} onChangeText={(t) => { setAddTitle(t); if (t) setAddRecipeId(''); }} editable={!addRecipeId} placeholder={addRecipeId ? 'Using selected recipe' : 'or type what you are having…'} placeholderTextColor={colors.muted} style={[s.input, !!addRecipeId && s.inputDisabled]}/>
          {!editingId && !!error && <Text style={s.error}>{error}</Text>}
          <Pressable disabled={saving} onPress={add} style={s.save}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={s.white}>Add to {mealLabel(addMeal)}</Text>}</Pressable>
        </Card>
      )}

      {loading ? (
        <View style={s.loading}><ActivityIndicator color={colors.forest}/><Text style={s.meta}>Loading menu…</Text></View>
      ) : viewMode === 'day' ? (
        MEALS.map((m) => (
          <View key={m}>
            <Text style={s.sectionText}>{mealLabel(m)}</Text>
            {byMealToday[m].length === 0 ? <Card><Text style={s.meta}>Nothing planned.</Text></Card> : (
              <Card>{byMealToday[m].map((e, i) => (
                <View key={e.id}>
                  <Pressable onPress={() => startEdit(e)} style={[s.row, (i < byMealToday[m].length - 1 || editingId === e.id) && s.sep]}>
                    <Ionicons name={e.recipeId ? 'restaurant-outline' : 'fast-food-outline'} size={18} color={colors.clay}/>
                    <Text style={s.name}>{menuLabel(e)}</Text>
                    <Ionicons name={editingId === e.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted}/>
                  </Pressable>
                  {editingId === e.id && editor(e)}
                </View>
              ))}</Card>
            )}
          </View>
        ))
      ) : (
        (() => {
          const [a, b] = rangeFor(viewMode, selectedDate);
          const days = viewMode === 'week' ? daysInRange(a, b) : daysInRange(a, b).filter((k) => (entriesByDate[k] ?? []).length > 0);
          if (viewMode === 'month' && days.length === 0) return <Card><Text style={s.meta}>No meals planned this month. Switch to Day to add some.</Text></Card>;
          return <View style={s.overviewList}>{days.map((k) => overviewDay(k))}</View>;
        })()
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  headBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  todayBtn: { color: colors.forest, fontWeight: '800', fontSize: 13 },
  segment: { flexDirection: 'row', gap: 6, backgroundColor: colors.surfaceMuted, borderRadius: radius.pill, padding: 4, marginBottom: 12 },
  segmentBtn: { flex: 1, alignItems: 'center', paddingVertical: 8, borderRadius: radius.pill },
  segmentOn: { backgroundColor: colors.forest },
  segmentText: { fontWeight: '700', color: colors.muted, fontSize: 13 },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dayLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  addCard: { gap: 10 },
  editor: { gap: 10, marginTop: 10, marginBottom: 10, backgroundColor: colors.surfaceMuted },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  mealChips: { flexDirection: 'row', gap: 8 },
  mealChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  mealChipOn: { backgroundColor: colors.forest },
  mealChipText: { fontWeight: '700', color: colors.muted, fontSize: 12 },
  label: { color: colors.text, fontWeight: '700' },
  link: { color: colors.forest, fontWeight: '700', fontSize: 13 },
  recipeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recipeChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  recipeChipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  recipeChipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  white: { color: '#fff', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, color: colors.text, backgroundColor: '#fff', minHeight: 44 },
  inputDisabled: { backgroundColor: colors.surfaceMuted, color: colors.muted },
  error: { color: '#A33', fontSize: 13 },
  note: { color: colors.forest, fontSize: 13, fontWeight: '600' },
  save: { minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest, borderRadius: radius.sm },
  divider: { height: 1, backgroundColor: colors.border, marginVertical: 2 },
  rowGap: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  flex: { flex: 1, minWidth: 140 },
  freqChip: { paddingHorizontal: 14, paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  smallBtn: { paddingHorizontal: 16, minHeight: 44, borderRadius: radius.sm, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  delete: { alignItems: 'center', padding: 7 },
  deleteText: { color: '#A33', fontWeight: '700' },
  loading: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 8 },
  sectionText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.7, color: colors.muted, textTransform: 'uppercase', marginTop: 20, marginBottom: 10 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sep: { borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
  overviewList: { gap: 4 },
  overviewHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 16, marginBottom: 8 },
  overviewDate: { fontSize: 14, fontWeight: '800', color: colors.text },
  thin: { paddingVertical: 10 },
  overRow: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 12 },
  overMeal: { width: 74, fontSize: 12, fontWeight: '700', color: colors.clay },
  overName: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
});
