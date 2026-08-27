-- Phase 4a: Supervisor module
-- Same shape as paper_checker_records (0003), minus the answer-key split:
-- one flat rate snapshot, multiplied by student_count.

create table supervisor_records (
  id uuid primary key default gen_random_uuid(),
  work_date date not null,
  branch_id uuid references branches(id) not null,
  batch_id uuid references batches(id) not null,
  supervisor_id uuid references profiles(id) not null,
  subject_id uuid references subjects(id) not null,
  duty_description text not null,
  student_count int not null check (student_count >= 0),
  rate numeric(10,2) not null,   -- snapshot from payment_rates.rate_config->>'rate'
  total_amount numeric(10,2) generated always as (student_count * rate) stored,
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
  constraint chk_supervisor_rejection_reason check (confirmation_status <> 'rejected' or rejection_reason is not null)
);

alter table supervisor_records enable row level security;

create trigger trg_supervisor_records_updated_at
  before update on supervisor_records
  for each row execute function private.set_updated_at();

-- Same defense-in-depth shape as private.enforce_paper_checker_transition(),
-- adapted to this table's columns.
create or replace function private.enforce_supervisor_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.confirmed_by is not null and new.confirmed_by = new.supervisor_id then
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

  if not private.is_admin() then
    if new.student_count is distinct from old.student_count
      or new.rate is distinct from old.rate
      or new.duty_description is distinct from old.duty_description
      or new.work_date is distinct from old.work_date
      or new.batch_id is distinct from old.batch_id
      or new.branch_id is distinct from old.branch_id
      or new.subject_id is distinct from old.subject_id
      or new.supervisor_id is distinct from old.supervisor_id
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

create trigger trg_supervisor_transition
  before update on supervisor_records
  for each row execute function private.enforce_supervisor_transition();

-- ===== supervisor_records policies =====
create policy "supervisor_records: submitter reads own"
  on supervisor_records for select
  to authenticated
  using (supervisor_id = auth.uid());

create policy "supervisor_records: staff reads own branch"
  on supervisor_records for select
  to authenticated
  using (private.is_staff_for_branch(branch_id));

create policy "supervisor_records: admin reads all"
  on supervisor_records for select
  to authenticated
  using (private.is_admin());

create policy "supervisor_records: supervisor submits own"
  on supervisor_records for insert
  to authenticated
  with check (
    supervisor_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'supervisor' and is_active
    )
  );

create policy "supervisor_records: staff/admin confirm or reject"
  on supervisor_records for update
  to authenticated
  using (
    confirmation_status = 'pending'
    and supervisor_id <> auth.uid()
    and (private.is_staff_for_branch(branch_id) or private.is_admin())
  )
  with check (
    confirmed_by = auth.uid()
  );

create policy "supervisor_records: admin updates all"
  on supervisor_records for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());
