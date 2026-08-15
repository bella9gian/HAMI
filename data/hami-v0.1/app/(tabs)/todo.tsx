import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Screen } from '@/components/Screen';
import { DateField } from '@/components/DateField';
import { Card, Check, MemberChips, ScreenHeader, SectionTitle } from '@/components/ui';
import { colors, radius } from '@/constants/theme';
import { FamilyMember } from '@/lib/calendar';
import { createTodo, deleteTodo, dueDateKey, dueInputToIso, loadTodos, setTodoCompleted, Todo, updateTodo } from '@/lib/todos';
import { supabase } from '@/lib/supabase';

type Status = 'active' | 'completed' | 'all';

export default function TodoScreen() {
  const params = useLocalSearchParams<{ new?: string }>();
  const [todos, setTodos] = useState<Todo[]>([]);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [householdId, setHouseholdId] = useState<string | null>(null);
  const [meId, setMeId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState<Status>('active');
  const [memberFilter, setMemberFilter] = useState('all');

  // `showNew` is the top create form; `editing` drives the inline editor that
  // opens directly beneath the tapped task.
  const [showNew, setShowNew] = useState(false);
  const [editing, setEditing] = useState<Todo | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [title, setTitle] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [assigneeIds, setAssigneeIds] = useState<string[]>([]);

  useEffect(() => { void loadHousehold(); }, []);
  useEffect(() => { if (params.new === '1') openNew(); }, [params.new]);

  async function refresh() { setTodos(await loadTodos()); }

  async function loadHousehold() {
    setLoading(true); setError('');
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('Sign in on Today to view family tasks.');
      const { data: me, error: e } = await supabase.from('family_members').select('id, household_id').eq('user_id', session.user.id).single();
      if (e) throw e;
      const { data: family, error: f } = await supabase.from('family_members').select('id, display_name, first_name, relationship, user_id').eq('household_id', me.household_id).eq('is_active', true).order('created_at');
      if (f) throw f;
      setHouseholdId(me.household_id); setMeId(me.id); setMembers(family ?? []);
      await refresh();
    } catch (e: any) { setError(e?.message ?? 'Unable to load tasks.'); }
    finally { setLoading(false); }
  }

  function reset() { setTitle(''); setDueDate(''); setAssigneeIds([]); setConfirmDelete(false); }
  function openNew() { reset(); setEditing(null); setShowNew(true); }
  function startEdit(t: Todo) {
    if (editing?.id === t.id) { setEditing(null); return; }
    setTitle(t.title); setDueDate(dueDateKey(t.dueAt)); setAssigneeIds(t.assignees.map((m) => m.id));
    setConfirmDelete(false); setShowNew(false); setEditing(t);
  }
  function closeForms() { setShowNew(false); setEditing(null); reset(); }

  async function save() {
    if (!title.trim() || !householdId || !meId) { setError('Add a task title before saving.'); return; }
    setSaving(true); setError('');
    try {
      const values = { title, dueAt: dueInputToIso(dueDate), assigneeIds };
      if (editing) await updateTodo(editing.id, values);
      else await createTodo({ ...values, householdId, createdBy: meId });
      await refresh(); closeForms();
    } catch (e: any) { setError(e?.message ?? 'Unable to save this task.'); }
    finally { setSaving(false); }
  }

  async function toggle(t: Todo) {
    try { await setTodoCompleted(t.id, !t.completed); await refresh(); }
    catch (e: any) { setError(e?.message ?? 'Unable to update this task.'); }
  }

  async function remove() {
    if (!editing) return;
    if (!confirmDelete) { setConfirmDelete(true); return; }
    setSaving(true);
    try { await deleteTodo(editing.id); await refresh(); closeForms(); }
    catch (e: any) { setError(e?.message ?? 'Unable to delete this task.'); }
    finally { setSaving(false); }
  }

  const filtered = useMemo(() => todos.filter((t) =>
    (status === 'all' || (status === 'completed' ? t.completed : !t.completed)) &&
    (memberFilter === 'all' || (memberFilter === 'unassigned' ? t.assignees.length === 0 : t.assignees.some((m) => m.id === memberFilter)))
  ), [todos, status, memberFilter]);

  const toggleAssignee = (id: string) => setAssigneeIds((ids) => ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]);

  function taskForm(isEdit: boolean) {
    return (
      <Card style={isEdit ? s.inlineForm : s.form}>
        <View style={s.head}>
          <Text style={s.formTitle}>{isEdit ? 'Edit task' : 'New task'}</Text>
          <Pressable onPress={closeForms}><Ionicons name="close" size={22} color={colors.muted}/></Pressable>
        </View>
        <View style={s.field}>
          <Text style={s.label}>Task</Text>
          <TextInput value={title} onChangeText={setTitle} placeholder="What needs doing?" placeholderTextColor={colors.muted} style={s.input}/>
        </View>
        <View style={s.field}>
          <Text style={s.label}>Due date</Text>
          <DateField value={dueDate} onChange={setDueDate} mode="date"/>
        </View>
        <View style={s.head}>
          <Text style={s.label}>Assigned to</Text>
          <Pressable onPress={() => setAssigneeIds(assigneeIds.length === members.length ? [] : members.map((m) => m.id))}>
            <Text style={s.action}>{assigneeIds.length === members.length ? 'Nobody' : 'Everyone'}</Text>
          </Pressable>
        </View>
        <View style={s.assignees}>
          {members.map((m) => (
            <Pressable key={m.id} onPress={() => toggleAssignee(m.id)} style={[s.assignee, assigneeIds.includes(m.id) && s.assigneeActive]}>
              <Text style={[s.assigneeText, assigneeIds.includes(m.id) && s.white]}>{m.first_name || m.display_name}</Text>
            </Pressable>
          ))}
        </View>
        {!!error && <Text style={s.error}>{error}</Text>}
        <Pressable disabled={saving} onPress={save} style={s.save}>
          {saving ? <ActivityIndicator color="#fff"/> : <Text style={s.white}>{isEdit ? 'Save changes' : 'Create task'}</Text>}
        </Pressable>
        {isEdit && (
          <Pressable onPress={remove} style={s.delete}>
            <Text style={s.deleteText}>{confirmDelete ? 'Tap again to delete permanently' : 'Delete task'}</Text>
          </Pressable>
        )}
      </Card>
    );
  }

  return (
    <Screen>
      <ScreenHeader title="To-Do" right={<Pressable accessibilityLabel="Create task" onPress={openNew}><Ionicons name="add" size={28} color={colors.forest}/></Pressable>}/>
      <View style={s.filters}>
        {(['active', 'completed', 'all'] as Status[]).map((x) => (
          <Pressable key={x} onPress={() => setStatus(x)} style={[s.filter, status === x && s.filterActive]}>
            <Text style={[s.filterText, status === x && s.filterTextActive]}>{x[0].toUpperCase() + x.slice(1)}</Text>
          </Pressable>
        ))}
      </View>
      <View style={s.memberFilters}>
        <Pressable onPress={() => setMemberFilter('all')} style={[s.memberFilter, memberFilter === 'all' && s.memberFilterActive]}><Text style={s.memberFilterText}>Everyone</Text></Pressable>
        {members.map((m) => (
          <Pressable key={m.id} onPress={() => setMemberFilter(m.id)} style={[s.memberFilter, memberFilter === m.id && s.memberFilterActive]}><Text style={s.memberFilterText}>{m.first_name || m.display_name}</Text></Pressable>
        ))}
        <Pressable onPress={() => setMemberFilter('unassigned')} style={[s.memberFilter, memberFilter === 'unassigned' && s.memberFilterActive]}><Text style={s.memberFilterText}>Nobody</Text></Pressable>
      </View>

      {showNew && taskForm(false)}

      <SectionTitle title={`${filtered.length} ${filtered.length === 1 ? 'task' : 'tasks'}`}/>
      {!!error && !showNew && !editing && <Card style={s.message}><Text style={s.error}>{error}</Text><Pressable onPress={loadHousehold}><Text style={s.action}>Try again</Text></Pressable></Card>}
      {loading ? (
        <View style={s.loading}><ActivityIndicator color={colors.forest}/><Text style={s.meta}>Loading family tasks…</Text></View>
      ) : !error && filtered.length === 0 ? (
        <Card style={s.message}><Text style={s.label}>No tasks here.</Text><Text style={s.meta}>{todos.length ? 'Try another filter.' : 'Tap + to create your first family task.'}</Text></Card>
      ) : !error && (
        <Card>
          {filtered.map((t, i) => (
            <View key={t.id}>
              <Pressable onPress={() => startEdit(t)} style={[s.row, (i < filtered.length - 1 || editing?.id === t.id) && s.sep]}>
                <Pressable accessibilityLabel={t.completed ? 'Mark incomplete' : 'Mark complete'} onPress={(e) => { e.stopPropagation(); void toggle(t); }}><Check done={t.completed}/></Pressable>
                <View style={{ flex: 1 }}>
                  <Text style={[s.title, t.completed && s.done]}>{t.title}</Text>
                  <Text style={s.meta}>{t.dueAt ? new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(t.dueAt)) : 'No due date'}</Text>
                </View>
                <MemberChips ids={t.assignees.map((m) => m.id)} memberOptions={t.assignees}/>
                <Ionicons name={editing?.id === t.id ? 'chevron-up' : 'chevron-down'} size={18} color={colors.muted}/>
              </Pressable>
              {editing?.id === t.id && taskForm(true)}
            </View>
          ))}
        </Card>
      )}
    </Screen>
  );
}

