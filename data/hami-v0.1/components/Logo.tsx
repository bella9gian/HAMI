import { Image } from 'react-native';

// HAMI emblem: a rumah Batak (traditional Batak house, for the Siagian side)
// with the Chinese surname 陈 (Chen/Chan) on its gable. Transparent background.
export function Logo({ size = 132 }: { size?: number }) {
  return (
    <Image
      source={require('@/assets/hami-logo.png')}
      style={{ width: size, height: size }}
      resizeMode="contain"
      accessibilityLabel="HAMI"
    />
  );
}
