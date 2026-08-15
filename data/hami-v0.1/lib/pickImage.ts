export type PickedImage = { blob: Blob; name: string };

// Native fallback — the app is deployed on web, where pickImage.web.ts handles
// file selection. On native this would use expo-image-picker.
export function pickImage(): Promise<PickedImage | null> {
  return Promise.resolve(null);
}
