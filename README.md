# Test Series Payment Portal

Internal tool for submitting, reviewing, and paying out test-series staff
(paper checkers, supervisors, open-day staff). See [SPEC.md](./SPEC.md) for
the full data model, roles, and workflow.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres + Auth + Row Level Security)

## Setup

1. **Create a Supabase project** at [supabase.com](https://supabase.com) (the
   free tier is enough to start).
2. Copy `.env.example` to `.env.local` and fill in the values from
   *Project Settings → API* in the Supabase dashboard:

   ```bash
   cp .env.example .env.local
   ```

3. **Run the schema migration.** In the Supabase dashboard, open the SQL
   Editor and run the contents of `supabase/migrations/0001_init.sql` (or,
   if you have the Supabase CLI linked to the project: `supabase db push`).
4. **Install dependencies and start the dev server:**

   ```bash
   npm install
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

5. **Create your first user** via the Sign up page, then promote it to
   `admin` — run this once in the Supabase SQL Editor:

   ```sql
   update profiles set role = 'admin' where id =
     (select id from auth.users where email = 'you@example.com');
   ```

## Project status

Stage 1 (project + Supabase wiring) and Stage 2 (database schema) are in
place: auth (login/signup/logout), role-based dashboard shell, and the full
schema/RLS policies for `profiles`, `payment_rates`, the 3 record modules,
and `audit_log`.

Not yet built: the record submission forms, the confirm/approve/pay
workflow UI, payment-rate management UI, and the filterable dashboard/PDF
reports (Stages 4–6 in SPEC.md).

## Deploy

- App: [Vercel](https://vercel.com) — set the same env vars from
  `.env.example` in the Vercel project settings.
- Database: stays on Supabase (already hosted).
