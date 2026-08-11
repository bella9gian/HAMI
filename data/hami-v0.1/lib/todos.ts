import { FamilyMember } from '@/lib/calendar';
import { supabase } from '@/lib/supabase';

type Row = { id:string; title:string; due_at:string|null; completed:boolean; completed_at:string|null; todo_assignees:Array<{ family_member_id:string; family_members:Array<Pick<FamilyMember,'id'|'display_name'|'first_name'>>|null }>|null };
export type Todo = { id:string; title:string; dueAt:string|null; completed:boolean; completedAt:string|null; assignees:Array<Pick<FamilyMember,'id'|'display_name'|'first_name'>> };
const select = `id, title, due_at, completed, completed_at, todo_assignees (family_member_id, family_members (id, display_name, first_name))`;
const listeners = new Set<()=>void>();
export function subscribeToTodoChanges(listener:()=>void) { listeners.add(listener); return ()=>{ listeners.delete(listener); }; }
const notify = ()=>listeners.forEach(listener=>listener());
const map = (row:Row):Todo => ({ id:row.id, title:row.title, dueAt:row.due_at, completed:row.completed, completedAt:row.completed_at, assignees:(row.todo_assignees??[]).flatMap(a=>a.family_members??[]) });
export async function loadTodos() { const {data,error}=await supabase.from('todos').select(select).order('due_at',{ascending:true,nullsFirst:false}).order('created_at'); if(error) throw error; return ((data??[]) as unknown as Row[]).map(map); }
export async function createTodo(v:{householdId:string;createdBy:string;title:string;dueAt:string|null;assigneeIds:string[]}) { const {data,error}=await supabase.from('todos').insert({household_id:v.householdId,created_by:v.createdBy,title:v.title.trim(),due_at:v.dueAt,completed:false}).select('id').single(); if(error) throw error; if(v.assigneeIds.length){const {error:e}=await supabase.from('todo_assignees').insert(v.assigneeIds.map(family_member_id=>({todo_id:data.id,family_member_id})));if(e){await supabase.from('todos').delete().eq('id',data.id);throw e;}} notify(); }
export async function updateTodo(id:string,v:{title:string;dueAt:string|null;assigneeIds:string[]}) { const {error}=await supabase.from('todos').update({title:v.title.trim(),due_at:v.dueAt}).eq('id',id);if(error)throw error;const {error:e}=await supabase.from('todo_assignees').delete().eq('todo_id',id);if(e)throw e;if(v.assigneeIds.length){const {error:a}=await supabase.from('todo_assignees').insert(v.assigneeIds.map(family_member_id=>({todo_id:id,family_member_id})));if(a)throw a;}notify(); }
export async function setTodoCompleted(id:string,completed:boolean){const {error}=await supabase.from('todos').update({completed,completed_at:completed?new Date().toISOString():null}).eq('id',id);if(error)throw error;notify();}
export async function deleteTodo(id:string){const {error}=await supabase.from('todos').delete().eq('id',id);if(error)throw error;notify();}
export function dueInputToIso(value:string){if(!value.trim())return null;const date=new Date(`${value.trim()}T12:00:00`);if(Number.isNaN(date.valueOf()))throw new Error('Use YYYY-MM-DD for the due date.');return date.toISOString();}
export function dueDateKey(value:string|null){if(!value)return '';const date=new Date(value),offset=date.getTimezoneOffset()*60000;return new Date(date.getTime()-offset).toISOString().slice(0,10);}
