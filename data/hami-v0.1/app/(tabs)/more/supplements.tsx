import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { BackButton } from '@/components/BackButton';
import { Card } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { loadHouseholdContext } from '@/lib/members';
import { toDateKey } from '@/lib/calendar';
import { addSupplement, deleteSupplement, isLow, loadDoses, loadSupplements, setInventory, Supplement, takeDose, updateSupplement } from '@/lib/supplements';

const since = () => { const d = new Date(); d.setDate(d.getDate() - 30); return toDateKey(d); };
const num = (v: string): number | null => { const n = parseInt(v, 10); return Number.isFinite(n) && n >= 0 ? n : null; };
const fmtDose = (t: string) => new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(t));

export default function Supplements() {
  const router = useRouter();
  const todayKey = toDateKey();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [items, setItems] = useState<Supplement[]>([]);
  const [doses, setDoses] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');

  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Supplement | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [name, setName] = useState('');
  const [dosage, setDosage] = useState('');
  const [schedule, setSchedule] = useState('');
  const [notes, setNotes] = useState('');
  const [active, setActive] = useState(true);
  const [invText, setInvText] = useState('');
  const [lowText, setLowText] = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const ctx = await loadHouseholdContext();
      setHouseholdId(ctx.householdId); setMeId(ctx.currentMember.id);
      setItems(await loadSupplements());
      setDoses(await loadDoses(since()));
    } catch (e: any) { setError(e?.message ?? 'Unable to load supplements.'); }
    finally { setLoading(false); }
  }
  async function refresh() { setItems(await loadSupplements()); setDoses(await loadDoses(since())); }

  function reset() { setName(''); setDosage(''); setSchedule(''); setNotes(''); setActive(true); setInvText(''); setLowText(''); setConfirmDelete(false); }
  function openNew() { reset(); setEditing(null); setShowNew(true); }
  function startEdit(x: Supplement) {
    if (editing?.id === x.id) { setEditing(null); return; }
    setName(x.name); setDosage(x.dosage ?? ''); setSchedule(x.schedule ?? ''); setNotes(x.notes ?? ''); setActive(x.isActive);
    setInvText(x.inventoryCount != null ? String(x.inventoryCount) : ''); setLowText(x.lowThreshold != null ? String(x.lowThreshold) : '');
    setConfirmDelete(false); setShowNew(false); setEditing(x);
  }
  function closeForms() { setShowNew(false); setEditing(null); reset(); }

  async function save() {
    if (!name.trim() || !householdId || !meId) { setError('Add a supplement name.'); return; }
    setSaving(true); setError('');
    try {
      const values = { name, dosage, schedule, notes, isActive: active, inventoryCount: num(invText), lowThreshold: num(lowText) };
      if (editing) await updateSupplement(editing.id, values);
      else await addSupplement({ ...values, householdId, createdBy: meId });
      await refresh(); closeForms();
    } catch (e: any) { setError(e?.message ?? 'Unable to save this supplement.'); }
    finally { setSaving(false); }
  }

  async function doTake(x: Supplement) {
    if (!meId) return;
    setBusyId(x.id); setError('');
    try { await takeDose(x, meId); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to log this dose.'); }
    finally { setBusyId(null); }
  }
  async function restock(x: Supplement, delta: number) {
    setBusyId(x.id); setError('');
    try { await setInventory(x.id, Math.max(0, (x.inventoryCount ?? 0) + delta)); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to update inventory.'); }
    finally { setBusyId(null); }
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
        <View style={s.two}>
          <View style={[s.field, s.flex]}><Text style={s.label}>Inventory</Text><TextInput value={invText} onChangeText={setInvText} keyboardType="number-pad" placeholder="units on hand" placeholderTextColor={colors.muted} style={s.input}/></View>
          <View style={[s.field, s.flex]}><Text style={s.label}>Low alert at</Text><TextInput value={lowText} onChangeText={setLowText} keyboardType="number-pad" placeholder="default 5" placeholderTextColor={colors.muted} style={s.input}/></View>
        </View>
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
        <BackButton />
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
            const takenToday = (doses[x.id] ?? []).filter((t) => toDateKey(new Date(t)) === todayKey).length;
            const low = isLow(x);
            const inv = x.inventoryCount;
            const stock = inv == null ? null : inv === 0 ? 'Out of stock' : `${inv} left`;
            return (
              <View key={x.id}>
                <Pressable onPress={() => startEdit(x)} style={[s.row, (i < items.length - 1 || editing?.id === x.id) && s.sep]}>
                  <View style={[s.icon, !x.isActive && s.iconOff]}><Ionicons name="medical-outline" size={18} color={x.isActive ? colors.forest : colors.muted}/></View>
                  <View style={{ flex: 1 }}>
                    <Text style={[s.name, !x.isActive && s.dim]}>{x.name}</Text>
                    {!!m && <Text style={s.metaText}>{m}</Text>}
                    <View style={s.statusRow}>
                      {stock && <Text style={[s.stock, low && s.stockLow]}>{stock}</Text>}
                      {takenToday > 0 && <Text style={s.metaText}>{takenToday} taken today</Text>}
                    </View>
                  </View>
                  {x.isActive && (
                    <Pressable onPress={() => doTake(x)} disabled={busyId === x.id || inv === 0} style={[s.take, (busyId === x.id || inv === 0) && s.takeOff]}>
                      {busyId === x.id ? <ActivityIndicator size="small" color={colors.forest}/> : <Text style={s.takeText}>Take</Text>}
                    </Pressable>
                  )}
                  <Ionicons name={editing?.id === x.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted}/>
                </Pressable>
                {editing?.id === x.id && (
                  <View style={s.restockRow}>
                    <Text style={s.label}>Inventory</Text>
                    <Pressable onPress={() => restock(x, -1)} style={s.stepBtn}><Ionicons name="remove" size={18} color={colors.forest}/></Pressable>
                    <Text style={s.stepValue}>{x.inventoryCount ?? '—'}</Text>
                    <Pressable onPress={() => restock(x, 1)} style={s.stepBtn}><Ionicons name="add" size={18} color={colors.forest}/></Pressable>
                    <Pressable onPress={() => restock(x, 30)} style={s.restock}><Text style={s.action}>+30</Text></Pressable>
                  </View>
                )}
                {editing?.id === x.id && (
                  <View style={s.history}>
                    <Text style={s.label}>Dose history</Text>
                    {(doses[x.id]?.length ?? 0) === 0 ? (
                      <Text style={s.metaText}>No doses logged in the last 30 days. Tap “Take” to record one.</Text>
                    ) : (
                      [...(doses[x.id] ?? [])].sort((a, b) => (a < b ? 1 : -1)).slice(0, 12).map((t, idx) => (
                        <View key={idx} style={s.doseRow}>
                          <Ionicons name="checkmark-circle" size={16} color={colors.success}/>
                          <Text style={s.doseText}>{fmtDose(t)}</Text>
                        </View>
                      ))
                    )}
                  </View>
                )}
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
  two: { flexDirection: 'row', gap: 10 },
  flex: { flex: 1 },
  label: { color: colors.text, fontWeight: '700' },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, color: colors.text, backgroundColor: '#fff', minHeight: 44 },
  multi: { minHeight: 70, textAlignVertical: 'top' },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 3 },
  stock: { fontSize: 12, fontWeight: '700', color: colors.forest },
  stockLow: { color: colors.clay },
  take: { paddingHorizontal: 14, height: 34, borderRadius: radius.pill, borderWidth: 1, borderColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  takeOff: { opacity: 0.4 },
  takeText: { color: colors.forest, fontWeight: '800', fontSize: 13 },
  restockRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 10 },
  stepBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, borderColor: colors.border, backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  stepValue: { fontSize: 16, fontWeight: '800', color: colors.text, minWidth: 34, textAlign: 'center' },
  restock: { marginLeft: 'auto', paddingHorizontal: 12, paddingVertical: 6, borderRadius: radius.pill, backgroundColor: colors.forestSoft },
  history: { gap: 6, paddingVertical: 10 },
  doseRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  doseText: { fontSize: 13, color: colors.text },
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
