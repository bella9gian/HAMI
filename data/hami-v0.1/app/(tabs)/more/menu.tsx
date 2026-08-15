import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { toDateKey } from '@/lib/calendar';
import { loadHouseholdContext } from '@/lib/members';
import { loadRecipes, Recipe } from '@/lib/recipes';
import { addMenuEntry, deleteMenuEntry, loadMenuForDate, Meal, MEALS, menuLabel, MenuEntry } from '@/lib/menu';

const dayFormatter = new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' });
const dateFromKey = (key: string) => new Date(`${key}T12:00:00`);
const shiftKey = (key: string, delta: number) => { const d = dateFromKey(key); d.setDate(d.getDate() + delta); return toDateKey(d); };
const mealLabel = (m: Meal) => m.charAt(0).toUpperCase() + m.slice(1);

export default function Menu() {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(toDateKey());
  const [entries, setEntries] = useState<MenuEntry[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [addMeal, setAddMeal] = useState<Meal>('dinner');
  const [addRecipeId, setAddRecipeId] = useState('');
  const [addTitle, setAddTitle] = useState('');

  useEffect(() => { void init(); }, []);
  useEffect(() => { if (householdId) void refresh(); }, [selectedDate, householdId]);

  async function init() {
    setLoading(true); setError('');
    try {
      const ctx = await loadHouseholdContext();
      setHouseholdId(ctx.householdId);
      setRecipes(await loadRecipes());
      setEntries(await loadMenuForDate(selectedDate));
    } catch (e: any) { setError(e?.message ?? 'Unable to load the menu.'); }
    finally { setLoading(false); }
  }
  async function refresh() {
    try { setEntries(await loadMenuForDate(selectedDate)); }
    catch (e: any) { setError(e?.message ?? 'Unable to load the menu.'); }
  }

  async function add() {
    if (!householdId) return;
    if (!addRecipeId && !addTitle.trim()) { setError('Pick a recipe or type what you are having.'); return; }
    setSaving(true); setError('');
    try {
      await addMenuEntry({ householdId, onDate: selectedDate, meal: addMeal, recipeId: addRecipeId || null, title: addTitle });
      setAddRecipeId(''); setAddTitle(''); await refresh();
    } catch (e: any) { setError(e?.message ?? 'Unable to add this meal.'); }
    finally { setSaving(false); }
  }
  async function remove(id: string) {
    try { await deleteMenuEntry(id); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to remove this meal.'); }
  }

  const byMeal = useMemo(() => {
    const map: Record<Meal, MenuEntry[]> = { breakfast: [], lunch: [], dinner: [], snack: [] };
    for (const e of entries) map[e.meal]?.push(e);
    return map;
  }, [entries]);

  return (
    <Screen>
      <View style={s.headBar}>
        <Ionicons name="chevron-back" size={25} color={colors.forest} onPress={() => router.back()}/>
        <Text style={s.title}>Menu</Text>
        <Pressable onPress={() => setSelectedDate(toDateKey())}><Text style={s.todayBtn}>Today</Text></Pressable>
      </View>

      <View style={s.dayNav}>
        <Pressable onPress={() => setSelectedDate((k) => shiftKey(k, -1))} hitSlop={10}><Ionicons name="chevron-back" size={22} color={colors.forest}/></Pressable>
        <Text style={s.dayLabel}>{dayFormatter.format(dateFromKey(selectedDate))}</Text>
        <Pressable onPress={() => setSelectedDate((k) => shiftKey(k, 1))} hitSlop={10}><Ionicons name="chevron-forward" size={22} color={colors.forest}/></Pressable>
      </View>

      <Card style={s.addCard}>
        <View style={s.mealChips}>
          {MEALS.map((m) => (
            <Pressable key={m} onPress={() => setAddMeal(m)} style={[s.mealChip, addMeal === m && s.mealChipOn]}>
              <Text style={[s.mealChipText, addMeal === m && s.white]}>{mealLabel(m)}</Text>
            </Pressable>
          ))}
        </View>
        {recipes.length > 0 && (
          <>
            <Text style={s.label}>From a recipe</Text>
            <View style={s.recipeChips}>
              {recipes.map((r) => (
                <Pressable key={r.id} onPress={() => setAddRecipeId((id) => (id === r.id ? '' : r.id))} style={[s.recipeChip, addRecipeId === r.id && s.recipeChipOn]}>
                  <Text style={[s.recipeChipText, addRecipeId === r.id && s.white]}>{r.name}</Text>
                </Pressable>
              ))}
            </View>
          </>
        )}
        <TextInput
          value={addTitle}
          onChangeText={(t) => { setAddTitle(t); if (t) setAddRecipeId(''); }}
          placeholder={addRecipeId ? 'Using selected recipe' : 'or type what you are having…'}
          placeholderTextColor={colors.muted}
          editable={!addRecipeId}
          style={[s.input, !!addRecipeId && s.inputDisabled]}
        />
        {!!error && <Text style={s.error}>{error}</Text>}
        <Pressable disabled={saving} onPress={add} style={s.save}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={s.white}>Add to {mealLabel(addMeal)}</Text>}</Pressable>
      </Card>

      {loading ? (
        <View style={s.loading}><ActivityIndicator color={colors.forest}/><Text style={s.meta}>Loading menu…</Text></View>
      ) : (
        MEALS.map((m) => (
          <View key={m}>
            <Text style={s.sectionText}>{mealLabel(m)}</Text>
            {byMeal[m].length === 0 ? (
              <Card><Text style={s.meta}>Nothing planned.</Text></Card>
            ) : (
              <Card>
                {byMeal[m].map((e, i) => (
                  <View key={e.id} style={[s.row, i < byMeal[m].length - 1 && s.sep]}>
                    <Ionicons name={e.recipeId ? 'restaurant-outline' : 'fast-food-outline'} size={18} color={colors.clay}/>
                    <Text style={s.name}>{menuLabel(e)}</Text>
                    <Pressable onPress={() => remove(e.id)} accessibilityLabel="Remove" hitSlop={8}><Ionicons name="close" size={18} color={colors.muted}/></Pressable>
                  </View>
                ))}
              </Card>
            )}
          </View>
        ))
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  headBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  todayBtn: { color: colors.forest, fontWeight: '800', fontSize: 13 },
  dayNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  dayLabel: { fontSize: 15, fontWeight: '800', color: colors.text },
  addCard: { gap: 10 },
  mealChips: { flexDirection: 'row', gap: 8 },
  mealChip: { flex: 1, alignItems: 'center', paddingVertical: 9, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  mealChipOn: { backgroundColor: colors.forest },
  mealChipText: { fontWeight: '700', color: colors.muted, fontSize: 12 },
  label: { color: colors.text, fontWeight: '700' },
  recipeChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  recipeChip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  recipeChipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  recipeChipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  white: { color: '#fff', fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, color: colors.text, backgroundColor: '#fff', minHeight: 44 },
  inputDisabled: { backgroundColor: colors.surfaceMuted, color: colors.muted },
  error: { color: '#A33', fontSize: 13 },
  save: { minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest, borderRadius: radius.sm },
  loading: { minHeight: 140, alignItems: 'center', justifyContent: 'center', gap: 8 },
  sectionText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.7, color: colors.muted, textTransform: 'uppercase', marginTop: 20, marginBottom: 10 },
  row: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sep: { borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.muted },
});
