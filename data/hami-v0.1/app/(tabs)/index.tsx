import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

import { Screen } from '@/components/Screen';
import {
  Card,
  MemberChips,
  QuickButton,
  SectionTitle,
} from '@/components/ui';
import { colors } from '@/constants/theme';
import { CalendarEvent, FamilyMember, formatEventTime, loadEventsForDate, subscribeToCalendarChanges, toDateKey } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';
import { loadTodos, subscribeToTodoChanges, Todo } from '@/lib/todos';
import { Chore, loadChores, subscribeToChoreChanges } from '@/lib/chores';

export default function Today() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(false);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([]);
  const [todayTodos, setTodayTodos] = useState<Todo[]>([]);
  const [dueChores, setDueChores] = useState<Chore[]>([]);
  const [calendarError, setCalendarError] = useState('');
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
        setCurrentMember(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => subscribeToCalendarChanges(() => {
    void loadEventsForDate(toDateKey()).then(setTodayEvents).catch((err: any) => setCalendarError(err?.message ?? 'Unable to load today\'s calendar.'));
  }), []);

  useEffect(() => subscribeToTodoChanges(() => { void loadTodayTodos(); }), []);

  async function loadTodayTodos() {
    try {
      const todos = await loadTodos();
      const today = toDateKey();
      setTodayTodos(todos.filter((todo) => !todo.completed && (!todo.dueAt || toDateKey(new Date(todo.dueAt)) <= today)));
    } catch (err: any) { setCalendarError(err?.message ?? 'Unable to load today\'s tasks.'); }
  }

  useEffect(() => subscribeToChoreChanges(() => { void loadDueChores(); }), []);
  async function loadDueChores() {
    try { const chores = await loadChores(); const now = new Date(); setDueChores(chores.filter((chore) => chore.isActive && !chore.completed && !!chore.nextDueAt && new Date(chore.nextDueAt) <= now)); }
    catch (err: any) { setCalendarError(err?.message ?? 'Unable to load due chores.'); }
  }

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

      setCurrentMember(me);
      try {
        setCalendarError('');
        setTodayEvents(await loadEventsForDate(toDateKey()));
        await loadTodayTodos();
        await loadDueChores();
      } catch (calendarLoadError: any) {
        setCalendarError(calendarLoadError?.message ?? 'Unable to load today\'s calendar.');
      }
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

      <SectionTitle title={`Today · ${new Intl.DateTimeFormat(undefined, { weekday: 'long', month: 'short', day: 'numeric' }).format(new Date())}`} action="Calendar" />

      <Pressable onPress={() => router.push('/(tabs)/calendar')}>
      {calendarError ? <Card><Text style={s.error}>{calendarError}</Text></Card> : todayEvents.length === 0 ? <Card><Text style={s.meta}>Nothing on the calendar today.</Text></Card> : <Card>
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
                { backgroundColor: ['#D98D62', '#8BAEBB', '#94A783'][i % 3] },
              ]}
            />

            <View style={s.time}>
              <Text style={s.timeText}>{formatEventTime(e)}</Text>
            </View>

            <View style={{ flex: 1 }}>
              <Text style={s.eventTitle}>{e.title}</Text>
              <Text style={s.meta}>{e.location}</Text>
            </View>

            <MemberChips ids={e.assignees.map((member) => member.id)} memberOptions={e.assignees} />
          </View>
        ))}
      </Card>}
      </Pressable>

      <SectionTitle title="To-Do" action={`${todayTodos.length} active`} />
      <Pressable onPress={() => router.push('/(tabs)/todo')}>
      <Card>
        {todayTodos.length === 0 ? <Text style={s.meta}>No tasks due today.</Text> : todayTodos.slice(0, 4).map((todo, index) => (
          <View key={todo.id} style={[s.todoRow, index < Math.min(todayTodos.length, 4) - 1 && s.sep]}>
            <Ionicons name="ellipse-outline" size={20} color={colors.sage}/>
            <View style={{ flex: 1 }}><Text style={s.eventTitle}>{todo.title}</Text><Text style={s.meta}>{todo.dueAt ? 'Due today or overdue' : 'No due date'}</Text></View>
            <MemberChips ids={todo.assignees.map((member) => member.id)} memberOptions={todo.assignees}/>
          </View>
        ))}
      </Card>
      </Pressable>

      <SectionTitle title="Due chores" action={`${dueChores.length} due`} />
      <Card>{dueChores.length === 0 ? <Text style={s.meta}>No chores due right now.</Text> : dueChores.slice(0, 4).map((chore, index) => <View key={chore.id} style={[s.todoRow, index < Math.min(dueChores.length, 4) - 1 && s.sep]}><Ionicons name="brush-outline" size={20} color={colors.clay}/><View style={{flex:1}}><Text style={s.eventTitle}>{chore.title}</Text><Text style={s.meta}>{chore.room || 'Around the house'}</Text></View><MemberChips ids={chore.assignees.map(member => member.id)} memberOptions={chore.assignees}/></View>)}</Card>

      <SectionTitle title="Quick add" />

      <View style={s.quickRow}>
        <QuickButton
          icon="calendar-outline"
          label="Event"
          onPress={() => router.push({ pathname: '/(tabs)/calendar', params: { new: '1' } })}
        />
        <QuickButton
          icon="checkbox-outline"
          label="Task"
          onPress={() => router.push({ pathname: '/(tabs)/todo', params: { new: '1' } })}
        />
        <QuickButton
          icon="document-text-outline"
          label="Note"
          onPress={() => router.push({ pathname: '/(tabs)/todo', params: { new: '1' } })}
        />
        <QuickButton
          icon="camera-outline"
          label="Photo"
          onPress={() => router.push('/more/photos')}
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
          <Text style={s.miniTitle}>{dueChores.length} chores due</Text>
          <Text style={s.meta}>{dueChores.filter(chore => chore.assignees.some(member => member.id === currentMember?.id)).length} assigned to you</Text>
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

  todoRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', gap: 10 },

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
