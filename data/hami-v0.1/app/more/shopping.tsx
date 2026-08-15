import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
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
} from '@/lib/shopping';

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
      setName(''); setQuantity('');
      await refresh();
    } catch (e: any) { setError(e?.message ?? 'Unable to add this item.'); }
    finally { setSaving(false); }
  }

  async function toggle(item: ShoppingItem) {
    try { await setShoppingItemPurchased(item.id, !item.isPurchased); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to update this item.'); }
  }

  async function remove(item: ShoppingItem) {
    try { await deleteShoppingItem(item.id); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to remove this item.'); }
  }

  async function clearBought() {
    setSaving(true);
    try { await clearPurchasedItems(); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to clear purchased items.'); }
    finally { setSaving(false); }
  }

  const active = useMemo(() => items.filter((i) => !i.isPurchased), [items]);
  const purchased = useMemo(() => items.filter((i) => i.isPurchased), [items]);

  function itemRow(item: ShoppingItem, last: boolean) {
    return (
      <View key={item.id} style={[s.row, !last && s.sep]}>
        <Pressable onPress={() => toggle(item)} accessibilityLabel={item.isPurchased ? 'Mark not bought' : 'Mark bought'}>
          <Check done={item.isPurchased}/>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Text style={[s.name, item.isPurchased && s.done]}>{item.name}</Text>
          {!!item.quantity && <Text style={s.meta}>{item.quantity}</Text>}
        </View>
        <Pressable onPress={() => remove(item)} accessibilityLabel="Remove item" hitSlop={8}>
          <Ionicons name="close" size={18} color={colors.muted}/>
        </Pressable>
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
          <TextInput
            value={name}
            onChangeText={setName}
            placeholder="Add an item…"
            placeholderTextColor={colors.muted}
            style={[s.input, s.flex]}
            onSubmitEditing={add}
            returnKeyType="done"
          />
          <TextInput
            value={quantity}
            onChangeText={setQuantity}
            placeholder="Qty"
            placeholderTextColor={colors.muted}
            style={[s.input, s.qty]}
            onSubmitEditing={add}
            returnKeyType="done"
          />
          <Pressable onPress={add} disabled={saving || !name.trim()} style={[s.addButton, (saving || !name.trim()) && s.disabled]} accessibilityLabel="Add item">
            <Ionicons name="add" size={24} color="#fff"/>
          </Pressable>
        </View>
        {!!error && <Text style={s.error}>{error}</Text>}
      </Card>

      {loading ? (
        <View style={s.loading}><ActivityIndicator color={colors.forest}/><Text style={s.meta}>Loading your list…</Text></View>
      ) : (
        <>
          <View style={s.sectionHead}><Text style={s.sectionText}>To buy</Text><Text style={s.count}>{active.length}</Text></View>
          {active.length === 0 ? (
            <Card><Text style={s.meta}>Nothing to buy right now. Add an item above.</Text></Card>
          ) : (
            <Card>{active.map((item, i) => itemRow(item, i === active.length - 1))}</Card>
          )}

          {purchased.length > 0 && (
            <>
              <View style={s.sectionHead}>
                <Text style={s.sectionText}>Bought</Text>
                <Pressable onPress={clearBought} disabled={saving}><Text style={s.action}>Clear</Text></Pressable>
              </View>
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
  flex: { flex: 1 },
  qty: { width: 64, textAlign: 'center' },
  addButton: { width: 44, height: 44, borderRadius: radius.sm, backgroundColor: colors.forest, alignItems: 'center', justifyContent: 'center' },
  disabled: { opacity: 0.5 },
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
  meta: { fontSize: 12, color: colors.muted, marginTop: 3 },
});
