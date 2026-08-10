# HAMI v0.1

**Our Life · Our Home · Our Story**

A private Chan–Siagian family app built as a universal Expo/React Native + TypeScript project, with Supabase as the intended backend.

## Included now

- HAMI visual system and responsive screen shell
- Bottom navigation: Today, Calendar, To-Do, Chores, More
- Assignable mock data for Calendar, To-Do and Chores
- More modules: Trips, Recipes, Photos, Habits, Supplements, Skincare, Makeup, Household
- Supabase client placeholder (`lib/supabase.ts`)
- Initial Postgres/RLS schema draft (`supabase/001_schema.sql`)

## Run locally

The source targets current Expo. The safest bootstrap is to install dependencies with Expo's current tooling:

```bash
npm install
npx expo install --fix
npx expo start
```

Then use Expo Go on iPhone or press `w` for web.

> `package.json` deliberately uses `latest` for several Expo-managed packages because Expo's compatibility matrix changes by SDK. `npx expo install --fix` resolves versions compatible with your installed SDK.

## Supabase

Copy `.env.example` to `.env` and add your **Project URL** and **publishable/anon key**. Do **not** put the Supabase service-role key in a mobile or web client.

The UI currently uses mock data so HAMI can be designed and tested before touching your live database.

## Next build milestone

1. Family sign-in / household creation
2. Real family profiles and avatar picker
3. Calendar CRUD + assignments
4. To-Do CRUD + assignments
5. Chore recurrence + assignments + completion history
6. Trip model + assignable trip tasks
7. Then recipes/photos/habits/supplements/skincare/makeup/household