const s = StyleSheet.create({
  filters: { flexDirection: 'row', gap: 8 },
  filter: { flex: 1, alignItems: 'center', paddingVertical: 10, borderRadius: radius.pill, backgroundColor: colors.surfaceMuted },
  filterActive: { backgroundColor: colors.forest },
  filterText: { color: colors.muted, fontWeight: '700' },
  filterTextActive: { color: '#fff' },
  memberFilters: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 10 },
  memberFilter: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 11, paddingVertical: 7 },
  memberFilterActive: { backgroundColor: colors.forestSoft },
  memberFilterText: { color: colors.forest, fontSize: 12, fontWeight: '700' },
  form: { marginTop: 14, gap: 11 },
  inlineForm: { marginTop: 10, marginBottom: 10, gap: 11, backgroundColor: colors.surfaceMuted },
  head: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  formTitle: { fontSize: 18, fontWeight: '700', color: colors.text },
  field: { gap: 6 },
  input: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.sm, padding: 12, color: colors.text, backgroundColor: '#fff', minHeight: 44 },
  label: { color: colors.text, fontWeight: '700' },
  action: { color: colors.forest, fontWeight: '700' },
  assignees: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  assignee: { borderWidth: 1, borderColor: colors.border, borderRadius: radius.pill, paddingHorizontal: 12, paddingVertical: 8 },
  assigneeActive: { backgroundColor: colors.forest, borderColor: colors.forest },
  assigneeText: { color: colors.text, fontWeight: '600' },
  save: { minHeight: 46, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.forest, borderRadius: radius.sm },
  white: { color: '#fff', fontWeight: '700' },
  delete: { alignItems: 'center', padding: 7 },
  deleteText: { color: '#A33', fontWeight: '700' },
  message: { gap: 7 },
  error: { color: '#A33' },
  loading: { minHeight: 180, alignItems: 'center', justifyContent: 'center', gap: 8 },
  row: { minHeight: 70, flexDirection: 'row', alignItems: 'center', gap: 12 },
  sep: { borderBottomWidth: 1, borderBottomColor: colors.border },
  title: { color: colors.text, fontWeight: '700', fontSize: 15 },
  done: { textDecorationLine: 'line-through', color: colors.muted },
  meta: { color: colors.muted, fontSize: 12, marginTop: 3 },
});
