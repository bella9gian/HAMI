# HAMI v0.1

**Our Life · Our Home · Our Story**

HAMI is a private Chan–Siagian family app built with Expo, React Native, TypeScript, and Supabase. It targets iPhone and web through Expo Router.

## Current state

- HAMI visual system, responsive screen shell, and bottom navigation: Today, Calendar, To-Do, Chores, and More.
- Supabase Auth is live. The Today screen supports sign-in and sign-out with the configured Supabase project.
- Today loads the authenticated user's `family_members` record and active members of their household from Supabase.
- The Today calendar, Calendar, To-Do, and Chores content remains mock data while their live queries and CRUD flows are built.
- Trips, Recipes, Photos, Habits, Supplements, Skincare, Makeup, and Household are navigation-ready placeholders.
- `supabase/001_schema.sql` records the current family-member-based database model, RLS policies, and `updated_at` triggers. It is a reference migration only; do not run it against an existing project without reviewing it first.

## Run locally

```bash
npm install
npm run typecheck
npx expo start
```

Use Expo Go on iPhone or press `w` for web.

## Supabase configuration

Copy `.env.example` to `.env` and set the Project URL plus publishable/anon key. The `.env` file is gitignored. Never place a Supabase service-role key in a mobile or web client.

## Next build milestone

1. Live calendar queries, CRUD, and assignments
2. Live To-Do queries, CRUD, and assignments
3. Chore recurrence, assignments, and completion history
4. Trip views and assignable trip tasks
5. Recipes, photos, habits, supplements, skincare, makeup, and household
