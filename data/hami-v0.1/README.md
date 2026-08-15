# HAMI v0.1

**Our Life · Our Home · Our Story**

HAMI is a private Chan–Siagian family app built with Expo, React Native, TypeScript, and Supabase. It targets iPhone and web through Expo Router.

## Current state

- HAMI visual system, responsive screen shell, and bottom navigation: Today, Calendar, To-Do, Chores, and More.
- Supabase Auth is live. The Today screen supports sign-in and sign-out with the configured Supabase project.
- Today loads the authenticated user's `family_members` record from Supabase and greets them by name.
- The Today calendar, Calendar, To-Do, and Chores content remains mock data while their live queries and CRUD flows are built.
- More → Household is live: it lists household members and supports adding/editing a member with a relationship (backed by `lib/members.ts`).
- Trips, Recipes, Photos, Habits, Supplements, Skincare, and Makeup are navigation-ready placeholders.
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

## Deploying the web app

The web app is deployed to **Cloudflare Pages** using Cloudflare's built-in Git
integration (Workers & Pages → the Pages project → Settings → Builds &
deployments). Cloudflare builds and deploys automatically on every push to
`main`. Configure the project with:

| Setting | Value |
| --- | --- |
| Production branch | `main` |
| Root directory | `data/hami-v0.1` |
| Build command | `npx expo export --platform web` |
| Build output directory | `dist` |

**Environment variables** (Production, set in the Pages project settings):

| Name | Value |
| --- | --- |
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL (baked into the web build) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/publishable key |
| `NODE_VERSION` | `20` |

The custom domain (`hami.mikobe.app`) is attached to the Pages project in the
Cloudflare dashboard.

## Next build milestone

1. Live calendar queries, CRUD, and assignments
2. Live To-Do queries, CRUD, and assignments
3. Chore recurrence, assignments, and completion history
4. Trip views and assignable trip tasks
5. Recipes, photos, habits, supplements, skincare, makeup, and household
