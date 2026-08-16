import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Screen } from '@/components/Screen';
import { Card } from '@/components/ui';
import { Logo } from '@/components/Logo';
import { colors } from '@/constants/theme';
import { supabase } from '@/lib/supabase';

type Status = 'checking' | 'ready' | 'invalid' | 'done';

// Password-recovery landing page. Supabase redirects here from the reset email
// with either a recovery token in the URL hash (implicit flow) or a `code`
// query param (PKCE); we establish the session, then let the user set a new
// password. Lives outside the tab navigator so no bottom bar shows.
export default function ResetPassword() {
  const router = useRouter();
  const [status, setStatus] = useState<Status>('checking');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') { setStatus('invalid'); return; }
    void (async () => {
      try {
        const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''));
        const query = new URLSearchParams(window.location.search);
        const errDesc = hash.get('error_description') || query.get('error_description');
        if (errDesc) { setError(errDesc); setStatus('invalid'); return; }

        const accessToken = hash.get('access_token');
        const refreshToken = hash.get('refresh_token');
        const code = query.get('code');

        if (accessToken && refreshToken) {
          const { error: e } = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
          if (e) throw e;
        } else if (code) {
          const { error: e } = await supabase.auth.exchangeCodeForSession(code);
          if (e) throw e;
        } else {
          const { data: { session } } = await supabase.auth.getSession();
          if (!session) { setStatus('invalid'); return; }
        }
        // Strip the tokens from the address bar once consumed.
        window.history.replaceState(null, '', window.location.pathname);
        setStatus('ready');
      } catch (e: any) {
        setError(e?.message ?? 'This reset link is invalid or has expired.');
        setStatus('invalid');
      }
    })();
  }, []);

  async function submit() {
    setError('');
    if (password.length < 8) { setError('Use at least 8 characters.'); return; }
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    setSaving(true);
    try {
      const { error: e } = await supabase.auth.updateUser({ password });
      if (e) throw e;
      setStatus('done');
    } catch (e: any) {
      setError(e?.message ?? 'Unable to update your password.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Screen>
      <View style={s.wrap}>
        <View style={s.logo}><Logo size={96} /></View>
        <Text style={s.brand}>HAMI</Text>

        {status === 'checking' && (
          <View style={s.center}><ActivityIndicator color={colors.forest} /><Text style={s.meta}>Checking your reset link…</Text></View>
        )}

        {status === 'invalid' && (
          <Card style={s.card}>
            <Text style={s.title}>Reset link problem</Text>
            <Text style={s.meta}>{error || 'This reset link is invalid or has expired. Request a new one from the sign-in screen.'}</Text>
            <Pressable style={s.button} onPress={() => router.replace('/')}><Text style={s.buttonText}>Back to sign in</Text></Pressable>
          </Card>
        )}

        {status === 'ready' && (
          <Card style={s.card}>
            <Text style={s.title}>Set a new password</Text>
            <TextInput value={password} onChangeText={setPassword} placeholder="New password" placeholderTextColor={colors.muted} secureTextEntry style={s.input} />
            <TextInput value={confirm} onChangeText={setConfirm} placeholder="Confirm new password" placeholderTextColor={colors.muted} secureTextEntry style={s.input} />
            {!!error && <Text style={s.error}>{error}</Text>}
            <Pressable style={s.button} onPress={submit} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={s.buttonText}>Update password</Text>}
            </Pressable>
          </Card>
        )}

        {status === 'done' && (
          <Card style={s.card}>
            <Text style={s.title}>Password updated</Text>
            <Text style={s.meta}>You’re all set. Your new password is ready to use.</Text>
            <Pressable style={s.button} onPress={() => router.replace('/')}><Text style={s.buttonText}>Go to HAMI</Text></Pressable>
          </Card>
        )}
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  wrap: { maxWidth: 480, width: '100%', alignSelf: 'center', paddingTop: 70 },
  logo: { alignItems: 'center', marginBottom: 10 },
  brand: { fontSize: 40, fontWeight: '800', letterSpacing: 5, textAlign: 'center', color: colors.forest, marginBottom: 28 },
  center: { alignItems: 'center', gap: 12, paddingVertical: 30 },
  card: { gap: 14 },
  title: { fontSize: 22, fontWeight: '700', color: colors.text },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: 12, paddingHorizontal: 14, paddingVertical: 13, fontSize: 15, color: colors.text, backgroundColor: '#fff' },
  button: { backgroundColor: colors.forest, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 4 },
  buttonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
  error: { color: '#a33', fontSize: 13 },
  meta: { color: colors.muted, fontSize: 14, lineHeight: 20 },
});
