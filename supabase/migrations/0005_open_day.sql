-- Phase 4b: Open Day module
-- Same confirm -> approve -> pay shape as supervisor_records, with two
-- differences reflecting how an Open Day event actually works:
--   1. There's no dedicated "open_day" role (the sidebar has only ever shown
--      this module to admin/staff — see components/layout/Sidebar.tsx). A
--      branch's Staff/Coordinator submits the record directly; confirmation
--      then falls to a *different* staff member of the same branch, or admin.
--   2. An Open Day event isn't always tied to one batch or one subject (it
--      can be a walk-in / open-to-all session), so batch_id and subject_id
--      are nullable here — unlike every other module's non-null FKs.

create table open_day_records (
  id uuid primary key default gen_random_uuid(),
  event_date date not null,
  branch_id uuid references branches(id) not null,
  batch_id uuid references batches(id),
  subject_id uuid references subjects(id),
  staff_id uuid references profiles(id) not null,
  event_name text not null,
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
  constraint chk_open_day_rejection_reason check (confirmation_status <> 'rejected' or rejection_reason is not null)
);

alter table open_day_records enable row level security;

create trigger trg_open_day_records_updated_at
  before update on open_day_records
  for each row execute function private.set_updated_at();

create or replace function private.enforce_open_day_transition()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.confirmed_by is not null and new.confirmed_by = new.staff_id then
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
      or new.event_name is distinct from old.event_name
      or new.event_date is distinct from old.event_date
      or new.batch_id is distinct from old.batch_id
      or new.branch_id is distinct from old.branch_id
      or new.subject_id is distinct from old.subject_id
      or new.staff_id is distinct from old.staff_id
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

create trigger trg_open_day_transition
  before update on open_day_records
  for each row execute function private.enforce_open_day_transition();

-- ===== open_day_records policies =====
create policy "open_day_records: submitter reads own"
  on open_day_records for select
  to authenticated
  using (staff_id = auth.uid());

create policy "open_day_records: staff reads own branch"
  on open_day_records for select
  to authenticated
  using (private.is_staff_for_branch(branch_id));

create policy "open_day_records: admin reads all"
  on open_day_records for select
  to authenticated
  using (private.is_admin());

create policy "open_day_records: staff submits own"
  on open_day_records for insert
  to authenticated
  with check (
    staff_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'staff' and is_active
    )
  );

-- Confirm/reject: a *different* staff member of the same branch, or admin —
-- never the submitter themselves, even though submitter and confirmer are
-- both drawn from the 'staff' role.
create policy "open_day_records: staff/admin confirm or reject"
  on open_day_records for update
  to authenticated
  using (
    confirmation_status = 'pending'
    and staff_id <> auth.uid()
    and (private.is_staff_for_branch(branch_id) or private.is_admin())
  )
  with check (
    confirmed_by = auth.uid()
  );

create policy "open_day_records: admin updates all"
  on open_day_records for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());
