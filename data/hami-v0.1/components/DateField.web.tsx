import React from 'react';
import { colors, radius } from '@/constants/theme';

export type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  mode?: 'date' | 'time';
  placeholder?: string;
};

// On web we render a real <input>, so mobile browsers show the native
// calendar / time picker. Date values are YYYY-MM-DD, time values are HH:MM,
// matching the formats the data layer already expects.
export function DateField({ value, onChange, mode = 'date' }: DateFieldProps) {
  return React.createElement('input', {
    type: mode === 'time' ? 'time' : 'date',
    value: value ?? '',
    // 300s = 5-minute increments for time pickers.
    step: mode === 'time' ? 300 : undefined,
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    style: {
      boxSizing: 'border-box',
      width: '100%',
      minHeight: 44,
      border: `1px solid ${colors.border}`,
      borderRadius: radius.sm,
      padding: '11px 12px',
      color: colors.text,
      fontSize: 14,
      fontFamily: 'inherit',
      background: '#fff',
      outline: 'none',
    },
  });
}
