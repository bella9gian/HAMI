import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { loadHouseholdContext } from '@/lib/members';
import { addBeautyItem, BEAUTY_CATEGORIES, BeautyItem, deleteBeautyItem, loadBeautyItems, updateBeautyItem } from '@/lib/beauty';

export default function Beauty() {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [items, setItems] = useState<BeautyItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<BeautyItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>('Skincare');
  const [brand, setBrand] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const ctx = await loadHouseholdContext();
      setHouseholdId(ctx.householdId); setMeId(ctx.currentMember.id);
      setItems(await loadBeautyItems());
    } catch (e: any) { setError(e?.message ?? 'Unable to load your beauty items.'); }
    finally { setLoading(false); }
  }
  async function refresh() { setItems(await loadBeautyItems()); }

  function reset() { setName(''); setCategory('Skincare'); setBrand(''); setNotes(''); setConfirmDelete(false); }
  function openNew() { reset(); setEditing(null); setShowNew(true); }
  function startEdit(x: BeautyItem) {
    if (editing?.id === x.id) { setEditing(null); return; }
    setName(x.name); setCategory(x.category ?? 'Other'); setBrand(x.brand ?? ''); setNotes(x.notes ?? '');
    setConfirmDelete(false); setShowNew(false); setEditing(x);
  }
  function closeForms() { setShowNew(false); setEditing(null); reset(); }

  async function save() {
    if (!name.trim() || !householdId || !meId) { setError('Add a product name.'); return; }
    setSaving(true); setError('');
    try {
      const values = { name, category, brand, notes };
      if (editing) await updateBeautyItem(editing.id, values);
      else await addBeautyItem({ ...values, householdId, createdBy: meId });
      await refresh(); closeForms();
    } catch (e: any) { setError(e?.message ?? 'Unable to save this product.'); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!editing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try { await deleteBeautyItem(editing.id); await refresh(); closeForms(); }
    catch (e: any) { setError(e?.message ?? 'Unable to delete this product.'); }
    finally { setSaving(false); }
  }

  const groups = useMemo(() => {
    const order = [...BEAUTY_CATEGORIES];
    const byCat: Record<string, BeautyItem[]> = {};
    for (const x of items) { const c = x.category || 'Other'; (byCat[c] ??= []).push(x); }
    const cats = Object.keys(byCat).sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b);
      return (ia === -1 ? 99 : ia) - (ib === -1 ? 99 : ib) || a.localeCompare(b);
    });
    return cats.map((c) => ({ category: c, items: byCat[c] }));
  }, [items]);

  function form(isEdit: boolean) {
    return (
      <Card style={isEdit ? s.inlineForm : s.form}>
        <View style={s.head}><Text style={s.formTitle}>{isEdit ? 'Edit product' : 'New product'}</Text><Pressable onPress={closeForms}><Ionicons name="close" size={22} color={colors.muted}/></Pressable></View>
        <View style={s.field}><Text style={s.label}>Product</Text><TextInput value={name} onChangeText={setName} placeholder="e.g. Vitamin C serum" placeholderTextColor={colors.muted} style={s.input}/></View>
        <Text style={s.label}>Category</Text>
        <View style={s.chips}>{BEAUTY_CATEGORIES.map((c) => <Pressable key={c} onPress={() => setCategory(c)} style={[s.chip, category === c && s.chipOn]}><Text style={[s.chipText, category === c && s.white]}>{c}</Text></Pressable>)}</View>
        <View style={s.field}><Text style={s.label}>Brand</Text><TextInput value={brand} onChangeText={setBrand} placeholder="Brand (optional)" placeholderTextColor={colors.muted} style={s.input}/></View>
        <View style={s.field}><Text style={s.label}>Notes</Text><TextInput value={notes} onChangeText={setNotes} placeholder="Shade, routine step, etc." placeholderTextColor={colors.muted} multiline style={[s.input, s.multi]}/></View>
        {!!error && <Text style={s.error}>{error}</Text>}
        <Pressable disabled={saving} onPress={save} style={s.save}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={s.white}>{isEdit ? 'Save changes' : 'Add product'}</Text>}</Pressable>
        {isEdit && <Pressable onPress={remove} style={s.delete}><Text style={s.deleteText}>{confirmDelete ? 'Tap again to delete' : 'Delete product'}</Text></Pressable>}
      </Card>
    );
  }

  return (
    <Screen>
      <View style={s.headBar}>
        <BackButton />
        <Text style={s.title}>Beauty</Text>
        <Pressable onPress={openNew} accessibilityLabel="Add product"><Ionicons name="add" size={26} color={colors.forest}/></Pressable>
      </View>

      {showNew && form(false)}

      {loading ? (
        <View style={s.loading}><ActivityIndicator color={colors.forest}/><Text style={s.metaText}>Loading…</Text></View>
      ) : error && !showNew && !editing ? (
        <Card style={s.message}><Text style={s.error}>{error}</Text><Pressable onPress={load}><Text style={s.action}>Try again</Text></Pressable></Card>
      ) : items.length === 0 ? (
        <Card><Text style={s.metaText}>No products yet. Tap + to add skincare or makeup.</Text></Card>
      ) : (
        groups.map((g) => (
          <View key={g.category}>
            <Text style={s.sectionText}>{g.category}</Text>
            <Card>
              {g.items.map((x, i) => (
                <View key={x.id}>
                  <Pressable onPress={() => startEdit(x)} style={[s.row, (i < g.items.length - 1 || editing?.id === x.id) && s.sep]}>
                    <View style={{ flex: 1 }}><Text style={s.name}>{x.name}</Text>{!!(x.brand || x.notes) && <Text style={s.metaText}>{[x.brand, x.notes].filter(Boolean).join(' · ')}</Text>}</View>
                    <Ionicons name={editing?.id === x.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted}/>
                  </Pressable>
                  {editing?.id === x.id && form(true)}
                </View>
              ))}
            </Card>
          </View>
        ))
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
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  chipOn: { backgroundColor: colors.forest, borderColor: colors.forest },
  chipText: { color: colors.text, fontWeight: '600', fontSize: 13 },
  white: { color: '#fff', fontWeight: '700' },
  error: { color: '#A33', fontSize: 13 },
  action: { color: colors.forest, fontWeight: '700' },
  save: { minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest, borderRadius: radius.sm },
  delete: { alignItems: 'center', padding: 7 },
  deleteText: { color: '#A33', fontWeight: '700' },
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 8 },
  message: { gap: 7 },
  sectionText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.7, color: colors.muted, textTransform: 'uppercase', marginTop: 20, marginBottom: 10 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sep: { borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  metaText: { fontSize: 12, color: colors.muted, marginTop: 3 },
});
