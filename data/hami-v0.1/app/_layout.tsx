import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';
import { useFonts } from 'expo-font';
import { colors } from '@/constants/theme';
import { IONICONS_FONT_DATA_URL } from '@/lib/ioniconsFont';
import { registerWebIconFont } from '@/lib/webIconFont';

// Register the embedded Ionicons glyph font on web up front so icons render even
// on static hosts that don't serve the font asset Expo exports under node_modules.
registerWebIconFont();

export default function RootLayout(){
  // Also load the embedded font through expo-font on web so @expo/vector-icons
  // treats the `ionicons` family as ready and renders every glyph (its own
  // readiness check otherwise waits on the font file that the host drops).
  useFonts(Platform.OS === 'web' ? { ionicons: IONICONS_FONT_DATA_URL } : {});

  return <><StatusBar style="dark"/><Stack screenOptions={{ headerShown:false, contentStyle:{ backgroundColor:colors.background } }} /></>;
}
