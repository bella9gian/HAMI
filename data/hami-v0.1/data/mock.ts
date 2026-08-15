import { CalendarEvent, Chore, Member, ModuleItem, Task } from '@/types';

export const members: Member[] = [
  { id: 'bella', name: 'Bella', initials: 'B', role: 'Admin' },
  { id: 'mike', name: 'Mike', initials: 'M', role: 'Member' },
  { id: 'koa', name: 'Koa', initials: 'K', role: 'Member' },
  { id: 'all', name: 'Everyone', initials: '♥', role: 'Group' },
];

export const todayEvents: CalendarEvent[] = [
  { id: 'e1', title: 'Koa pediatrician', start: '9:30 AM', end: '10:15 AM', location: 'Dr. Chan Office', memberIds: ['bella','koa'], color: '#D98D62' },
  { id: 'e2', title: 'Pilates', start: '4:30 PM', end: '5:30 PM', location: 'Claremont Club Pilates', memberIds: ['bella'], color: '#8BAEBB' },
  { id: 'e3', title: 'Family dinner', start: '6:30 PM', location: 'Home', memberIds: ['all'], color: '#94A783' },
];

export const tasks: Task[] = [
  { id: 't1', title: 'Grocery shopping', dueLabel: 'Today', completed: false, memberIds: ['mike'] },
  { id: 't2', title: 'Review travel reservations', dueLabel: 'Today', completed: false, memberIds: ['bella'] },
  { id: 't3', title: 'Call Papa', dueLabel: 'Today', completed: true, memberIds: ['bella'] },
  { id: 't4', title: 'Book weekend stay', dueLabel: 'Tomorrow', completed: false, memberIds: ['bella','mike'] },
];

export const chores: Chore[] = [
  { id: 'c1', title: 'Kitchen', cadence: 'Daily', completed: true, memberIds: ['mike'] },
  { id: 'c2', title: 'Laundry', cadence: 'Mon · Thu', completed: true, memberIds: ['bella'] },
  { id: 'c3', title: 'Bathrooms', cadence: 'Saturday', completed: false, memberIds: ['mike'] },
  { id: 'c4', title: 'Living room', cadence: 'Daily', completed: false, memberIds: ['koa'] },
  { id: 'c5', title: 'Trash & recycling', cadence: 'Tuesday', completed: false, memberIds: ['all'] },
];

export const modules: ModuleItem[] = [
  { title: 'Trips', subtitle: 'Plans, itineraries, bookings & notes', icon: 'airplane-outline', route: '/more/trips', tint: '#DCE8EA' },
  { title: 'Menu', subtitle: 'Plan meals from your recipes', icon: 'fast-food-outline', route: '/more/menu', tint: '#ECE8C8' },
  { title: 'Recipes', subtitle: 'Family favorites & meal ideas', icon: 'restaurant-outline', route: '/more/recipes', tint: '#F0DFD1' },
  { title: 'Photos', subtitle: 'Memories we treasure', icon: 'images-outline', route: '/more/photos', tint: '#E7DFD5' },
  { title: 'Habits', subtitle: 'Daily rhythms & streaks', icon: 'leaf-outline', route: '/more/habits', tint: '#DFE8D4' },
  { title: 'Supplements', subtitle: 'Vitamins & supplement tracker', icon: 'medical-outline', route: '/more/supplements', tint: '#F0E0C7' },
  { title: 'Skincare', subtitle: 'Routines & products', icon: 'water-outline', route: '/more/skincare', tint: '#E8DDEA' },
  { title: 'Makeup', subtitle: 'Favorites & products', icon: 'color-palette-outline', route: '/more/makeup', tint: '#F0D7C9' },
  { title: 'Shopping', subtitle: 'Shared grocery & shopping list', icon: 'cart-outline', route: '/more/shopping', tint: '#DCE8EA' },
  { title: 'Household', subtitle: 'Family members & relationships', icon: 'home-outline', route: '/more/household', tint: '#E6DED2' },
];
