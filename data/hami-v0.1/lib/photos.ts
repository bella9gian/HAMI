import { PickedImage } from '@/lib/pickImage';
import { supabase } from '@/lib/supabase';

export type Photo = {
  id: string;
  storagePath: string;
  caption: string | null;
  url: string | null;
};

type Row = { id: string; storage_path: string; caption: string | null };

export async function loadPhotos(): Promise<Photo[]> {
  const { data, error } = await supabase.from('photos').select('id, storage_path, caption').order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as Row[];
  return Promise.all(rows.map(async (r) => {
    const { data: signed } = await supabase.storage.from('photos').createSignedUrl(r.storage_path, 3600);
    return { id: r.id, storagePath: r.storage_path, caption: r.caption, url: signed?.signedUrl ?? null };
  }));
}

function uuid(): string {
  const c: any = (globalThis as any).crypto;
  if (c?.randomUUID) return c.randomUUID();
  return 'xxxxxxxxxxxx4xxxyxxxxxxxxxxxxxxx'.replace(/[xy]/g, (ch) => {
    const r = Math.floor(Math.random() * 16);
    return (ch === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export async function uploadPhoto(input: { householdId: string; createdBy: string; picked: PickedImage; caption?: string }): Promise<void> {
  const ext = (input.picked.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
  const path = `${input.householdId}/${uuid()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from('photos').upload(path, input.picked.blob, {
    contentType: input.picked.blob.type || 'image/jpeg',
    upsert: false,
  });
  if (uploadError) throw uploadError;

  const { error } = await supabase.from('photos').insert({
    household_id: input.householdId,
    created_by: input.createdBy,
    storage_path: path,
    caption: input.caption?.trim() || null,
  });
  if (error) {
    await supabase.storage.from('photos').remove([path]);
    throw error;
  }
}

export async function deletePhoto(photo: Photo): Promise<void> {
  const { error } = await supabase.from('photos').delete().eq('id', photo.id);
  if (error) throw error;
  await supabase.storage.from('photos').remove([photo.storagePath]);
}
