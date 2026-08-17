import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Pressable } from 'react-native';
import { colors } from '@/constants/theme';

// Back arrow for More sub-pages. Returns to the More grid when the page was
// opened from there (the grid passes ?from=more); otherwise returns to Today.
export function BackButton() {
  const router = useRouter();
  const { from } = useLocalSearchParams<{ from?: string }>();
  return (
    <Pressable onPress={() => (from === 'more' ? router.navigate('/more') : router.navigate('/'))} hitSlop={8} accessibilityLabel="Back">
      <Ionicons name="chevron-back" size={25} color={colors.forest} />
    </Pressable>
  );
}
