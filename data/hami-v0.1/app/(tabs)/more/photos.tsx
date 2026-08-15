import { useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { loadHouseholdContext } from '@/lib/members';
import { pickImage } from '@/lib/pickImage';
import { deletePhoto, loadPhotos, Photo, uploadPhoto } from '@/lib/photos';

export default function Photos() {
  const router = useRouter();
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const [viewing, setViewing] = useState<Photo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  useEffect(() => { void load(); }, []);

  async function load() {
    setLoading(true); setError('');
    try {
      const ctx = await loadHouseholdContext();
      setHouseholdId(ctx.householdId); setMeId(ctx.currentMember.id);
      setPhotos(await loadPhotos());
    } catch (e: any) { setError(e?.message ?? 'Unable to load photos.'); }
    finally { setLoading(false); }
  }
  async function refresh() { setPhotos(await loadPhotos()); }

  async function addPhoto() {
    if (!householdId || !meId || uploading) return;
    const picked = await pickImage();
    if (!picked) return;
    setUploading(true); setError('');
    try { await uploadPhoto({ householdId, createdBy: meId, picked }); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to upload this photo.'); }
    finally { setUploading(false); }
  }

  async function removeViewing() {
    if (!viewing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    try { await deletePhoto(viewing); setViewing(null); setConfirmDelete(false); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to delete this photo.'); }
  }

  return (
    <Screen>
      <View style={s.headBar}>
        <Ionicons name="chevron-back" size={25} color={colors.forest} onPress={() => router.back()}/>
        <Text style={s.title}>Photos</Text>
        <Pressable onPress={addPhoto} disabled={uploading} accessibilityLabel="Add photo">
          {uploading ? <ActivityIndicator color={colors.forest}/> : <Ionicons name="add" size={26} color={colors.forest}/>}
        </Pressable>
      </View>

      {loading ? (
        <View style={s.loading}><ActivityIndicator color={colors.forest}/><Text style={s.meta}>Loading photos…</Text></View>
      ) : error ? (
        <Card style={s.message}><Text style={s.error}>{error}</Text><Pressable onPress={load}><Text style={s.action}>Try again</Text></Pressable></Card>
      ) : photos.length === 0 ? (
        <Card style={s.empty}>
          <Ionicons name="images-outline" size={34} color={colors.forest}/>
          <Text style={s.emptyTitle}>No photos yet</Text>
          <Text style={s.meta}>Tap + to add your first family memory.</Text>
        </Card>
      ) : (
        <View style={s.grid}>
          {photos.map((p) => (
            <Pressable key={p.id} style={s.tile} onPress={() => { setViewing(p); setConfirmDelete(false); }}>
              {p.url ? <Image source={{ uri: p.url }} style={s.tileImg} resizeMode="cover"/> : <View style={[s.tileImg, s.tilePlaceholder]}><Ionicons name="image-outline" size={22} color={colors.muted}/></View>}
            </Pressable>
          ))}
        </View>
      )}

      {viewing && (
        <View style={s.viewer}>
          <View style={s.viewerBar}>
            <Pressable onPress={() => { setViewing(null); setConfirmDelete(false); }} hitSlop={10}><Ionicons name="close" size={28} color="#fff"/></Pressable>
            <Pressable onPress={removeViewing} hitSlop={10}><Text style={s.viewerDelete}>{confirmDelete ? 'Tap again to delete' : 'Delete'}</Text></Pressable>
          </View>
          {viewing.url && <Image source={{ uri: viewing.url }} style={s.viewerImg} resizeMode="contain"/>}
          {!!viewing.caption && <Text style={s.viewerCaption}>{viewing.caption}</Text>}
        </View>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  headBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 18 },
  title: { fontSize: 24, fontWeight: '800', color: colors.text },
  loading: { minHeight: 160, alignItems: 'center', justifyContent: 'center', gap: 8 },
  message: { gap: 7 },
  error: { color: '#A33', fontSize: 13 },
  action: { color: colors.forest, fontWeight: '700' },
  meta: { fontSize: 12, color: colors.muted },
  empty: { alignItems: 'center', gap: 8, paddingVertical: 34 },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: colors.text, marginTop: 6 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  tile: { width: '48%', aspectRatio: 1, borderRadius: radius.md, overflow: 'hidden', backgroundColor: colors.surfaceMuted },
  tileImg: { width: '100%', height: '100%' },
  tilePlaceholder: { alignItems: 'center', justifyContent: 'center' },
  viewer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(20,20,20,0.96)', padding: 16, gap: 14, alignItems: 'center' },
  viewerBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', width: '100%' },
  viewerDelete: { color: '#FF6B6B', fontWeight: '800' },
  viewerImg: { flex: 1, width: '100%', borderRadius: radius.md },
  viewerCaption: { color: '#fff', fontSize: 14, textAlign: 'center' },
});
