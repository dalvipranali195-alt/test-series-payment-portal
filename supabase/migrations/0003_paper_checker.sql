-- Phase 3: Paper Checker module end-to-end
-- audit_logs (shared by every module from here on) + paper_checker_records.

-- ===== AUDIT LOG =====
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  field_changed text,
  previous_value text,
  new_value text,
  action text not null,   -- submitted / confirmed / rejected / edited / approved / paid
  changed_by uuid references profiles(id),
  reason text,
  created_at timestamptz not null default now()
);

alter table audit_logs enable row level security;

-- select: admin only. No insert/update/delete policy at all for the
-- authenticated role — every write goes through the log_audit() function
-- below (security definer), per spec section 5.
create policy "audit_logs: admin can read"
  on audit_logs for select
  to authenticated
  using (private.is_admin());

create or replace function public.log_audit(
  p_table_name text,
  p_record_id uuid,
  p_action text,
  p_field_changed text default null,
  p_previous_value text default null,
  p_new_value text default null,
  p_reason text default null
) returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into audit_logs (table_name, record_id, field_changed, previous_value, new_value, action, changed_by, reason)
  values (p_table_name, p_record_id, p_field_changed, p_previous_value, p_new_value, p_action, auth.uid(), p_reason);
end;
$$;

grant execute on function public.log_audit to authenticated;

-- ===== PAPER CHECKER RECORDS =====
create table paper_checker_records (
  id uuid primary key default gen_random_uuid(),
  test_date date not null,
  branch_id uuid references branches(id) not null,
  batch_id uuid references batches(id) not null,
  paper_checker_id uuid references profiles(id) not null,
  subject_id uuid references subjects(id) not null,
  test_name text not null,
  student_count int not null check (student_count >= 0),
  test_marks int,
  per_paper_price numeric(10,2) not null,   -- snapshot from payment_rates at submit time
  answer_key_price numeric(10,2) not null,  -- snapshot
  total_amount numeric(10,2) generated always as
    (student_count * per_paper_price + answer_key_price) stored,
  rate_id uuid references payment_rates(id),
  confirmation_status text not null default 'pending'
    check (confirmation_status in ('pending','confirmed','rejected')),
  confirmed_by uuid references profiles(id),
  confirmed_at timestamptz,
  rejection_reason text,
  payment_status text not null default 'pending'
    check (payment_status in ('pending','pending_admin_approval','approved','paid')),
  approved_by uuid references profiles(id),
  approved_at timestamptz,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint chk_rejection_reason check (confirmation_status <> 'rejected' or rejection_reason is not null)
);

alter table paper_checker_records enable row level security;

create or replace function private.is_staff_for_branch(target_branch uuid)
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'staff' and is_active and branch_id = target_branch
  );
$$;

-- keep updated_at current on every UPDATE
create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger trg_paper_checker_records_updated_at
  before update on paper_checker_records
  for each row execute function private.set_updated_at();

-- Defense in depth beyond RLS: the hard rules from the spec's workflow
-- section, enforced regardless of which policy let the UPDATE through.
create or replace function private.enforce_paper_checker_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.confirmed_by is not null and new.confirmed_by = new.paper_checker_id then
    raise exception 'A submitter cannot confirm or reject their own record.';
  end if;

  if new.payment_status in ('approved','paid')
     and old.payment_status is distinct from new.payment_status
     and not private.is_admin() then
    raise exception 'Only an admin can approve or mark a record as paid.';
  end if;

  if new.confirmation_status <> 'confirmed' and new.payment_status <> 'pending' then
    raise exception 'A record must be confirmed before it can be approved or paid.';
  end if;

  -- Non-admins only ever reach this trigger via the confirm/reject policy:
  -- pin down every other column so that path can't smuggle edits to the
  -- submitted amounts or record details alongside a confirm/reject.
  if not private.is_admin() then
    if new.student_count is distinct from old.student_count
      or new.per_paper_price is distinct from old.per_paper_price
      or new.answer_key_price is distinct from old.answer_key_price
      or new.test_marks is distinct from old.test_marks
      or new.test_name is distinct from old.test_name
      or new.test_date is distinct from old.test_date
      or new.batch_id is distinct from old.batch_id
      or new.branch_id is distinct from old.branch_id
      or new.subject_id is distinct from old.subject_id
      or new.paper_checker_id is distinct from old.paper_checker_id
      or new.rate_id is distinct from old.rate_id
      or new.approved_by is distinct from old.approved_by
      or new.approved_at is distinct from old.approved_at
      or new.paid_at is distinct from old.paid_at
    then
      raise exception 'Only an admin can edit record fields.';
    end if;
  end if;

  return new;
end;
$$;

create trigger trg_paper_checker_transition
  before update on paper_checker_records
  for each row execute function private.enforce_paper_checker_transition();

-- ===== paper_checker_records policies =====
create policy "paper_checker_records: submitter reads own"
  on paper_checker_records for select
  to authenticated
  using (paper_checker_id = auth.uid());

create policy "paper_checker_records: staff reads own branch"
  on paper_checker_records for select
  to authenticated
  using (private.is_staff_for_branch(branch_id));

create policy "paper_checker_records: admin reads all"
  on paper_checker_records for select
  to authenticated
  using (private.is_admin());

create policy "paper_checker_records: paper_checker submits own"
  on paper_checker_records for insert
  to authenticated
  with check (
    paper_checker_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'paper_checker' and is_active
    )
  );

-- Confirm/reject: staff (matching branch) or admin, only while still
-- pending, and never the record's own submitter.
create policy "paper_checker_records: staff/admin confirm or reject"
  on paper_checker_records for update
  to authenticated
  using (
    confirmation_status = 'pending'
    and paper_checker_id <> auth.uid()
    and (private.is_staff_for_branch(branch_id) or private.is_admin())
  )
  with check (
    confirmed_by = auth.uid()
  );

-- Admin can edit/approve/mark paid on any record.
create policy "paper_checker_records: admin updates all"
  on paper_checker_records for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());
