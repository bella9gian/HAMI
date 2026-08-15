import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { colors } from '@/constants/theme';

void SplashScreen.preventAutoHideAsync();

export default function RootLayout(){
  // Preload the icon font so in-app graphics render everywhere, including the
  // static web build where the vector-icons font is not injected automatically.
  const [fontsLoaded] = useFonts(Ionicons.font);

  useEffect(() => {
    if (fontsLoaded) void SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return <><StatusBar style="dark"/><Stack screenOptions={{ headerShown:false, contentStyle:{ backgroundColor:colors.background } }} /></>;
}
