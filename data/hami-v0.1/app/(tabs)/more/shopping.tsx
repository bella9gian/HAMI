import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { DateField } from '@/components/DateField';
import { Card, Check } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { loadHouseholdContext } from '@/lib/members';
import {
  addShoppingItem,
  clearPurchasedItems,
  deleteShoppingItem,
  loadShoppingItems,
  setShoppingItemPurchased,
  ShoppingItem,
  updateShoppingItem,
} from '@/lib/shopping';

const shortDate = (key: string) => new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${key}T12:00:00`));

export default function Shopping() {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [items, setItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [name, setName] = useState('');
  const [quantity, setQuantity] = useState('');

  // Inline editor (opens beneath the tapped item, like a to-do task).
  const [editing, setEditing] = useState<ShoppingItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [eName, setEName] = useState('');
  const [eQty, setEQty] = useState('');
  const [eStore, setEStore] = useState('');
  const [eBuyBy, setEBuyBy] = useState('');
  const [eNotes, setENotes] = useState('');

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const ctx = await loadHouseholdContext();
      setHouseholdId(ctx.householdId); setMeId(ctx.currentMember.id);
      setItems(await loadShoppingItems());
    } catch (e: any) { setError(e?.message ?? 'Unable to load the shopping list.'); }
    finally { setLoading(false); }
  }
  async function refresh() { setItems(await loadShoppingItems()); }

  async function add() {
    if (!name.trim() || !householdId || !meId) return;
    setSaving(true); setError('');
    try {
      await addShoppingItem({ householdId, createdBy: meId, name, quantity });
      setName(''); setQuantity(''); await refresh();
    } catch (e: any) { setError(e?.message ?? 'Unable to add this item.'); }
    finally { setSaving(false); }
  }

  function startEdit(item: ShoppingItem) {
    if (editing?.id === item.id) { setEditing(null); return; }
    setEName(item.name); setEQty(item.quantity ?? ''); setEStore(item.store ?? '');
    setEBuyBy(item.buyBy ?? ''); setENotes(item.notes ?? ''); setConfirmDelete(false); setEditing(item);
  }

  async function saveEdit() {
    if (!editing) return;
    setSaving(true); setError('');
    try {
      await updateShoppingItem(editing.id, { name: eName, quantity: eQty, store: eStore, buyBy: eBuyBy, notes: eNotes });
      setEditing(null); await refresh();
    } catch (e: any) { setError(e?.message ?? 'Unable to save this item.'); }
    finally { setSaving(false); }
  }

  async function toggle(item: ShoppingItem) {
    try { await setShoppingItemPurchased(item.id, !item.isPurchased); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to update this item.'); }
  }

  async function removeEditing() {
    if (!editing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try { await deleteShoppingItem(editing.id); setEditing(null); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to remove this item.'); }
    finally { setSaving(false); }
  }

  async function clearBought() {
    setSaving(true);
    try { await clearPurchasedItems(); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to clear purchased items.'); }
    finally { setSaving(false); }
  }

  const active = useMemo(() => items.filter((i) => !i.isPurchased), [items]);
  const purchased = useMemo(() => items.filter((i) => i.isPurchased), [items]);

  function meta(item: ShoppingItem) {
    return [item.quantity, item.store, item.buyBy ? `by ${shortDate(item.buyBy)}` : null].filter(Boolean).join(' · ');
  }

  function editForm() {
    return (
      <Card style={s.editForm}>
        <View style={s.field}><Text style={s.label}>Item</Text><TextInput value={eName} onChangeText={setEName} placeholder="Item" placeholderTextColor={colors.muted} style={s.input}/></View>
        <View style={s.field}><Text style={s.label}>Quantity</Text><TextInput value={eQty} onChangeText={setEQty} placeholder="e.g. 2 lbs" placeholderTextColor={colors.muted} style={s.input}/></View>
        <View style={s.field}><Text style={s.label}>Where to buy</Text><TextInput value={eStore} onChangeText={setEStore} placeholder="e.g. Costco" placeholderTextColor={colors.muted} style={s.input}/></View>
        <View style={s.field}><Text style={s.label}>Buy by</Text><DateField value={eBuyBy} onChange={setEBuyBy} mode="date"/></View>
        <View style={s.field}><Text style={s.label}>Notes</Text><TextInput value={eNotes} onChangeText={setENotes} placeholder="Notes (optional)" placeholderTextColor={colors.muted} multiline style={[s.input, s.notes]}/></View>
        {!!error && <Text style={s.error}>{error}</Text>}
        <Pressable disabled={saving} onPress={saveEdit} style={s.save}>{saving ? <ActivityIndicator color="#fff"/> : <Text style={s.white}>Save changes</Text>}</Pressable>
        <Pressable onPress={removeEditing} style={s.delete}><Text style={s.deleteText}>{confirmDelete ? 'Tap again to remove' : 'Remove item'}</Text></Pressable>
      </Card>
    );
  }

  function itemRow(item: ShoppingItem, last: boolean) {
    const m = meta(item);
    return (
      <View key={item.id}>
        <Pressable onPress={() => startEdit(item)} style={[s.row, (!last || editing?.id === item.id) && s.sep]}>
          <Pressable onPress={(e) => { e.stopPropagation(); void toggle(item); }} accessibilityLabel={item.isPurchased ? 'Mark not bought' : 'Mark bought'}>
            <Check done={item.isPurchased}/>
          </Pressable>
          <View style={{ flex: 1 }}>
            <Text style={[s.name, item.isPurchased && s.done]}>{item.name}</Text>
            {!!m && <Text style={s.metaText}>{m}</Text>}
          </View>
          <Ionicons name={editing?.id === item.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted}/>
        </Pressable>
        {editing?.id === item.id && editForm()}
      </View>
    );
  }

  return (
    <Screen>
      <View style={s.head}>
        <Ionicons name="chevron-back" size={25} color={colors.forest} onPress={() => router.back()}/>
        <Text style={s.title}>Shopping</Text>
        <View style={{ width: 25 }}/>
      </View>

      <Card style={s.addCard}>
        <View style={s.addRow}>
          <TextInput value={name} onChangeText={setName} placeholder="Add an item…" placeholderTextColor={colors.muted} style={[s.input, s.flex]} onSubmitEditing={add} returnKeyType="done"/>
          <TextInput value={quantity} onChangeText={setQuantity} placeholder="Qty" placeholderTextColor={colors.muted} style={[s.input, s.qty]} onSubmitEditing={add} returnKeyType="done"/>
          <Pressable onPress={add} disabled={saving || !name.trim()} style={[s.addButton, (saving || !name.trim()) && s.disabled]} accessibilityLabel="Add item"><Ionicons name="add" size={24} color="#fff"/></Pressable>
        </View>
        <Text style={s.hint}>Tap an item to add where to buy, a buy-by date, or notes.</Text>
      </Card>

      {loading ? (
        <View style={s.loading}><ActivityIndicator color={colors.forest}/><Text style={s.metaText}>Loading your list…</Text></View>
      ) : (
        <>
          <View style={s.sectionHead}><Text style={s.sectionText}>To buy</Text><Text style={s.count}>{active.length}</Text></View>
          {active.length === 0 ? (
            <Card><Text style={s.metaText}>Nothing to buy right now. Add an item above.</Text></Card>
          ) : (
            <Card>{active.map((item, i) => itemRow(item, i === active.length - 1))}</Card>
          )}

          {purchased.length > 0 && (
            <>
              <View style={s.sectionHead}><Text style={s.sectionText}>Bought</Text><Pressable onPress={clearBought} disabled={saving}><Text style={s.action}>Clear</Text></Pressable></View>
              <Card>{purchased.map((item, i) => itemRow(item, i === purchased.length - 1))}</Card>
            </>
          )}
        </>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  addCard: { gap: 8 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, color: colors.text, backgroundColor: '#fff', minHeight: 44 },
  notes: { minHeight: 70, textAlignVertical: 'top' },
  flex: { flex: 1 },
  qty: { width: 64, textAlign: 'center' },
  addButton: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
  hint: { color: colors.muted, fontSize: 12 },
  error: { color: '#A33', fontSize: 13 },
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 8 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 22, marginBottom: 10 },
  sectionText: { fontSize: 13, fontWeight: '800', letterSpacing: 0.7, color: colors.muted, textTransform: 'uppercase' },
  count: { color: colors.forest, fontWeight: '700', fontSize: 13 },
  action: { color: colors.forest, fontWeight: '700', fontSize: 13 },
  row: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sep: { borderBottomWidth: 1, borderBottomColor: colors.border },
  name: { fontSize: 15, fontWeight: '700', color: colors.text },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  metaText: { fontSize: 12, color: colors.muted, marginTop: 3 },
  editForm: { marginTop: 10, marginBottom: 10, gap: 10, backgroundColor: colors.surfaceMuted },
  field: { gap: 6 },
  label: { color: colors.text, fontWeight: '700' },
  save: { minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest, borderRadius: radius.sm },
  white: { color: '#fff', fontWeight: '700' },
  delete: { alignItems: 'center', padding: 7 },
  deleteText: { color: '#A33', fontWeight: '700' },
});
