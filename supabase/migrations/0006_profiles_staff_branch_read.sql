-- Fix: profiles only had "read your own row" and "admin reads all rows"
-- policies (0001_foundation.sql). That's a real gap, not by design — every
-- module's list/detail pages (and now Reports) look up submitter/confirmer
-- names via `select id, full_name from profiles`, and a non-admin Staff
-- viewer got back only their own row under that RLS, so every other
-- person's name silently rendered as "—". Staff already see every record
-- for their own branch (private.is_staff_for_branch() is used throughout
-- paper_checker_records/supervisor_records/open_day_records for exactly
-- this scoping) — they should be able to read the names of the people on
-- those records too.

create policy "profiles: staff reads same-branch profiles"
  on profiles for select
  to authenticated
  using (private.is_staff_for_branch(branch_id));
