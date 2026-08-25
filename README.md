# Test Series Payment Portal

Next.js + Supabase app for a coaching institute's Test Series Department: record staff
work (Paper Checkers, Supervisors, Open Day staff), route it through a
confirm → approve → pay workflow, and generate PDF payment statements for Accounts.

Built phase by phase per the project spec (see `## Development Phases` below).
**Phase 1 (Foundation) is complete**; later phases are not built yet.

## Stack

Next.js (App Router) + React + TypeScript + Tailwind CSS + Supabase (Postgres, Auth, RLS).

## Setup

### 1. Create a Supabase project

Create a project at [supabase.com](https://supabase.com), then copy `.env.local.example` to
`.env.local` and fill in the values from **Project Settings → API**:

```bash
cp .env.local.example .env.local
```

### 2. Run the migration

Open the Supabase SQL editor (or use the Supabase CLI) and run every file in
`supabase/migrations/` in order. So far there is just:

- `0001_foundation.sql` — creates `profiles`, `branches` (minimal, full CRUD lands in
  Phase 2), RLS policies, and a trigger that auto-creates a `profiles` row (inactive,
  role `staff`) whenever a new `auth.users` row is created.

If you have the Supabase CLI linked to the project:

```bash
supabase db push
```

### 3. Create the first admin user

There's no public sign-up page (accounts are provisioned by an admin) so the very first
admin has to be created by hand:

1. In the Supabase dashboard, go to **Authentication → Users → Add user** and create a
   user with an email + password.
2. This fires the `on_auth_user_created` trigger, which inserts a matching `profiles` row
   with `role = 'staff'` and `is_active = false`.
3. In the SQL editor, promote that row to an active admin:

   ```sql
   update profiles
   set role = 'admin', is_active = true
   where id = '<the auth user id from step 1>';
   ```

Once an admin exists, the Admin → Staff page (Phase 2) will let admins manage everyone
else's role/branch/activation instead of needing SQL.

### 4. Install dependencies and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

## What's built (Phase 1 — Foundation)

- Next.js App Router scaffold with Tailwind CSS.
- Supabase client/server helpers (`lib/supabase/client.ts`, `lib/supabase/server.ts`),
  session-refreshing middleware (`middleware.ts`, `lib/supabase/middleware.ts`).
- `profiles` + `branches` tables with RLS enabled and policies (see
  `supabase/migrations/0001_foundation.sql`).
- Email/password login (`app/(auth)/login`), sign-out action, route protection
  (unauthenticated users are redirected to `/login`, authenticated users away from it).
- Role-aware sidebar shell (`components/layout/Sidebar.tsx`) and an authenticated layout
  (`app/(app)/layout.tsx`) that shows an "account pending activation" state for new,
  not-yet-activated users.
- A placeholder `/dashboard` page.

Sidebar links to modules from later phases (Paper Checker, Supervisor, Open Day,
Payment Management, Admin pages, Reports, Audit History) are present but those routes
don't exist yet — that's expected until their phases are built.

## Development Phases

1. **Foundation** — Next.js scaffold, Supabase project, auth (login/roles), profiles
   table, sidebar shell. ✅
2. **Lookup data** — branches, subjects, batches, payment_rates CRUD (admin only).
3. **Paper Checker module end-to-end** — form → submit → list → detail → staff
   confirm/reject → admin approve → mark paid.
4. **Supervisor + Open Day modules** — same pattern, reusing components.
5. **Dashboard** — cards + filters, wired to real aggregate queries.
6. **PDF reports** — filter-driven generation.
7. **Audit history** — triggers/logging wired into every mutating action, admin viewer
   page.
8. **RLS hardening + polish** — write and test every RLS policy, responsive pass, error
   states, empty states.
