import { ReactNode } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from 'react-native';
import { colors } from '@/constants/theme';

export function Screen({ children, scroll = true }: { children: ReactNode; scroll?: boolean }) {
  const inner = <View style={styles.inner}>{children}</View>;
  return <SafeAreaView style={styles.safe}>{scroll ? <ScrollView contentContainerStyle={styles.scroll}>{inner}</ScrollView> : inner}</SafeAreaView>;
}
const styles = StyleSheet.create({ safe:{ flex:1, backgroundColor:colors.background }, scroll:{ paddingBottom:110 }, inner:{ width:'100%', maxWidth:760, alignSelf:'center', paddingHorizontal:18, paddingTop:14 } });
