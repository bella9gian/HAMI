import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { loadHouseholdContext } from '@/lib/members';
import { addSupplement, deleteSupplement, loadSupplements, Supplement, updateSupplement } from '@/lib/supplements';

export default function Supplements() {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [items, setItems] = useState<Supplement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Supplement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [schedule, setSchedule] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const ctx = await loadHouseholdContext();
      setHouseholdId(ctx.householdId); setMeId(ctx.currentMember.id);
      setItems(await loadSupplements());
    } catch (e: any) { setError(e?.message ?? 'Unable to load supplements.'); }
    finally { setLoading(false); }
  }
  async function refresh() { setItems(await loadSupplements()); }

  function reset() { setName(''); setDosage(''); setSchedule(''); setNotes(''); setActive(true); setConfirmDelete(false); }
  function openNew() { reset(); setEditing(null); setShowNew(true); }
  function startEdit(x: Supplement) {
    if (editing?.id === x.id) { setEditing(null); return; }
    setName(x.name); setDosage(x.dosage ?? ''); setSchedule(x.schedule ?? ''); setNotes(x.notes ?? ''); setActive(x.isActive);
    setConfirmDelete(false); setShowNew(false); setEditing(x);
  }
  function closeForms() { setShowNew(false); setEditing(null); reset(); }

  async function save() {
    if (!name.trim() || !householdId || !meId) { setError('Add a supplement name.'); return; }
    setSaving(true); setError('');
    try {
      const values = { name, dosage, schedule, notes, isActive: active };
      if (editing) await updateSupplement(editing.id, values);
      else await addSupplement({ ...values, householdId, createdBy: meId });
      await refresh(); closeForms();
    } catch (e: any) { setError(e?.message ?? 'Unable to save this supplement.'); }
    finally { setSaving(false); }
  }
  async function remove() {
    if (!editing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try { await deleteSupplement(editing.id); await refresh(); closeForms(); }
    catch (e: any) { setError(e?.message ?? 'Unable to delete this supplement.'); }
    finally { setSaving(false); }
  }

  function form(isEdit: boolean) {
    return (
      <Card style={isEdit ? s.inlineForm : s.form}>
        <View style={s.head}><Text style={s.formTitle}>{isEdit ? 'Edit supplement' : 'New supplement'}</Text><Pressable onPress={closeForms}><Ionicons name="close" size={22} color={colors.muted}/></Pressable></View>
        <View style={s.field}><Text style={s.label}>Name</Text><TextInput value={name} onChangeText={setName} placeholder="e.g. Vitamin D" placeholderTextColor={colors.muted} style={s.input}/></View>
        <View style={s.field}><Text style={s.label}>Dosage</Text><TextInput value={dosage} onChangeText={setDosage} placeholder="e.g. 2000 IU" placeholderTextColor={colors.muted} style={s.input}/></View>
        <View style={s.field}><Text style={s.label}>Schedule</Text><TextInput value={schedule} onChangeText={setSchedule} placeholder="e.g. Morning, with food" placeholderTextColor={colors.muted} style={s.input}/></View>
        <View style={s.field}><Text style={s.label}>Notes</Text><TextInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" placeholderTextColor={colors.muted} multiline style={[s.input, s.multi]}/></View>
        <View style={s.head}><Text style={s.label}>Active</Text><Switch value={active} onValueChange={setActive} trackColor={{ false: colors.border, true: colors.forestSoft }} thumbColor={active ? colors.forest : '#fff'}/></View>
        {!!error && <Text style={s.error}>{error}</Text>}
        <Pressable disabled={saving} onPress={save} style={s.save}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={s.white}>{isEdit ? 'Save changes' : 'Add supplement'}</Text>}</Pressable>
        {isEdit && <Pressable onPress={remove} style={s.delete}><Text style={s.deleteText}>{confirmDelete ? 'Tap again to delete' : 'Delete supplement'}</Text></Pressable>}
      </Card>
    );
  }

  function meta(x: Supplement) {
    return [x.dosage, x.schedule, !x.isActive ? 'paused' : null].filter(Boolean).join(' · ');
  }

  return (
    <Screen>
      <View style={s.headBar}>
        <Ionicons name="chevron-back" size={25} color={colors.forest} onPress={() => router.back()}/>
        <Text style={s.title}>Supplements</Text>
        <Pressable onPress={openNew} accessibilityLabel="Add supplement"><Ionicons name="add" size={26} color={colors.forest}/></Pressable>
      </View>

      {showNew && form(false)}

      {loading ? (
        <View style={s.loading}><ActivityIndicator color={colors.forest}/><Text style={s.metaText}>Loading supplements…</Text></View>
      ) : error && !showNew && !editing ? (
        <Card style={s.message}><Text style={s.error}>{error}</Text><Pressable onPress={load}><Text style={s.action}>Try again</Text></Pressable></Card>
      ) : items.length === 0 ? (
        <Card><Text style={s.metaText}>No supplements yet. Tap + to add one.</Text></Card>
      ) : (
        <Card>
          {items.map((x, i) => {
            const m = meta(x);
            return (
              <View key={x.id}>
                <Pressable onPress={() => startEdit(x)} style={[s.row, (i < items.length - 1 || editing?.id === x.id) && s.sep]}>
                  <View style={[s.icon, !x.isActive && s.iconOff]}><Ionicons name="medical-outline" size={18} color={x.isActive ? colors.forest : colors.muted}/></View>
                  <View style={{ flex: 1 }}><Text style={[s.name, !x.isActive && s.dim]}>{x.name}</Text>{!!m && <Text style={s.metaText}>{m}</Text>}</View>
                  <Ionicons name={editing?.id === x.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted}/>
                </Pressable>
                {editing?.id === x.id && form(true)}
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
  icon: { width: 36, height: 36, borderRadius: 18, backgroundColor: colors.forestSoft, alignItems: 'center', justifyContent: 'center' },
  iconOff: { backgroundColor: colors.surfaceMuted },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  dim: { color: colors.muted },
  metaText: { fontSize: 12, color: colors.muted, marginTop: 3 },
});
