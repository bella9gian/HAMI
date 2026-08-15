import { Image, StyleSheet, View } from 'react-native';

// HAMI emblem: a rumah Batak (traditional Batak house, for the Siagian side)
// with the Chinese surname 陈 (Chen/Chan) on its gable. Shared by web + native.
export function Logo({ size = 132 }: { size?: number }) {
  return (
    <View style={[s.wrap, { width: size, height: size, borderRadius: size * 0.22 }]}>
      <Image
        source={require('@/assets/hami-logo.jpg')}
        style={{ width: size, height: size }}
        resizeMode="cover"
        accessibilityLabel="HAMI"
      />
    </View>
  );
}

const s = StyleSheet.create({
  // Matches the artwork's own cream background so the square blends seamlessly.
  wrap: { backgroundColor: '#FCEBD6', overflow: 'hidden' },
});
