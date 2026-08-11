import { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radius, shadow } from '@/constants/theme';
import { members } from '@/data/mock';

export function ScreenHeader({ title, right }: { title: string; right?: ReactNode }) {
  return <View style={styles.header}><Text style={styles.title}>{title}</Text><View>{right}</View></View>;
}

export function Card({ children, style }: { children: ReactNode; style?: any }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function MemberChips({ ids, memberOptions }: { ids: string[]; memberOptions?: Array<{ id: string; display_name?: string; name?: string; initials?: string }> }) {
  return <View style={styles.chips}>{ids.slice(0,3).map((id) => {
    const member = memberOptions?.find(m => m.id === id) ?? members.find(m => m.id === id) ?? members[0];
    const displayName = 'display_name' in member ? member.display_name : undefined;
    const initials = member.initials ?? (displayName ?? member.name ?? '?').charAt(0).toUpperCase();
    return <View key={id} style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View>;
  })}</View>;
}

export function Check({ done }: { done: boolean }) {
  return <View style={[styles.check, done && styles.checkDone]}>{done && <Ionicons name="checkmark" size={14} color="#fff" />}</View>;
}

export function SectionTitle({ title, action }: { title: string; action?: string }) {
  return <View style={styles.sectionTitle}><Text style={styles.sectionText}>{title}</Text>{action ? <Text style={styles.action}>{action}</Text> : null}</View>;
}

export function QuickButton({ icon, label }: { icon: any; label: string }) {
  return <Pressable style={styles.quick}><Ionicons name={icon} size={19} color={colors.forest}/><Text style={styles.quickText}>{label}</Text></Pressable>;
}

const styles = StyleSheet.create({
  header: { flexDirection:'row', alignItems:'center', justifyContent:'space-between', marginBottom:18 },
  title: { fontSize:28, fontWeight:'700', color:colors.text, letterSpacing:-0.5 },
  card: { backgroundColor:colors.surface, borderRadius:radius.md, padding:16, borderWidth:1, borderColor:colors.border, ...shadow },
  chips: { flexDirection:'row' },
  avatar: { width:30, height:30, borderRadius:15, backgroundColor:colors.forestSoft, alignItems:'center', justifyContent:'center', marginLeft:-4, borderWidth:2, borderColor:colors.surface },
  avatarText: { fontSize:11, fontWeight:'700', color:colors.forest },
  check: { width:22, height:22, borderRadius:6, borderWidth:1.5, borderColor:'#C9C2B9', alignItems:'center', justifyContent:'center' },
  checkDone: { backgroundColor:colors.success, borderColor:colors.success },
  sectionTitle:{ flexDirection:'row', justifyContent:'space-between', alignItems:'center', marginTop:22, marginBottom:10 },
  sectionText:{ fontSize:13, fontWeight:'800', letterSpacing:0.7, color:colors.muted, textTransform:'uppercase' },
  action:{ color:colors.forest, fontWeight:'700', fontSize:13 },
  quick:{ flex:1, minWidth:76, gap:6, padding:12, borderRadius:radius.sm, alignItems:'center', backgroundColor:colors.surfaceMuted },
  quickText:{ fontSize:12, color:colors.text, fontWeight:'600' },
});
