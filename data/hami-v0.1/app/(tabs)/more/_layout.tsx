import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

// Nested stack for the More tab so its sub-pages (Shopping, Household, etc.)
// keep the bottom tab bar visible while navigating.
export default function MoreLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
