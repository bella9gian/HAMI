import { Platform } from 'react-native';
import { IONICONS_FONT_DATA_URL } from './ioniconsFont';

/**
 * Register the Ionicons glyph font on web via an embedded data URI.
 *
 * The `@expo/vector-icons` Ionicons component renders glyphs in the `ionicons`
 * font family. On the static web build Expo emits that font under an
 * `assets/node_modules/...` path; some static hosts don't serve that path, so
 * the font 404s and every icon shows as a blank box. Embedding the font as a
 * data URI removes the separate request entirely, so the icons always render.
 */
export function registerWebIconFont() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') return;
  if (document.getElementById('hami-ionicons-font')) return;

  const style = document.createElement('style');
  style.id = 'hami-ionicons-font';
  style.textContent =
    `@font-face{font-family:'ionicons';font-style:normal;font-weight:normal;` +
    `font-display:swap;src:url(${IONICONS_FONT_DATA_URL}) format('truetype');}`;
  document.head.appendChild(style);
}
