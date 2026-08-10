import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import {
  Card,
  MemberChips,
  QuickButton,
  SectionTitle,
} from '@/components/ui';
import { colors } from '@/constants/theme';
import { todayEvents } from '@/data/mock';
import { supabase } from '@/lib/supabase';

type FamilyMember = {
  id: string;
  display_name: string;
  first_name: string | null;
  relationship: string | null;
  user_id: string | null;
};

export default function Today() {
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [currentMember, setCurrentMember] =
    useState<FamilyMember | null>(null);

  useEffect(() => {
    checkSession();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setSignedIn(true);
        loadHousehold(session.user.id);
      } else {
        setSignedIn(false);
        setMembers([]);
        setCurrentMember(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function checkSession() {
    setLoading(true);

    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (session?.user) {
      setSignedIn(true);
      await loadHousehold(session.user.id);
    } else {
      setSignedIn(false);
      setLoading(false);
    }
  }

  async function signIn() {
    try {
      setError('');
      setLoading(true);

      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

      if (signInError) {
        throw signInError;
      }

      if (data.user) {
        setSignedIn(true);
        await loadHousehold(data.user.id);
      }
    } catch (err: any) {
      setError(err?.message ?? 'Unable to sign in.');
      setLoading(false);
    }
  }

  async function loadHousehold(userId: string) {
    try {
      setError('');

      // Find Bella's family-member record and household.
      const { data: me, error: meError } = await supabase
        .from('family_members')
        .select(
          'id, household_id, display_name, first_name, relationship, user_id'
        )
        .eq('user_id', userId)
        .single();

      if (meError) {
        throw meError;
      }

      // Load everyone in the Chan–Siagian household.
      const { data: family, error: familyError } = await supabase
        .from('family_members')
        .select(
          'id, display_name, first_name, relationship, user_id'
        )
        .eq('household_id', me.household_id)
        .eq('is_active', true)
        .order('created_at');

      if (familyError) {
        throw familyError;
      }

      setCurrentMember(me);
      setMembers(family ?? []);
    } catch (err: any) {
      setError(err?.message ?? 'Unable to load HAMI household.');
    } finally {
      setLoading(false);
    }
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  if (loading) {
    return (
      <Screen>
        <View style={s.center}>
          <ActivityIndicator size="large" color={colors.forest} />
          <Text style={s.loadingText}>Opening HAMI…</Text>
        </View>
      </Screen>
    );
  }

  if (!signedIn) {
    return (
      <Screen>
        <View style={s.signInWrap}>
          <Text style={s.brand}>HAMI</Text>
          <Text style={s.tagline}>Our Life · Our Home · Our Story</Text>

          <Card style={s.signInCard}>
            <Text style={s.signInTitle}>Welcome home</Text>

            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor={colors.muted}
              autoCapitalize="none"
              keyboardType="email-address"
              style={s.input}
            />

            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.muted}
              secureTextEntry
              style={s.input}
            />

            {!!error && <Text style={s.error}>{error}</Text>}

            <Pressable style={s.button} onPress={signIn}>
              <Text style={s.buttonText}>Sign in to HAMI</Text>
            </Pressable>
          </Card>
        </View>
      </Screen>
    );
  }

  const firstName =
    currentMember?.first_name ||
    currentMember?.display_name ||
    'Bella';

  return (
    <Screen>
      <View style={s.top}>
        <View>
          <Text style={s.kicker}>Good morning,</Text>
          <Text style={s.hero}>{firstName}.</Text>
          <Text style={s.sub}>
            Here’s what’s happening with HAMI today.
          </Text>
        </View>

        <Pressable style={s.profile} onPress={signOut}>
          <Text style={s.profileText}>
            {firstName.charAt(0).toUpperCase()}
          </Text>
        </Pressable>
      </View>

      <SectionTitle
        title="Our family"
        action={`${members.length} members`}
      />

      <Card>
        {members.map((member, index) => (
          <View
            key={member.id}
            style={[
              s.familyRow,
              index < members.length - 1 && s.sep,
            ]}
          >
            <View style={s.familyAvatar}>
              <Text style={s.familyAvatarText}>
                {member.display_name.charAt(0).toUpperCase()}
              </Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={s.eventTitle}>
                {member.display_name}
              </Text>
              <Text style={s.meta}>
                {member.relationship ?? 'Family'}
              </Text>
            </View>

            {member.user_id && (
              <Text style={s.loginBadge}>HAMI login</Text>
            )}
          </View>
        ))}
      </Card>

      <SectionTitle
        title="Today · Monday, Aug 10"
        action="Calendar"
      />

      <Card>
        {todayEvents.map((e, i) => (
          <View
            key={e.id}
            style={[
              s.event,
              i < todayEvents.length - 1 && s.sep,
            ]}
          >
            <View
              style={[
                s.bar,
                { backgroundColor: e.color },
              ]}
            />

            <View style={s.time}>
              <Text style={s.timeText}>{e.start}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={s.eventTitle}>{e.title}</Text>
              <Text style={s.meta}>{e.location}</Text>
            </View>

            <MemberChips ids={e.memberIds} />
          </View>
        ))}
      </Card>

      <SectionTitle title="Quick add" />

      <View style={s.quickRow}>
        <QuickButton
          icon="calendar-outline"
          label="Event"
        />
        <QuickButton
          icon="checkbox-outline"
          label="Task"
        />
        <QuickButton
          icon="document-text-outline"
          label="Note"
        />
        <QuickButton
          icon="camera-outline"
          label="Photo"
        />
      </View>

      <SectionTitle title="Coming up" />

      <View style={s.two}>
        <Card style={s.mini}>
          <Text style={s.miniEyebrow}>TRIP</Text>
          <Text style={s.miniTitle}>Hawaii</Text>
          <Text style={s.meta}>5 days to go</Text>
          <Ionicons
            name="airplane-outline"
            size={24}
            color={colors.forest}
          />
        </Card>

        <Card style={s.mini}>
          <Text style={s.miniEyebrow}>HOME</Text>
          <Text style={s.miniTitle}>3 chores due</Text>
          <Text style={s.meta}>2 assigned to you</Text>
          <Ionicons
            name="home-outline"
            size={24}
            color={colors.clay}
          />
        </Card>
      </View>
    </Screen>
  );
}

const s = StyleSheet.create({
  center: {
    minHeight: 500,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },

  loadingText: {
    color: colors.muted,
    fontSize: 14,
  },

  signInWrap: {
    maxWidth: 480,
    width: '100%',
    alignSelf: 'center',
    paddingTop: 70,
  },

  brand: {
    fontSize: 44,
    fontWeight: '800',
    letterSpacing: 5,
    textAlign: 'center',
    color: colors.forest,
  },

  tagline: {
    textAlign: 'center',
    color: colors.muted,
    marginTop: 8,
    marginBottom: 32,
  },

  signInCard: {
    gap: 14,
  },

  signInTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 6,
  },

  input: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 15,
    color: colors.text,
    backgroundColor: '#fff',
  },

  button: {
    backgroundColor: colors.forest,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 4,
  },

  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '700',
  },

  error: {
    color: '#a33',
    fontSize: 13,
  },

  top: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },

  kicker: {
    fontSize: 16,
    color: colors.muted,
  },

  hero: {
    fontSize: 34,
    fontWeight: '800',
    color: colors.text,
    letterSpacing: -1,
  },

  sub: {
    fontSize: 14,
    color: colors.muted,
    marginTop: 5,
    maxWidth: 300,
  },

  profile: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.forest,
    alignItems: 'center',
    justifyContent: 'center',
  },

  profileText: {
    color: '#fff',
    fontWeight: '800',
  },

  familyRow: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  familyAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E6EFE9',
  },

  familyAvatarText: {
    color: colors.forest,
    fontWeight: '800',
  },

  loginBadge: {
    fontSize: 11,
    color: colors.forest,
    fontWeight: '700',
  },

  event: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  sep: {
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },

  bar: {
    width: 4,
    height: 40,
    borderRadius: 9,
  },

  time: {
    width: 70,
  },

  timeText: {
    fontWeight: '700',
    fontSize: 13,
    color: colors.text,
  },

  eventTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: colors.text,
  },

  meta: {
    fontSize: 12,
    color: colors.muted,
    marginTop: 3,
  },

  quickRow: {
    flexDirection: 'row',
    gap: 8,
    flexWrap: 'wrap',
  },

  two: {
    flexDirection: 'row',
    gap: 10,
  },

  mini: {
    flex: 1,
    minHeight: 126,
    justifyContent: 'space-between',
  },

  miniEyebrow: {
    fontSize: 11,
    fontWeight: '800',
    color: colors.muted,
    letterSpacing: 1,
  },

  miniTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
});