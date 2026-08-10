import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { ScreenHeader } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { modules } from '@/data/mock';
export default function More(){const router=useRouter();return <Screen><ScreenHeader title="More"/><View style={s.grid}>{modules.map(m=><Pressable key={m.title} onPress={()=>router.push(m.route as any)} style={[s.tile,{backgroundColor:m.tint}]}><View style={s.icon}><Ionicons name={m.icon as any} size={23} color={colors.forest}/></View><Text style={s.title}>{m.title}</Text><Text style={s.sub}>{m.subtitle}</Text></Pressable>)}</View><Text style={s.footer}>HAMI · Our Life · Our Home · Our Story</Text></Screen>}
const s=StyleSheet.create({grid:{flexDirection:'row',flexWrap:'wrap',gap:10},tile:{width:'48%',minHeight:155,borderRadius:radius.lg,padding:16},icon:{width:40,height:40,borderRadius:20,backgroundColor:'rgba(255,255,255,.7)',alignItems:'center',justifyContent:'center',marginBottom:18},title:{fontSize:18,fontWeight:'750',color:colors.text},sub:{fontSize:12,color:colors.muted,lineHeight:18,marginTop:5},footer:{textAlign:'center',color:colors.clay,marginTop:30,fontSize:13}})
