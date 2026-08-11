import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import { Tabs } from 'expo-router';

import { colors } from '@/constants/theme';

const items: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string }> = {
  index: { icon: 'home-outline', label: 'Today' },
  todo: { icon: 'checkbox-outline', label: 'To-Do' },
  chores: { icon: 'brush-outline', label: 'Chores' },
  calendar: { icon: 'calendar-outline', label: 'Calendar' },
  more: { icon: 'ellipsis-horizontal', label: 'More' },
};

export default function TabsLayout() {
  const [fontsLoaded, fontError] = useFonts(Ionicons.font);

  if (fontError) throw fontError;
  if (!fontsLoaded) return null;

  return (
    <Tabs
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: colors.forest,
        tabBarInactiveTintColor: '#817B74',
        tabBarStyle: {
          height: 78,
          paddingTop: 8,
          paddingBottom: 12,
          backgroundColor: '#FFFDFC',
          borderTopColor: colors.border,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={items[route.name]?.icon ?? 'ellipse-outline'} size={size} color={color} />
        ),
        title: items[route.name]?.label ?? route.name,
      })}
    >
      <Tabs.Screen name="index" />
      <Tabs.Screen name="todo" />
      <Tabs.Screen name="chores" />
      <Tabs.Screen name="calendar" />
      <Tabs.Screen name="more" />
    </Tabs>
  );
}
