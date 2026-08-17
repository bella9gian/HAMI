import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { loadHouseholdContext } from '@/lib/members';
import { addRecipe, deleteRecipe, loadRecipes, Recipe, updateRecipe } from '@/lib/recipes';

export default function Recipes() {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Recipe | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [ingredients, setIngredients] = useState('');
  const [instructions, setInstructions] = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const ctx = await loadHouseholdContext();
      setHouseholdId(ctx.householdId); setMeId(ctx.currentMember.id);
      setRecipes(await loadRecipes());
    } catch (e: any) { setError(e?.message ?? 'Unable to load recipes.'); }
    finally { setLoading(false); }
  }
  async function refresh() { setRecipes(await loadRecipes()); }

  function reset() { setName(''); setCategory(''); setIngredients(''); setInstructions(''); setConfirmDelete(false); }
  function openNew() { reset(); setEditing(null); setShowNew(true); }
  function startEdit(r: Recipe) {
    if (editing?.id === r.id) { setEditing(null); return; }
    setName(r.name); setCategory(r.category ?? ''); setIngredients(r.ingredients ?? ''); setInstructions(r.instructions ?? '');
    setConfirmDelete(false); setShowNew(false); setEditing(r);
  }
  function closeForms() { setShowNew(false); setEditing(null); reset(); }

  async function save() {
    if (!name.trim() || !householdId || !meId) { setError('Add a recipe name.'); return; }
    setSaving(true); setError('');
    try {
      const values = { name, category, ingredients, instructions };
      if (editing) await updateRecipe(editing.id, values);
      else await addRecipe({ ...values, householdId, createdBy: meId });
      await refresh(); closeForms();
    } catch (e: any) { setError(e?.message ?? 'Unable to save this recipe.'); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!editing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try { await deleteRecipe(editing.id); await refresh(); closeForms(); }
    catch (e: any) { setError(e?.message ?? 'Unable to delete this recipe.'); }
    finally { setSaving(false); }
  }

  function recipeForm(isEdit: boolean) {
    return (
      <Card style={isEdit ? s.inlineForm : s.form}>
        <View style={s.head}><Text style={s.formTitle}>{isEdit ? 'Edit recipe' : 'New recipe'}</Text><Pressable onPress={closeForms}><Ionicons name="close" size={22} color={colors.muted}/></Pressable></View>
        <View style={s.field}><Text style={s.label}>Name</Text><TextInput value={name} onChangeText={setName} placeholder="Recipe name" placeholderTextColor={colors.muted} style={s.input}/></View>
        <View style={s.field}><Text style={s.label}>Category</Text><TextInput value={category} onChangeText={setCategory} placeholder="e.g. Dinner, Dessert" placeholderTextColor={colors.muted} style={s.input}/></View>
        <View style={s.field}><Text style={s.label}>Ingredients</Text><TextInput value={ingredients} onChangeText={setIngredients} placeholder="One per line…" placeholderTextColor={colors.muted} multiline style={[s.input, s.multi]}/></View>
        <View style={s.field}><Text style={s.label}>Instructions</Text><TextInput value={instructions} onChangeText={setInstructions} placeholder="Steps…" placeholderTextColor={colors.muted} multiline style={[s.input, s.multi]}/></View>
        {!!error && <Text style={s.error}>{error}</Text>}
        <Pressable disabled={saving} onPress={save} style={s.save}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={s.white}>{isEdit ? 'Save changes' : 'Add recipe'}</Text>}</Pressable>
        {isEdit && <Pressable onPress={remove} style={s.delete}><Text style={s.deleteText}>{confirmDelete ? 'Tap again to delete' : 'Delete recipe'}</Text></Pressable>}
      </Card>
    );
  }

  return (
    <Screen>
      <View style={s.headBar}>
        <BackButton />
        <Text style={s.title}>Recipes</Text>
        <Pressable onPress={openNew} accessibilityLabel="Add recipe"><Ionicons name="add" size={26} color={colors.forest}/></Pressable>
      </View>

      {showNew && recipeForm(false)}

      {loading ? (
        <View style={s.loading}><ActivityIndicator color={colors.forest}/><Text style={s.meta}>Loading recipes…</Text></View>
      ) : error && !showNew && !editing ? (
        <Card style={s.message}><Text style={s.error}>{error}</Text><Pressable onPress={load}><Text style={s.action}>Try again</Text></Pressable></Card>
      ) : recipes.length === 0 ? (
        <Card><Text style={s.meta}>No recipes yet. Tap + to add your family favorites.</Text></Card>
      ) : (
        <Card>
          {recipes.map((r, i) => (
            <View key={r.id}>
              <Pressable onPress={() => startEdit(r)} style={[s.row, (i < recipes.length - 1 || editing?.id === r.id) && s.sep]}>
                <View style={s.icon}><Ionicons name="restaurant-outline" size={18} color={colors.forest}/></View>
                <View style={{ flex: 1 }}><Text style={s.name}>{r.name}</Text>{!!r.category && <Text style={s.meta}>{r.category}</Text>}</View>
                <Ionicons name={editing?.id === r.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted}/>
              </Pressable>
              {editing?.id === r.id && recipeForm(true)}
            </View>
          ))}
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
  multi: { minHeight: 76, textAlignVertical: 'top' },
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
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.forestSoft, alignItems: 'center', justifyContent: 'center' },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  meta: { fontSize: 12, color: colors.muted, marginTop: 3 },
});
