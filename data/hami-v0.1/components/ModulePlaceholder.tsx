import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
export function ModulePlaceholder({title,subtitle,icon}:{title:string;subtitle:string;icon:any}){const r=useRouter();return <Screen><View style={s.head}><Ionicons name="chevron-back" size={25} color={colors.forest} onPress={()=>r.back()}/><Text style={s.title}>{title}</Text><Ionicons name="add" size={26} color={colors.forest}/></View><Card style={s.hero}><View style={s.icon}><Ionicons name={icon} size={34} color={colors.forest}/></View><Text style={s.big}>{title}</Text><Text style={s.sub}>{subtitle}</Text></Card><Card style={{marginTop:14}}><Text style={s.body}>This module is wired into the HAMI navigation and ready for its real data model and Supabase connection.</Text></Card></Screen>}
const s=StyleSheet.create({head:{flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:18},title:{fontSize:24,fontWeight:'800',color:colors.text},hero:{alignItems:'center',paddingVertical:34},icon:{width:72,height:72,borderRadius:36,backgroundColor:colors.forestSoft,alignItems:'center',justifyContent:'center'},big:{fontSize:26,fontWeight:'800',marginTop:16,color:colors.text},sub:{fontSize:14,color:colors.muted,textAlign:'center',marginTop:6,maxWidth:300},body:{fontSize:14,lineHeight:21,color:colors.text}})
