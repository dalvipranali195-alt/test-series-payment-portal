-- Test Series Payment Portal — initial schema
-- Roles, rate history, the 3 record modules, workflow status, and audit log.
-- See SPEC.md for the full data-model writeup.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type user_role as enum (
  'admin',
  'paper_checker',
  'supervisor',
  'staff_coordinator',
  'accounts'
);

create type module_type as enum (
  'paper_checker',
  'supervisor',
  'open_day'
);

create type record_status as enum (
  'confirmation_pending',
  'rejected',
  'pending_admin_approval',
  'approved',
  'paid'
);

-- ---------------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------------

create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text not null,
  role user_role not null default 'paper_checker',
  branch text,
  phone text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table profiles enable row level security;

create function is_admin(uid uuid) returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (
      select 1 from profiles where id = uid and role = 'admin'
    );
$$;

create function current_role_is(roles user_role[]) returns boolean
  language sql stable security definer set search_path = public as $$
    select exists (
      select 1 from profiles where id = auth.uid() and role = any(roles)
    );
$$;

create policy "profiles: self read" on profiles
  for select using (id = auth.uid() or is_admin(auth.uid()));

create policy "profiles: self update (no role change)" on profiles
  for update using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from profiles where id = auth.uid()));

create policy "profiles: admin manage" on profiles
  for all using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- New auth users get a profile row automatically (default role: paper_checker,
-- an admin promotes them afterwards).
create function handle_new_user() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, role)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', new.email), 'paper_checker');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- ---------------------------------------------------------------------------
-- payment_rates (versioned; never mutated, only closed out + re-inserted)
-- ---------------------------------------------------------------------------

create table payment_rates (
  id uuid primary key default gen_random_uuid(),
  module module_type not null,
  rate_key text not null,
  amount numeric(10, 2) not null check (amount >= 0),
  branch text,
  effective_from timestamptz not null default now(),
  effective_to timestamptz,
  created_by uuid references profiles (id),
  created_at timestamptz not null default now()
);

create index payment_rates_active_idx on payment_rates (module, rate_key, branch)
  where effective_to is null;

alter table payment_rates enable row level security;

create policy "payment_rates: read all authenticated" on payment_rates
  for select using (auth.uid() is not null);

create policy "payment_rates: admin write" on payment_rates
  for insert with check (is_admin(auth.uid()));

create policy "payment_rates: admin close out" on payment_rates
  for update using (is_admin(auth.uid())) with check (is_admin(auth.uid()));

-- ---------------------------------------------------------------------------
-- shared workflow columns are repeated per table (Postgres has no mixins);
-- kept in sync deliberately across paper_checker_records / supervisor_records
-- / open_day_records.
-- ---------------------------------------------------------------------------

