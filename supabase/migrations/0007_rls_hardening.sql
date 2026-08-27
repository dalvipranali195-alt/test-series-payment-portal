-- Phase 8: RLS hardening
--
-- Gap found on review: the insert policy on every module table checked the
-- submitter's role (and, for Open Day, that they're 'staff') but never
-- checked that the branch_id being inserted actually matches that
-- submitter's own profiles.branch_id. The app layer always passes
-- profile.branch_id (see submitPaperCheckerRecord / submitSupervisorRecord /
-- submitOpenDayRecord), so this was never reachable through the UI - but
-- RLS is supposed to hold even against a direct REST/RPC call that skips
-- the app entirely, and nothing stopped an authenticated paper_checker from
-- inserting a row with an arbitrary branch_id, misattributing work (and its
-- payment) to a branch they don't belong to. Closing that here.

drop policy "paper_checker_records: paper_checker submits own" on paper_checker_records;

create policy "paper_checker_records: paper_checker submits own"
  on paper_checker_records for insert
  to authenticated
  with check (
    paper_checker_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'paper_checker' and is_active and branch_id = paper_checker_records.branch_id
    )
  );

drop policy "supervisor_records: supervisor submits own" on supervisor_records;

create policy "supervisor_records: supervisor submits own"
  on supervisor_records for insert
  to authenticated
  with check (
    supervisor_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'supervisor' and is_active and branch_id = supervisor_records.branch_id
    )
  );

drop policy "open_day_records: staff submits own" on open_day_records;

create policy "open_day_records: staff submits own"
  on open_day_records for insert
  to authenticated
  with check (
    staff_id = auth.uid()
    and exists (
      select 1 from profiles
      where id = auth.uid() and role = 'staff' and is_active and branch_id = open_day_records.branch_id
    )
  );
