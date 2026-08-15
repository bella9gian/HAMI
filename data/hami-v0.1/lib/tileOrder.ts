import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'hami.more.tileOrder';

export async function loadTileOrder(): Promise<string[] | null> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as string[]) : null;
  } catch {
    return null;
  }
}

export async function saveTileOrder(routes: string[]): Promise<void> {
  try { await AsyncStorage.setItem(KEY, JSON.stringify(routes)); } catch { /* best-effort */ }
}

/** Apply a saved order (by route) to the modules; unknown/new modules keep their default position at the end. */
export function applyOrder<T extends { route: string }>(items: T[], order: string[] | null): T[] {
  if (!order || order.length === 0) return items;
  const rank = new Map(order.map((route, i) => [route, i]));
  return [...items].sort((a, b) => {
    const ra = rank.has(a.route) ? rank.get(a.route)! : Number.MAX_SAFE_INTEGER;
    const rb = rank.has(b.route) ? rank.get(b.route)! : Number.MAX_SAFE_INTEGER;
    return ra - rb;
  });
}
