import { StyleSheet, TextInput } from 'react-native';
import { colors, radius } from '@/constants/theme';

export type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  mode?: 'date' | 'time';
  placeholder?: string;
};

// Native fallback (the app is deployed on web, where DateField.web.tsx renders
// the OS date/time picker). Keeps the YYYY-MM-DD / HH:MM text contract.
export function DateField({ value, onChange, mode = 'date', placeholder }: DateFieldProps) {
  return (
    <TextInput
      value={value}
      onChangeText={onChange}
      placeholder={placeholder ?? (mode === 'time' ? 'HH:MM' : 'YYYY-MM-DD')}
      placeholderTextColor={colors.muted}
      autoCapitalize="none"
      style={s.input}
    />
  );
}

const s = StyleSheet.create({
  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
    fontSize: 14,
    backgroundColor: '#fff',
    minHeight: 44,
  },
});
