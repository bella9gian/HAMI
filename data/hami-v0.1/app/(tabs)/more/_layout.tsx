import { Stack } from 'expo-router';
import { colors } from '@/constants/theme';

// Anchor the stack to the grid (index) so "back" from any sub-page — however it
// was reached (tab press, deep link, direct URL) — returns to the More grid
// instead of falling through to Today.
export const unstable_settings = { initialRouteName: 'index' };

// Nested stack for the More tab so its sub-pages (Shopping, Household, etc.)
// keep the bottom tab bar visible while navigating.
export default function MoreLayout() {
  return <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }} />;
}
