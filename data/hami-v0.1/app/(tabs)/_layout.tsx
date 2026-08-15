import { Tabs } from 'expo-router';
import { ColorValue, StyleSheet, View } from 'react-native';

import { colors } from '@/constants/theme';

type IconName = 'home' | 'menu' | 'todo' | 'chores' | 'calendar' | 'more';

const items: Record<string, { icon: IconName; label: string }> = {
  index: { icon: 'home', label: 'Today' },
  menu: { icon: 'menu', label: 'Menu' },
  todo: { icon: 'todo', label: 'To-Do' },
  chores: { icon: 'chores', label: 'Chores' },
  calendar: { icon: 'calendar', label: 'Calendar' },
  more: { icon: 'more', label: 'More' },
};

function TabIcon({ name, color }: { name: IconName; color: ColorValue }) {
  if (name === 'home') {
    return <View style={icons.canvas}><View style={[icons.roof, { borderColor: color }]}/><View style={[icons.house, { borderColor: color }]}><View style={[icons.door, { borderColor: color }]}/></View></View>;
  }
  if (name === 'menu') {
    return <View style={icons.canvas}><View style={[icons.fork, { backgroundColor: color }]}/><View style={[icons.prong, icons.prongL, { backgroundColor: color }]}/><View style={[icons.prong, icons.prongM, { backgroundColor: color }]}/><View style={[icons.prong, icons.prongR, { backgroundColor: color }]}/><View style={[icons.knife, { backgroundColor: color }]}/></View>;
  }
  if (name === 'todo') {
    return <View style={icons.canvas}><View style={[icons.checkbox, { borderColor: color }]}><View style={[icons.checkShort, { backgroundColor: color }]}/><View style={[icons.checkLong, { backgroundColor: color }]}/></View><View style={[icons.todoLine, { backgroundColor: color }]}/><View style={[icons.todoLine, icons.todoLineTwo, { backgroundColor: color }]}/></View>;
  }
  if (name === 'chores') {
    return <View style={icons.canvas}><View style={[icons.brushHandle, { backgroundColor: color }]}/><View style={[icons.brushHead, { borderColor: color }]}><View style={[icons.bristle, { backgroundColor: color }]}/><View style={[icons.bristle, { backgroundColor: color }]}/><View style={[icons.bristle, { backgroundColor: color }]}/></View></View>;
  }
  if (name === 'calendar') {
    return <View style={icons.canvas}><View style={[icons.calendar, { borderColor: color }]}><View style={[icons.calendarTop, { backgroundColor: color }]}/><View style={icons.calendarDots}>{[0, 1, 2, 3, 4, 5].map((dot) => <View key={dot} style={[icons.calendarDot, { backgroundColor: color }]}/>)}</View></View><View style={[icons.ring, icons.ringLeft, { backgroundColor: color }]}/><View style={[icons.ring, icons.ringRight, { backgroundColor: color }]}/></View>;
  }
  return <View style={[icons.canvas, icons.more]}>{[0, 1, 2].map((dot) => <View key={dot} style={[icons.moreDot, { backgroundColor: color }]}/>)}</View>;
}

export default function TabsLayout() {
  return <Tabs screenOptions={({ route }) => ({
    headerShown: false,
    tabBarActiveTintColor: colors.forest,
    tabBarInactiveTintColor: '#817B74',
    tabBarStyle: { height: 78, paddingTop: 8, paddingBottom: 12, backgroundColor: '#FFFDFC', borderTopColor: colors.border },
    tabBarLabelStyle: { fontSize: 11, fontWeight: '600' },
    tabBarIcon: ({ color }) => <TabIcon name={items[route.name]?.icon ?? 'more'} color={color}/>,
    title: items[route.name]?.label ?? route.name,
  })}>
    <Tabs.Screen name="index"/>
    <Tabs.Screen name="menu"/>
    <Tabs.Screen name="todo"/>
    <Tabs.Screen name="calendar"/>
    <Tabs.Screen name="more"/>
    {/* Chores stays reachable (from the More grid) but is off the tab bar. */}
    <Tabs.Screen name="chores" options={{ href: null }}/>
  </Tabs>;
}

const icons = StyleSheet.create({
  canvas: { width: 24, height: 24, position: 'relative' },
  roof: { position: 'absolute', width: 15, height: 15, left: 4.5, top: 1, borderLeftWidth: 2, borderTopWidth: 2, borderRadius: 2, transform: [{ rotate: '45deg' }] },
  house: { position: 'absolute', width: 17, height: 13, left: 3.5, bottom: 1, borderWidth: 2, borderTopWidth: 0, borderBottomLeftRadius: 3, borderBottomRightRadius: 3 },
  door: { position: 'absolute', width: 5, height: 8, left: 4, bottom: -2, borderWidth: 2, borderBottomWidth: 0 },
  fork: { position: 'absolute', width: 2, height: 13, left: 5.6, bottom: 2, borderRadius: 1 },
  prong: { position: 'absolute', width: 1.6, height: 7, top: 2, borderRadius: 1 },
  prongL: { left: 3.2 }, prongM: { left: 5.7 }, prongR: { left: 8.2 },
  knife: { position: 'absolute', width: 2.6, height: 20, right: 5, top: 2, borderRadius: 2 },
  checkbox: { position: 'absolute', width: 13, height: 13, left: 1, top: 5, borderWidth: 2, borderRadius: 3 },
  checkShort: { position: 'absolute', width: 2, height: 6, left: 3, top: 4, borderRadius: 2, transform: [{ rotate: '-42deg' }] },
  checkLong: { position: 'absolute', width: 2, height: 10, left: 7, top: 0, borderRadius: 2, transform: [{ rotate: '42deg' }] },
  todoLine: { position: 'absolute', width: 7, height: 2, right: 0, top: 7, borderRadius: 2 },
  todoLineTwo: { top: 15 },
  brushHandle: { position: 'absolute', width: 5, height: 15, left: 9.5, top: 0, borderRadius: 3, transform: [{ rotate: '18deg' }] },
  brushHead: { position: 'absolute', width: 18, height: 9, left: 3, bottom: 1, borderWidth: 2, borderRadius: 3, flexDirection: 'row', justifyContent: 'space-evenly', alignItems: 'flex-end', paddingBottom: 1 },
  bristle: { width: 2, height: 4, borderRadius: 1 },
  calendar: { position: 'absolute', width: 20, height: 18, left: 2, bottom: 1, borderWidth: 2, borderRadius: 3, overflow: 'hidden' },
  calendarTop: { width: '100%', height: 3, marginTop: 3 },
  calendarDots: { flexDirection: 'row', flexWrap: 'wrap', gap: 3, paddingHorizontal: 3, paddingTop: 3 },
  calendarDot: { width: 2.5, height: 2.5, borderRadius: 2 },
  ring: { position: 'absolute', width: 2, height: 6, top: 0, borderRadius: 2 },
  ringLeft: { left: 7 }, ringRight: { right: 7 },
  more: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-evenly', paddingHorizontal: 2 },
  moreDot: { width: 5, height: 5, borderRadius: 3 },
});
