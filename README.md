# Test Series Payment Portal

Next.js + Supabase app for a coaching institute's Test Series Department: record staff
work (Paper Checkers, Supervisors, Open Day staff), route it through a
confirm → approve → pay workflow, and generate PDF payment statements for Accounts.

Built phase by phase per the project spec (see `## Development Phases` below).
**Phases 1 (Foundation), 2 (Lookup data), and 3 (Paper Checker) are complete**; later
phases are not built yet.

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
`supabase/migrations/` in order:

- `0001_foundation.sql` — creates `profiles`, a minimal `branches` table, RLS policies,
  and a trigger that auto-creates a `profiles` row (inactive, role `staff`) whenever a
  new `auth.users` row is created.
- `0002_lookup_data.sql` — creates `subjects`, `batches`, and `payment_rates` (append-only:
  no update/delete policy — a rate change is a new row with a later `effective_date`),
  all read-for-authenticated / write-for-admin-only.
- `0003_paper_checker.sql` — creates `audit_logs` (insert only via the `log_audit()`
  security-definer function — no direct insert policy — select for admin only) and
  `paper_checker_records`, with RLS for the confirm → approve → pay workflow plus a
  `BEFORE UPDATE` trigger that enforces the hard rules (no self-confirmation, only an
  admin can move `payment_status` to `approved`/`paid`, a non-admin update can't touch
  any field besides the confirm/reject ones) as defense in depth beyond RLS.

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

Once an admin exists, the Admin → Staff page lets that admin manage everyone else's
role/branch/activation instead of needing SQL — including inviting new users by email,
which requires `SUPABASE_SERVICE_ROLE_KEY` to be set (Project Settings → API → service_role
secret). Keep that key server-only; never prefix it with `NEXT_PUBLIC_`.

### 4. Install dependencies and run

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you'll be redirected to `/login`.

### 5. Try the Paper Checker workflow

To exercise the full confirm → approve → pay flow you need, as admin:

1. A branch, a batch in that branch, and a subject (Admin → Branches/Batches/Subjects).
2. A `paper_checker` module payment rate for that subject (Admin → Payment Rates).
3. Two more invited users (Admin → Staff): one set to role `paper_checker` with that
   branch assigned, one set to role `staff` with the same branch assigned.

Then: the Paper Checker submits a record at `/paper-checker/new`, the Staff user
confirms or rejects it from `/paper-checker/[id]`, and you (Admin) approve it and mark
it paid from the same page.

## What's built

**Phase 1 — Foundation**

- Next.js App Router scaffold with Tailwind CSS.
- Supabase client/server helpers (`lib/supabase/client.ts`, `lib/supabase/server.ts`),
  session-refreshing proxy middleware (`proxy.ts`, `lib/supabase/middleware.ts`).
- `profiles` + `branches` tables with RLS enabled and policies (see
  `supabase/migrations/0001_foundation.sql`).
- Email/password login (`app/(auth)/login`), sign-out action, route protection
  (unauthenticated users are redirected to `/login`, authenticated users away from it).
- Role-aware sidebar shell (`components/layout/Sidebar.tsx`) and an authenticated layout
  (`app/(app)/layout.tsx`) that shows an "account pending activation" state for new,
  not-yet-activated users.
- A placeholder `/dashboard` page.

**Phase 2 — Lookup data**

- `subjects`, `batches`, `payment_rates` tables with RLS (see
  `supabase/migrations/0002_lookup_data.sql`).
- Admin → Branches / Subjects (`app/(app)/admin/branches`, `.../subjects`): add, rename,
  activate/deactivate.
- Admin → Batches (`app/(app)/admin/batches`): same, plus a required branch assignment.
- Admin → Payment Rates (`app/(app)/admin/payment-rates`): add a new rate (module,
  optional branch/subject scoping, effective date). Rates are append-only by design —
  there's no edit or delete, only new rows with later effective dates — so historic
  records stay accurate to the rate that applied when they were submitted.
- Admin → Staff (`app/(app)/admin/staff`): invite new users by email (via a server-only
  service-role client, `lib/supabase/admin.ts`) and edit everyone's role/branch/active
  status — this replaces the manual SQL bootstrap step for every user after the first
  admin.
- `requireAdmin()` guard (`lib/auth.ts`) redirects non-admins away from every admin page;
  RLS is still the real enforcement layer underneath.

**Phase 3 — Paper Checker module**

- `audit_logs` + `paper_checker_records` tables, RLS, and the transition-enforcing
  trigger (see `supabase/migrations/0003_paper_checker.sql`).
- `lib/calculations.ts` — the pure total functions from the spec, used for the form's
  live preview. The database's generated `total_amount` column is still the only value
  ever trusted; nothing client-computed is sent to the server.
- `lib/payment-rates.ts` — `resolvePaymentRate()` picks the payment rate that applies to
  a branch/subject/date: an exact branch+subject match beats a wildcard (`branch_id`/
  `subject_id` null = applies broadly), and among equally specific matches the most
  recent `effective_date` wins.
- `lib/audit.ts` — `logAudit()`, the single helper every mutating action calls to write
  to `audit_logs` via the `log_audit()` RPC, so it can't be forgotten per-action.
- `lib/paper-checker/actions.ts` — submit, confirm, reject, approve, mark paid, and
  admin edit. Submission snapshots `per_paper_price`/`answer_key_price` from the
  resolved rate server-side (never from the client); editing a record after it's been
  marked paid is blocked.
- Admin → Branches/Subjects/Batches. Paper Checker → `/paper-checker` (role-scoped list:
  a Paper Checker sees their own submissions, Staff see their branch's, Admin see all),
  `/paper-checker/new` (submission form with a live total preview), and
  `/paper-checker/[id]` (detail page with confirm/reject for Staff/Admin,
  approve/mark-paid for Admin, and an admin-only edit form).

The spec's cross-module `/confirmation-queue` and `/payment-management` pages are
deferred to Phase 4 — with only one module built so far there's nothing yet for them to
aggregate across; confirm/reject/approve/paid all work today from the Paper Checker
list and detail pages.

Sidebar links to modules from later phases (Supervisor, Open Day, Payment Management,
Reports, Audit History) are present but those routes don't exist yet — that's expected
until their phases are built.

## Development Phases

1. **Foundation** — Next.js scaffold, Supabase project, auth (login/roles), profiles
   table, sidebar shell. ✅
2. **Lookup data** — branches, subjects, batches, payment_rates CRUD (admin only). ✅
3. **Paper Checker module end-to-end** — form → submit → list → detail → staff
   confirm/reject → admin approve → mark paid. ✅
4. **Supervisor + Open Day modules** — same pattern, reusing components.
5. **Dashboard** — cards + filters, wired to real aggregate queries.
6. **PDF reports** — filter-driven generation.
7. **Audit history** — triggers/logging wired into every mutating action, admin viewer
   page.
8. **RLS hardening + polish** — write and test every RLS policy, responsive pass, error
   states, empty states.
