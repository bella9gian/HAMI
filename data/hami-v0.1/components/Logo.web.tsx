import React from 'react';
import { colors } from '@/constants/theme';

// HAMI emblem: a stylized rumah Batak (saddle-roofed Batak house, for the
// Siagian side) sheltering the Chinese surname 陈 (Chen/Chan). Web renders a
// real inline <svg>.
export function Logo({ size = 132 }: { size?: number }) {
  const roof = colors.forest;
  const body = colors.clay;

  return React.createElement(
    'svg',
    { width: size, height: size, viewBox: '0 0 120 120', fill: 'none', role: 'img', 'aria-label': 'HAMI' },
    // upper saddle roof (upswept pointed gable ends)
    React.createElement('path', { d: 'M8,40 Q60,66 112,40 Q60,20 8,40 Z', fill: roof }),
    // lower/second saddle roof — the wider eaves of a Batak house
    React.createElement('path', { d: 'M14,58 Q60,86 106,58 Q60,44 14,58 Z', fill: roof, opacity: 0.9 }),
    // house body sheltering the character
    React.createElement('path', { d: 'M40,60 L80,60 L74,96 L46,96 Z', fill: body }),
    // the surname 陈
    React.createElement(
      'text',
      { x: 60, y: 86, textAnchor: 'middle', fontSize: 22, fontWeight: 'bold', fontFamily: 'serif', fill: '#fff' },
      '陈',
    ),
    // stilts
    React.createElement('rect', { x: 47, y: 96, width: 4, height: 15, rx: 2, fill: roof }),
    React.createElement('rect', { x: 69, y: 96, width: 4, height: 15, rx: 2, fill: roof }),
    // ground
    React.createElement('rect', { x: 34, y: 110, width: 52, height: 4, rx: 2, fill: body, opacity: 0.5 }),
  );
}
