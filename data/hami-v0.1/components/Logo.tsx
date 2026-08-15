import { StyleSheet, Text, View } from 'react-native';
import { colors } from '@/constants/theme';

// Native fallback (web renders the SVG emblem in Logo.web.tsx).
export function Logo({ size = 132 }: { size?: number }) {
  return (
    <View style={[s.wrap, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={s.char}>陈</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: colors.forestSoft, alignItems: 'center', justifyContent: 'center' },
  char: { fontSize: 48, fontWeight: '800', color: colors.forest },
});