create table paper_checker_records (
  id uuid primary key default gen_random_uuid(),
  examiner_id uuid not null references profiles (id),
  branch text not null,
  subject text not null,
  batch text,
  exam_date date not null,
  student_present_count int not null check (student_present_count >= 0),
  per_paper_price numeric(10, 2) not null,
  answer_key_price numeric(10, 2) not null default 0,
  total_amount numeric(10, 2) generated always as
    (student_present_count * per_paper_price + answer_key_price) stored,
  status record_status not null default 'confirmation_pending',
  rejection_reason text,
  submitted_by uuid not null references profiles (id),
  submitted_at timestamptz not null default now(),
  confirmed_by uuid references profiles (id),
  confirmed_at timestamptz,
  approved_by uuid references profiles (id),
  approved_at timestamptz,
  paid_by uuid references profiles (id),
  paid_at timestamptz,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table supervisor_records (
  id uuid primary key default gen_random_uuid(),
  supervisor_id uuid not null references profiles (id),
  branch text not null,
  batch text,
  exam_date date not null,
  days_worked int not null check (days_worked >= 0),
  per_day_rate numeric(10, 2) not null,
  total_amount numeric(10, 2) generated always as (days_worked * per_day_rate) stored,
  status record_status not null default 'confirmation_pending',
  rejection_reason text,
  submitted_by uuid not null references profiles (id),
  submitted_at timestamptz not null default now(),
  confirmed_by uuid references profiles (id),
  confirmed_at timestamptz,
  approved_by uuid references profiles (id),
  approved_at timestamptz,
  paid_by uuid references profiles (id),
  paid_at timestamptz,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table open_day_records (
  id uuid primary key default gen_random_uuid(),
  staff_id uuid not null references profiles (id),
  branch text not null,
  event_date date not null,
  hours_worked numeric(5, 2) not null check (hours_worked >= 0),
  hourly_rate numeric(10, 2) not null,
  total_amount numeric(10, 2) generated always as (hours_worked * hourly_rate) stored,
  status record_status not null default 'confirmation_pending',
  rejection_reason text,
  submitted_by uuid not null references profiles (id),
  submitted_at timestamptz not null default now(),
  confirmed_by uuid references profiles (id),
  confirmed_at timestamptz,
  approved_by uuid references profiles (id),
  approved_at timestamptz,
  paid_by uuid references profiles (id),
  paid_at timestamptz,
  payment_reference text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table paper_checker_records enable row level security;
alter table supervisor_records enable row level security;
alter table open_day_records enable row level security;

create function set_updated_at() returns trigger
  language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger paper_checker_records_updated_at before update on paper_checker_records
  for each row execute function set_updated_at();
create trigger supervisor_records_updated_at before update on supervisor_records
  for each row execute function set_updated_at();
create trigger open_day_records_updated_at before update on open_day_records
  for each row execute function set_updated_at();

-- RLS: owners see/create their own records; staff_coordinator/admin/accounts
-- see everything; updates are further restricted in application code to the
-- specific columns each role is allowed to change per workflow stage.
create policy "paper_checker_records: owner read" on paper_checker_records
  for select using (
    examiner_id = auth.uid() or submitted_by = auth.uid()
    or current_role_is(array['staff_coordinator', 'admin', 'accounts']::user_role[])
  );
create policy "paper_checker_records: owner insert" on paper_checker_records
  for insert with check (
    submitted_by = auth.uid()
    and (examiner_id = auth.uid() or current_role_is(array['staff_coordinator', 'admin']::user_role[]))
  );
create policy "paper_checker_records: workflow update" on paper_checker_records
  for update using (
    current_role_is(array['staff_coordinator', 'admin', 'accounts']::user_role[])
  );

create policy "supervisor_records: owner read" on supervisor_records
  for select using (
    supervisor_id = auth.uid() or submitted_by = auth.uid()
    or current_role_is(array['staff_coordinator', 'admin', 'accounts']::user_role[])
  );
create policy "supervisor_records: owner insert" on supervisor_records
  for insert with check (
    submitted_by = auth.uid()
    and (supervisor_id = auth.uid() or current_role_is(array['staff_coordinator', 'admin']::user_role[]))
  );
create policy "supervisor_records: workflow update" on supervisor_records
  for update using (
    current_role_is(array['staff_coordinator', 'admin', 'accounts']::user_role[])
  );

create policy "open_day_records: owner read" on open_day_records
  for select using (
    staff_id = auth.uid() or submitted_by = auth.uid()
    or current_role_is(array['staff_coordinator', 'admin', 'accounts']::user_role[])
  );
create policy "open_day_records: owner insert" on open_day_records
  for insert with check (
    submitted_by = auth.uid()
    and (staff_id = auth.uid() or current_role_is(array['staff_coordinator', 'admin']::user_role[]))
  );
create policy "open_day_records: workflow update" on open_day_records
  for update using (
    current_role_is(array['staff_coordinator', 'admin', 'accounts']::user_role[])
  );

-- ---------------------------------------------------------------------------
-- audit_log (append-only)
-- ---------------------------------------------------------------------------

create table audit_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  changed_by uuid references profiles (id),
  changed_at timestamptz not null default now(),
  reason text
);

alter table audit_log enable row level security;

create policy "audit_log: admin read" on audit_log
  for select using (current_role_is(array['admin', 'staff_coordinator']::user_role[]));

create policy "audit_log: system insert" on audit_log
  for insert with check (auth.uid() is not null);

-- Generic status-change auditing for the 3 record tables.
create function audit_record_status_change() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'UPDATE' and new.status is distinct from old.status) then
    insert into audit_log (table_name, record_id, action, old_value, new_value, changed_by, reason)
    values (
      tg_table_name,
      new.id,
      new.status::text,
      jsonb_build_object('status', old.status),
      jsonb_build_object('status', new.status),
      auth.uid(),
      new.rejection_reason
    );
  elsif (tg_op = 'INSERT') then
    insert into audit_log (table_name, record_id, action, new_value, changed_by)
    values (tg_table_name, new.id, 'submitted', jsonb_build_object('status', new.status), auth.uid());
  end if;
  return new;
end;
$$;

create trigger paper_checker_records_audit
  after insert or update on paper_checker_records
  for each row execute function audit_record_status_change();
create trigger supervisor_records_audit
  after insert or update on supervisor_records
  for each row execute function audit_record_status_change();
create trigger open_day_records_audit
  after insert or update on open_day_records
  for each row execute function audit_record_status_change();

-- Audit rate changes too (creation + close-out).
create function audit_rate_change() returns trigger
  language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into audit_log (table_name, record_id, action, new_value, changed_by)
    values ('payment_rates', new.id, 'rate_created', to_jsonb(new), auth.uid());
  elsif (tg_op = 'UPDATE' and new.effective_to is distinct from old.effective_to) then
    insert into audit_log (table_name, record_id, action, old_value, new_value, changed_by)
    values ('payment_rates', new.id, 'rate_closed', to_jsonb(old), to_jsonb(new), auth.uid());
  end if;
  return new;
end;
$$;

create trigger payment_rates_audit
  after insert or update on payment_rates
  for each row execute function audit_rate_change();
