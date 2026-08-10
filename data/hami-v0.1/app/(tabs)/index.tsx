import { StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { Card, MemberChips, QuickButton, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { todayEvents } from '@/data/mock';

export default function Today(){ return <Screen>
  <View style={s.top}><View><Text style={s.kicker}>Good morning,</Text><Text style={s.hero}>Bella.</Text><Text style={s.sub}>Here’s what’s happening with HAMI today.</Text></View><View style={s.profile}><Text style={s.profileText}>B</Text></View></View>
  <SectionTitle title="Today · Monday, Aug 10" action="Calendar" />
  <Card>{todayEvents.map((e,i)=><View key={e.id} style={[s.event, i<todayEvents.length-1&&s.sep]}><View style={[s.bar,{backgroundColor:e.color}]}/><View style={s.time}><Text style={s.timeText}>{e.start}</Text></View><View style={{flex:1}}><Text style={s.eventTitle}>{e.title}</Text><Text style={s.meta}>{e.location}</Text></View><MemberChips ids={e.memberIds}/></View>)}</Card>
  <SectionTitle title="Quick add" />
  <View style={s.quickRow}><QuickButton icon="calendar-outline" label="Event"/><QuickButton icon="checkbox-outline" label="Task"/><QuickButton icon="document-text-outline" label="Note"/><QuickButton icon="camera-outline" label="Photo"/></View>
  <SectionTitle title="Coming up" />
  <View style={s.two}><Card style={s.mini}><Text style={s.miniEyebrow}>TRIP</Text><Text style={s.miniTitle}>Hawaii</Text><Text style={s.meta}>5 days to go</Text><Ionicons name="airplane-outline" size={24} color={colors.forest}/></Card><Card style={s.mini}><Text style={s.miniEyebrow}>HOME</Text><Text style={s.miniTitle}>3 chores due</Text><Text style={s.meta}>2 assigned to you</Text><Ionicons name="home-outline" size={24} color={colors.clay}/></Card></View>
</Screen>}
const s=StyleSheet.create({ top:{flexDirection:'row',justifyContent:'space-between',alignItems:'flex-start',marginTop:8}, kicker:{fontSize:16,color:colors.muted},hero:{fontSize:34,fontWeight:'800',color:colors.text,letterSpacing:-1},sub:{fontSize:14,color:colors.muted,marginTop:5,maxWidth:300},profile:{width:44,height:44,borderRadius:22,backgroundColor:colors.forest,alignItems:'center',justifyContent:'center'},profileText:{color:'#fff',fontWeight:'800'},event:{minHeight:68,flexDirection:'row',alignItems:'center',gap:10},sep:{borderBottomWidth:1,borderBottomColor:colors.border},bar:{width:4,height:40,borderRadius:9},time:{width:70},timeText:{fontWeight:'700',fontSize:13,color:colors.text},eventTitle:{fontSize:15,fontWeight:'700',color:colors.text},meta:{fontSize:12,color:colors.muted,marginTop:3},quickRow:{flexDirection:'row',gap:8,flexWrap:'wrap'},two:{flexDirection:'row',gap:10},mini:{flex:1,minHeight:126,justifyContent:'space-between'},miniEyebrow:{fontSize:11,fontWeight:'800',color:colors.muted,letterSpacing:1},miniTitle:{fontSize:18,fontWeight:'750',color:colors.text} });
