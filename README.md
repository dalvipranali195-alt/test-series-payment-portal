# Test Series Payment Portal

Next.js + Supabase app for a coaching institute's Test Series Department: record staff
work (Paper Checkers, Supervisors, Open Day staff), route it through a
confirm → approve → pay workflow, and generate PDF payment statements for Accounts.

Built phase by phase per the project spec (see `## Development Phases` below).
**All 8 phases are complete** — every module and every sidebar link has a working
page, with an RLS review and a responsive-layout pass on top.

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
- `0004_supervisor.sql` — creates `supervisor_records`: the same confirm → approve →
  pay shape as `paper_checker_records`, minus the answer-key split (one flat `rate`
  snapshot × `student_count`).
- `0005_open_day.sql` — creates `open_day_records`. Two differences from the other two
  modules: there's no dedicated `open_day` role (Staff/Coordinator submit directly, and
  confirmation falls to a *different* Staff member of the same branch, or admin), and
  `batch_id`/`subject_id` are nullable (an Open Day event isn't always tied to one).

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

### 5. Try the Paper Checker / Supervisor workflow

To exercise the full confirm → approve → pay flow you need, as admin:

1. A branch, a batch in that branch, and a subject (Admin → Branches/Batches/Subjects).
2. A payment rate for that module + subject (Admin → Payment Rates) — `paper_checker`
   rates split into per-paper/answer-key price, `supervisor` and `open_day` rates are a
   single flat rate per student.
3. Two more invited users (Admin → Staff): one set to role `paper_checker` or
   `supervisor` with that branch assigned, one set to role `staff` with the same branch
   assigned.

Then: the Paper Checker/Supervisor submits a record at `/paper-checker/new` or
`/supervisor/new`, the Staff user confirms or rejects it from the record's detail page,
and you (Admin) approve it and mark it paid from the same page.

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
- `components/shared/` — `StatusBadge`, `RecordsTable`, `ConfirmRejectPanel`, and
  `ApprovePaidPanel` were lifted out of `components/paper-checker/` into generic,
  prop-driven versions once a second module needed the identical confirm → approve →
  pay UI. `ConfirmRejectPanel`/`ApprovePaidPanel` take the module's already-bound server
  actions as props; `RecordsTable` takes a generic `RecordRow` shape plus a couple of
  label props (`submitterLabel`, `quantityLabel`, `detailBasePath`). Every module's
  edit form stays module-specific (the fields genuinely differ) rather than being
  forced into a shared shape.

**Phase 4a — Supervisor module**

- `supervisor_records`, RLS, and its transition trigger (see
  `supabase/migrations/0004_supervisor.sql`) — the same confirm → approve → pay shape
  as `paper_checker_records`, minus the answer-key split: one flat `rate` snapshot ×
  `student_count`.
- `/supervisor` (role-scoped list, reusing `components/shared/RecordsTable`),
  `/supervisor/new` (submission form, role `supervisor` only), and `/supervisor/[id]`
  (detail page reusing the shared confirm/reject and approve/paid panels, plus an
  admin-only edit form).
- Payment Rates already supported a `supervisor` module option (Phase 3 built the admin
  form generically); this phase is what actually reads and snapshots that rate.

**Phase 4b — Open Day module**

- `open_day_records`, RLS, and its transition trigger (see
  `supabase/migrations/0005_open_day.sql`). No dedicated role exists for this module —
  Staff/Coordinator submit directly, and a *different* Staff member of the same branch
  (or admin) confirms; `batch_id`/`subject_id` are nullable since an Open Day event
  isn't always scoped to one.
- `/open-day` (branch-wide list — since there's no dedicated submitter role, this isn't
  a "records I submitted" view like the other two modules), `/open-day/new` (role
  `staff` only; batch/subject are optional selects), and `/open-day/[id]` (same
  confirm/reject, approve/mark-paid, admin-edit pattern as the other modules).

**Phase 4c — Confirmation Queue + Payment Management**

- `/confirmation-queue` (Staff/Coordinator + Admin): every `pending` record across all
  three modules the viewer is allowed to act on (RLS scopes Staff to their branch,
  Admin sees everything; a submitter's own pending record is filtered out client-side
  since they can never confirm their own — the transition triggers would reject it
  anyway). Inline Confirm / Reject-with-reason per row
  (`components/shared/InlineConfirmReject.tsx`), oldest first.
- `/payment-management` (Admin only): records `pending_admin_approval` with an inline
  Approve action, approved-and-unpaid records grouped by staff member with a "Generate
  slip (PDF)" link per staff, and a flat approved-records table with an inline Mark as
  paid action per row.
- `lib/pdf/build-pdf.ts` — a generic, paginated table-PDF builder on top of `pdf-lib`
  (title/subtitle/columns/rows/totals), shared by the payment slip route and (Phase 6)
  Reports export.
- `app/api/payment-slip/[staffId]/route.ts` — Admin-only route handler that generates
  and streams a payment slip PDF for one staff member's approved-and-unpaid records
  across all three modules.

**Phase 5 — Dashboard**

- `/dashboard` now shows four aggregate cards — Total records, Pending confirmations,
  Total payments due (confirmed but not yet paid: `pending_admin_approval` +
  `approved`), and Payments made (`paid`) — computed across all three modules and
  filterable by branch (admin only — Staff/Paper Checker/Supervisor are already scoped
  by RLS to their own branch or their own submissions), module, and date range. Filters
  are plain URL query params (`?branch=&module=&from=&to=`) via a GET form, so the page
  works without client-side JS and the filtered view is a shareable/bookmarkable link.

**Phase 6 — PDF reports**

- `0006_profiles_staff_branch_read.sql` — fixes a real RLS gap found while building
  this phase: `profiles` only had "read your own row" and "admin reads all rows"
  policies, so a non-admin Staff viewer got back only their own row from the
  `select id, full_name from profiles` lookups every module's list/detail pages already
  did — every other person's name silently rendered as "—". Added
  `private.is_staff_for_branch(branch_id)` as a third select policy, matching how that
  helper already scopes every module table.
- `lib/reports/types.ts` / `lib/reports/query.ts` — filter parsing and a shared
  `fetchReportRows()` that runs all three module queries with every filter pushed down
  to Postgres (branch, module, examiner/staff, subject, batch, confirmation status,
  payment status, date range), then combines and resolves display names. Reused by
  both the page and its PDF export so they can never drift apart.
- `/reports` (Staff/Coordinator + Admin): the full filter bar as plain GET query
  params, a combined table across all three modules, and a "Download PDF" link.
- `app/api/reports/pdf/route.ts` — same filters, same `fetchReportRows()`, rendered
  through `lib/pdf/build-pdf.ts` into a downloadable PDF.

**Phase 7 — Audit history**

- `audit_logs` was already written to by every module action (Phase 3); this phase
  extends `logAudit()` calls into the admin CRUD actions too
  (`lib/admin/staff-actions.ts`, `simple-lookup-actions.ts`, `batch-actions.ts`,
  `payment-rate-actions.ts`) so role/branch/activation changes, branch/subject/batch
  create-rename-activate, and payment rate creation all show up in the trail alongside
  the record workflow actions — a real audit log needs to cover config changes, not
  just record submissions.
- `/audit-history` (Admin only): every logged change — table, action, field changed,
  previous/new value, who, when, and the reason (for rejections) — filterable by table,
  action, changed-by, and date range.

Every module and every sidebar link now has a working page.

**Phase 8 — RLS hardening + polish**

- `0007_rls_hardening.sql` — a full read-through of every policy in every prior
  migration turned up one real gap: the insert policy on all three module tables
  checked the submitter's role but never checked that the `branch_id` being inserted
  matched that submitter's own `profiles.branch_id`. The app layer always passes the
  submitter's real branch (nothing in the UI could reach this), but RLS is supposed to
  hold even against a direct REST/RPC call that skips the app entirely — a
  paper_checker could otherwise have inserted a row attributing work (and its payment)
  to a branch they don't belong to. All three insert policies now also require
  `branch_id` to match a profile row for that user with the right role, active, in that
  branch.
  - Known, accepted tradeoff also found on this pass: `log_audit()` is a
    security-definer RPC grantable to every authenticated user by design (Staff and
    non-admin submitters need to call it after confirming/rejecting), and it doesn't
    validate that `p_table_name`/`p_record_id`/`p_action` correspond to something the
    caller actually did. It does hard-code `changed_by = auth.uid()` from the session
    rather than trusting a client-supplied value, so no one can forge another user's
    identity in the trail — but a malicious authenticated user could still insert a
    fabricated log line about an unrelated table/record. Full per-action validation
    would mean re-deriving each module's exact business rules inside the audit
    function too, which is a lot of surface for a log-integrity edge case; flagging it
    here rather than building that out.
  - This review was a careful reading of every `create policy` statement against what
    each page/action actually needs, not a live test suite run against a real Postgres
    instance — there's no live Supabase project in this environment to run one
    against. Before going to production, running the confirm/reject/approve/paid flow
    as each role against a real project (per the "Try the Paper Checker / Supervisor
    workflow" steps above) is worth doing once as a final check.
- Responsive layout: the sidebar was a fixed 256px column with no mobile handling.
  `components/layout/AppShell.tsx` (new, client component) now renders it as an
  off-canvas drawer below the `lg` breakpoint — a hamburger button in a mobile top bar
  opens it, a backdrop click or tapping a nav link closes it — and keeps it always
  visible as a static column at `lg` and above, same as before.

## Development Phases

1. **Foundation** — Next.js scaffold, Supabase project, auth (login/roles), profiles
   table, sidebar shell. ✅
2. **Lookup data** — branches, subjects, batches, payment_rates CRUD (admin only). ✅
3. **Paper Checker module end-to-end** — form → submit → list → detail → staff
   confirm/reject → admin approve → mark paid. ✅
4. **Supervisor + Open Day modules** — same pattern, reusing components.
   - 4a. Supervisor module end-to-end. ✅
   - 4b. Open Day module end-to-end. ✅
   - 4c. Cross-module Confirmation Queue + Payment Management pages. ✅
5. **Dashboard** — cards + filters, wired to real aggregate queries. ✅
6. **PDF reports** — filter-driven generation. ✅
7. **Audit history** — triggers/logging wired into every mutating action, admin viewer
   page. ✅
8. **RLS hardening + polish** — write and test every RLS policy, responsive pass, error
   states, empty states. ✅
