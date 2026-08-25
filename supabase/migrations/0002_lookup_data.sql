-- Phase 2: Lookup data
-- subjects, batches, payment_rates — CRUD is admin-only, read is any authenticated user.

-- ===== LOOKUP: SUBJECTS =====
create table subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true
);

-- ===== LOOKUP: BATCHES =====
create table batches (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  branch_id uuid references branches(id),
  is_active boolean not null default true
);

-- ===== RATES (versioned, never mutate historic rates) =====
create table payment_rates (
  id uuid primary key default gen_random_uuid(),
  module text not null check (module in ('paper_checker','supervisor','open_day')),
  branch_id uuid references branches(id),        -- nullable = applies to all branches
  subject_id uuid references subjects(id),        -- nullable = applies to all subjects
  per_paper_price numeric(10,2),
  answer_key_price numeric(10,2),
  rate_config jsonb,                               -- flexible: supervisor/open-day rate rules
  effective_date date not null,
  created_by uuid references profiles(id),
  created_at timestamptz not null default now()
);

alter table subjects enable row level security;
alter table batches enable row level security;
alter table payment_rates enable row level security;

-- ===== subjects policies =====
create policy "subjects: any authenticated user can read"
  on subjects for select
  to authenticated
  using (true);

create policy "subjects: admin can insert"
  on subjects for insert
  to authenticated
  with check (private.is_admin());

create policy "subjects: admin can update"
  on subjects for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- No delete policy: subjects are soft-deleted via is_active (they're
-- referenced by records once Phase 3+ modules exist).

-- ===== batches policies =====
create policy "batches: any authenticated user can read"
  on batches for select
  to authenticated
  using (true);

create policy "batches: admin can insert"
  on batches for insert
  to authenticated
  with check (private.is_admin());

create policy "batches: admin can update"
  on batches for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- ===== payment_rates policies =====
-- Rates are append-only: to change a rate, insert a new row with a later
-- effective_date rather than editing history. So: insert + select only,
-- no update/delete policy at all.
create policy "payment_rates: any authenticated user can read"
  on payment_rates for select
  to authenticated
  using (true);

create policy "payment_rates: admin can insert"
  on payment_rates for insert
  to authenticated
  with check (private.is_admin() and created_by = auth.uid());
