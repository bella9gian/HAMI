export type Member = { id: string; name: string; initials: string; role: string };
export type Assignment = { memberId: string };
export type CalendarEvent = { id: string; title: string; start: string; end?: string; location?: string; memberIds: string[]; color: string };
export type Task = { id: string; title: string; dueLabel: string; completed: boolean; memberIds: string[] };
export type Chore = { id: string; title: string; cadence: string; completed: boolean; memberIds: string[] };
export type ModuleItem = { title: string; subtitle: string; icon: string; route: string; tint: string };
