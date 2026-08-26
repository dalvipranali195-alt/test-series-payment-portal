# Test Series Payment Portal — Spec

Internal tool for managing and approving payments to paper checkers,
supervisors, and open-day staff for a test-series/exam business.

## 1. Roles

| Role | Can do |
|---|---|
| **Admin** | Full access. Manages users/roles, payment rates, gives final approval on records, sees all reports/audit log. |
| **Paper Checker** | Submits their own paper-checking records. Views their own submission history and payment status. |
| **Supervisor** | Submits their own supervisor duty records. Views their own submission history and payment status. |
| **Staff / Coordinator** | Front-line reviewer. Confirms or rejects records submitted by paper checkers/supervisors/open-day staff (first-line check before admin sees it). Can also submit open-day records on behalf of staff working an open day. |
| **Accounts** | Sees records that are admin-approved. Marks them as paid and records payment reference/date. |

Roles are stored per-user and enforced both in the UI and via Postgres Row
Level Security (RLS), so a role can only read/write what it's permitted to
regardless of what the client sends.

## 2. Data model

### `profiles`
One row per authenticated user (mirrors `auth.users`).

- `id uuid` (PK, = `auth.users.id`)
- `full_name text`
- `role user_role` — `admin | paper_checker | supervisor | staff_coordinator | accounts`
- `branch text`
- `phone text`
- `is_active boolean`
- `created_at timestamptz`

### `payment_rates`
Versioned rate table. Rates are never edited in place — a rate change
inserts a new row and closes out the old one (`effective_to` set). Records
lock in whichever rate was active *at submission time*, so a later rate
change never retroactively changes an existing record's total.

- `id uuid` (PK)
- `module module_type` — `paper_checker | supervisor | open_day`
- `rate_key text` — e.g. `per_paper_price`, `answer_key_price`, `per_day_rate`
- `amount numeric(10,2)`
- `branch text` (nullable — null means "applies to all branches")
- `effective_from timestamptz`
- `effective_to timestamptz` (nullable = currently active)
- `created_by uuid` → `profiles.id`
- `created_at timestamptz`

### `paper_checker_records`
- `id uuid` (PK)
- `examiner_id uuid` → `profiles.id`
- `branch text`, `subject text`, `batch text`, `exam_date date`
- `student_present_count int`
- `per_paper_price numeric(10,2)` — locked from `payment_rates` at submission
- `answer_key_price numeric(10,2)` — locked from `payment_rates` at submission
- `total_amount numeric(10,2)` — generated: `student_present_count * per_paper_price + answer_key_price`
- `status record_status`
- `rejection_reason text`
- `submitted_by uuid`, `submitted_at timestamptz`
- `confirmed_by uuid`, `confirmed_at timestamptz`
- `approved_by uuid`, `approved_at timestamptz`
- `paid_by uuid`, `paid_at timestamptz`, `payment_reference text`
- `created_at`, `updated_at timestamptz`

### `supervisor_records`
Same workflow/audit columns as above, plus:
- `days_worked int`, `per_day_rate numeric(10,2)` (locked), `total_amount numeric(10,2)` (generated)
- `branch text`, `batch text`, `exam_date date`

### `open_day_records`
Same workflow/audit columns as above, plus:
- `event_date date`, `hours_worked numeric(5,2)`, `hourly_rate numeric(10,2)` (locked), `total_amount numeric(10,2)` (generated)
- `branch text`

### `audit_log`
Append-only. A trigger writes one row on every status change and on every
rate change.
- `id uuid` (PK)
- `table_name text`, `record_id uuid`
- `action text` — e.g. `submitted`, `confirmed`, `rejected`, `approved`, `paid`, `rate_created`, `rate_closed`
- `old_value jsonb`, `new_value jsonb`
- `changed_by uuid`, `changed_at timestamptz`
- `reason text` (nullable — required for rejections)

## 3. Workflow (per record)

```
submitted (by paper_checker / supervisor / staff_coordinator)
   -> confirmation_pending
staff_coordinator confirms  -> pending_admin_approval
staff_coordinator rejects   -> rejected (with reason, visible to submitter)
admin approves               -> approved
admin rejects                -> rejected (with reason)
accounts marks paid          -> paid (with payment_reference, paid_at)
```

Every transition is written to `audit_log` (who, when, old status, new
status, reason if rejected).

## 4. Dashboard & reports

Filters: date range, month, branch, module (paper checker / supervisor /
open day), examiner/staff, subject, batch, confirmation status, payment
status.

Output: on-screen table + PDF export of the filtered result set.

## 5. Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase: Postgres + Auth + RLS for the roles above
- Deploy target: Vercel (app) + Supabase (hosted DB/auth)

## 6. Build stages

1. Project setup (this repo) + Supabase wiring
2. Database schema + RLS (`supabase/migrations/`)
3. Auth & role-gated routing
4. The 3 record modules (forms + auto-calculated totals)
5. Workflow engine (status transitions + audit log)
6. Dashboard, filters, PDF export
7. Testing & deploy
