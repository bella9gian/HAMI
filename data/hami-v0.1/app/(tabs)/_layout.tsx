import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '@/constants/theme';
const items:any = {
  index:['sunny-outline','Today'], calendar:['calendar-outline','Calendar'], todo:['checkbox-outline','To-Do'], chores:['brush-outline','Chores'], more:['ellipsis-horizontal','More']
};
export default function TabsLayout(){
  return <Tabs screenOptions={({route}) => ({
    headerShown:false,
    tabBarActiveTintColor:colors.forest,
    tabBarInactiveTintColor:'#817B74',
    tabBarStyle:{ height:78, paddingTop:8, paddingBottom:12, backgroundColor:'#FFFDFC', borderTopColor:colors.border },
    tabBarLabelStyle:{ fontSize:11, fontWeight:'600' },
    tabBarIcon:({color,size}) => <Ionicons name={items[route.name]?.[0] ?? 'ellipse-outline'} size={size} color={color}/>,
    title:items[route.name]?.[1] ?? route.name
  })} />;
}
