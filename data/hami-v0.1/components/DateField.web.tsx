import React from 'react';
import { colors, radius } from '@/constants/theme';

export type DateFieldProps = {
  value: string;
  onChange: (value: string) => void;
  mode?: 'date' | 'time';
  placeholder?: string;
};

const baseStyle: React.CSSProperties = {
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
};

// Fixed 5-minute time options. A native <select> gives a reliable 5-minute
// picker on every browser (the <input type="time" step> attribute is ignored
// on some mobile browsers, which left times on 1-minute increments).
const TIME_OPTIONS = (() => {
  const out: { value: string; label: string }[] = [];
  for (let m = 0; m < 24 * 60; m += 5) {
    const h = Math.floor(m / 60);
    const min = m % 60;
    const value = `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    const h12 = h % 12 === 0 ? 12 : h % 12;
    const label = `${h12}:${String(min).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
    out.push({ value, label });
  }
  return out;
})();

export function DateField({ value, onChange, mode = 'date' }: DateFieldProps) {
  if (mode === 'time') {
    const known = TIME_OPTIONS.some((o) => o.value === value);
    const children = TIME_OPTIONS.map((o) =>
      React.createElement('option', { key: o.value, value: o.value }, o.label)
    );
    // Preserve an off-grid existing value (e.g. a legacy event time) as an option.
    if (value && !known) children.unshift(React.createElement('option', { key: value, value }, value));
    return React.createElement(
      'select',
      {
        value: value ?? '',
        onChange: (event: { target: { value: string } }) => onChange(event.target.value),
        style: baseStyle,
      },
      children
    );
  }
  return React.createElement('input', {
    type: 'date',
    value: value ?? '',
    onChange: (event: { target: { value: string } }) => onChange(event.target.value),
    style: baseStyle,
  });
}
