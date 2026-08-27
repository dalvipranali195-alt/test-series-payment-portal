-- Admin can now submit a Paper Checker / Supervisor / Open Day record on
-- behalf of any active staff member in the right role (see
-- lib/records/resolve-submitter.ts and lib/records/target-context.ts) so
-- the Main Admin isn't limited to Branches/Subjects/Batches/Payment
-- Rates/Staff — they can also enter any module's records directly.
--
-- The existing insert policy on each table only allows a row where
-- <submitter column> = auth.uid() (i.e. you can only ever insert your own
-- record) — there was no path for admin to insert a row attributed to
-- someone else. Adding one admin-only insert policy per table, mirroring
-- the "admin updates all" policy each table already has. The record still
-- starts at the default confirmation_status='pending' either way, so an
-- admin-submitted record goes through the same confirm -> approve -> pay
-- workflow as any other.

create policy "paper_checker_records: admin inserts for any staff"
  on paper_checker_records for insert
  to authenticated
  with check (private.is_admin());

create policy "supervisor_records: admin inserts for any staff"
  on supervisor_records for insert
  to authenticated
  with check (private.is_admin());

create policy "open_day_records: admin inserts for any staff"
  on open_day_records for insert
  to authenticated
  with check (private.is_admin());
