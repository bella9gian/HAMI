export type PickedImage = { blob: Blob; name: string };

// Web: open the OS file picker via a transient <input type="file">.
export function pickImage(): Promise<PickedImage | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = () => {
      const file = input.files?.[0];
      resolve(file ? { blob: file, name: file.name } : null);
    };
    // Some browsers fire cancel; resolve null so we don't hang.
    input.oncancel = () => resolve(null);
    input.click();
  });
}
