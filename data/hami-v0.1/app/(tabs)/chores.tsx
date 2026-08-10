import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, Check, MemberChips, ScreenHeader, SectionTitle } from '@/components/ui';
import { chores } from '@/data/mock';
import { colors } from '@/constants/theme';
export default function Chores(){return <Screen><ScreenHeader title="Chores" right={<Ionicons name="add" size={28} color={colors.forest}/>}/><SectionTitle title="This week" action="Assign"/><Card>{chores.map(c=><View key={c.id} style={s.row}><View style={s.icon}><Ionicons name="brush-outline" size={18} color={colors.clay}/></View><View style={{flex:1}}><Text style={s.title}>{c.title}</Text><Text style={s.meta}>{c.cadence}</Text></View><MemberChips ids={c.memberIds}/><Check done={c.completed}/></View>)}</Card><SectionTitle title="How assignments work"/><Card><Text style={s.body}>Assign a chore to Bella, Mike, Koa, Everyone, or multiple people. Recurring chores can later rotate automatically while completion history stays attached to each occurrence.</Text></Card></Screen>}
const s=StyleSheet.create({row:{flexDirection:'row',alignItems:'center',gap:10,minHeight:68,borderBottomWidth:1,borderBottomColor:colors.border},icon:{width:36,height:36,borderRadius:18,backgroundColor:colors.claySoft,alignItems:'center',justifyContent:'center'},title:{fontSize:15,fontWeight:'700',color:colors.text},meta:{fontSize:12,color:colors.muted,marginTop:3},body:{fontSize:14,lineHeight:21,color:colors.text}})
