import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { modules } from '@/data/mock';
import { applyOrder, loadTileOrder, saveTileOrder } from '@/lib/tileOrder';

type Module = (typeof modules)[number];

export default function More() {
  const router = useRouter();
  const [items, setItems] = useState<Module[]>(modules);
  const [editing, setEditing] = useState(false);

  useEffect(() => { void loadTileOrder().then((order) => setItems(applyOrder(modules, order))); }, []);

  function move(index: number, delta: number) {
    setItems((current) => {
      const next = [...current];
      const target = index + delta;
      if (target < 0 || target >= next.length) return current;
      [next[index], next[target]] = [next[target], next[index]];
      void saveTileOrder(next.map((m) => m.route));
      return next;
    });
  }

  return (
    <Screen>
      <ScreenHeader
        title="More"
        right={<Pressable onPress={() => setEditing((v) => !v)}><Text style={s.edit}>{editing ? 'Done' : 'Edit'}</Text></Pressable>}
      />
      <View style={s.grid}>
        {items.map((m, index) => (
          <Pressable
            key={m.route}
            onPress={() => { if (!editing) router.push(m.route as any); }}
            style={[s.tile, { backgroundColor: m.tint }]}
          >
            <View style={s.tileTop}>
              <View style={s.icon}><Ionicons name={m.icon as any} size={23} color={colors.forest}/></View>
              {editing && (
                <View style={s.reorder}>
                  <Pressable onPress={() => move(index, -1)} disabled={index === 0} hitSlop={6} style={[s.arrow, index === 0 && s.arrowOff]}><Ionicons name="chevron-up" size={18} color={colors.forest}/></Pressable>
                  <Pressable onPress={() => move(index, 1)} disabled={index === items.length - 1} hitSlop={6} style={[s.arrow, index === items.length - 1 && s.arrowOff]}><Ionicons name="chevron-down" size={18} color={colors.forest}/></Pressable>
                </View>
              )}
            </View>
            <Text style={s.title}>{m.title}</Text>
            <Text style={s.sub}>{m.subtitle}</Text>
          </Pressable>
        ))}
      </View>
      {editing && <Text style={s.hint}>Use the arrows to reorder. Tap Done when finished.</Text>}
      <Text style={s.footer}>HAMI · Our Life · Our Home · Our Story</Text>
    </Screen>
  );
}

const s = StyleSheet.create({
  edit: { color: colors.forest, fontWeight: '800', fontSize: 15 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tile: { width: '48%', minHeight: 155, borderRadius: radius.lg, padding: 16 },
  tileTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 18 },
  icon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,.7)', alignItems: 'center', justifyContent: 'center' },
  reorder: { gap: 4 },
  arrow: { width: 30, height: 26, borderRadius: 8, backgroundColor: 'rgba(255,255,255,.8)', alignItems: 'center', justifyContent: 'center' },
  arrowOff: { opacity: 0.4 },
  title: { fontSize: 18, fontWeight: '700', color: colors.text },
  sub: { fontSize: 12, color: colors.muted, lineHeight: 18, marginTop: 5 },
  hint: { textAlign: 'center', color: colors.muted, marginTop: 16, fontSize: 13 },
  footer: { textAlign: 'center', color: colors.clay, marginTop: 24, fontSize: 13 },
});
