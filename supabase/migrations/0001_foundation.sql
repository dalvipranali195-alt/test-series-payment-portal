-- Phase 1: Foundation
-- profiles + branches (branches is created here, minimally, only because
-- profiles.branch_id references it — full branches CRUD lands in Phase 2).

create extension if not exists "pgcrypto";

-- ===== LOOKUP: BRANCHES (minimal — full CRUD in Phase 2) =====
create table branches (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true
);

-- ===== USERS =====
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null check (role in ('admin','paper_checker','supervisor','staff')),
  branch_id uuid references branches(id),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

alter table branches enable row level security;
alter table profiles enable row level security;

-- Security-definer helper: lets policies check "is this user an admin"
-- without recursively re-evaluating the profiles RLS policy on itself.
create schema if not exists private;

create or replace function private.is_admin()
returns boolean
language sql
security definer
set search_path = public, pg_temp
stable
as $$
  select exists (
    select 1 from profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- ===== profiles policies =====
create policy "profiles: user reads own row"
  on profiles for select
  using (id = auth.uid());

create policy "profiles: admin reads all rows"
  on profiles for select
  using (private.is_admin());

create policy "profiles: admin updates all rows"
  on profiles for update
  using (private.is_admin())
  with check (private.is_admin());

-- No client-side insert/delete policy: rows are created by the
-- handle_new_user trigger below (security definer) and never deleted by app code.

-- ===== branches policies =====
create policy "branches: any authenticated user can read"
  on branches for select
  to authenticated
  using (true);

create policy "branches: admin can insert"
  on branches for insert
  to authenticated
  with check (private.is_admin());

create policy "branches: admin can update"
  on branches for update
  to authenticated
  using (private.is_admin())
  with check (private.is_admin());

create policy "branches: admin can delete"
  on branches for delete
  to authenticated
  using (private.is_admin());

-- ===== auto-provision a profile row when a new auth user is created =====
-- New users land as an inactive 'staff' placeholder; an admin assigns the
-- real role/branch and activates them from the Admin > Staff page (Phase 2).
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles (id, full_name, role, is_active)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', new.email, 'New User'),
    'staff',
    false
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Seed branch so the very first admin has somewhere to be assigned.
insert into branches (name) values ('Head Office');
