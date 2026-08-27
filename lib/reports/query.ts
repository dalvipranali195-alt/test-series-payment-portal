import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';
import type { ReportFilters, ReportRow } from './types';

/**
 * Runs the (up to) three module queries for the Reports page and its PDF
 * export, applying every filter that can be pushed down to Postgres, then
 * combines and resolves display names client-side. RLS still applies to
 * every query underneath this — a Staff viewer only ever gets their own
 * branch's rows back regardless of what's asked for here.
 */
export async function fetchReportRows(
  supabase: SupabaseClient<Database>,
  filters: ReportFilters
): Promise<ReportRow[]> {
  const wantsChecker = filters.module === 'all' || filters.module === 'paper_checker';
  const wantsSupervisor = filters.module === 'all' || filters.module === 'supervisor';
  const wantsOpenDay = filters.module === 'all' || filters.module === 'open_day';

  function checkerQuery() {
    let q = supabase.from('paper_checker_records').select('*');
    if (filters.branchId) q = q.eq('branch_id', filters.branchId);
    if (filters.subjectId) q = q.eq('subject_id', filters.subjectId);
    if (filters.batchId) q = q.eq('batch_id', filters.batchId);
    if (filters.staffId) q = q.eq('paper_checker_id', filters.staffId);
    if (filters.confirmationStatus) q = q.eq('confirmation_status', filters.confirmationStatus);
    if (filters.paymentStatus) q = q.eq('payment_status', filters.paymentStatus);
    if (filters.from) q = q.gte('test_date', filters.from);
    if (filters.to) q = q.lte('test_date', filters.to);
    return q;
  }

  function supervisorQuery() {
    let q = supabase.from('supervisor_records').select('*');
    if (filters.branchId) q = q.eq('branch_id', filters.branchId);
    if (filters.subjectId) q = q.eq('subject_id', filters.subjectId);
    if (filters.batchId) q = q.eq('batch_id', filters.batchId);
    if (filters.staffId) q = q.eq('supervisor_id', filters.staffId);
    if (filters.confirmationStatus) q = q.eq('confirmation_status', filters.confirmationStatus);
    if (filters.paymentStatus) q = q.eq('payment_status', filters.paymentStatus);
    if (filters.from) q = q.gte('work_date', filters.from);
    if (filters.to) q = q.lte('work_date', filters.to);
    return q;
  }

  function openDayQuery() {
    let q = supabase.from('open_day_records').select('*');
    if (filters.branchId) q = q.eq('branch_id', filters.branchId);
    if (filters.subjectId) q = q.eq('subject_id', filters.subjectId);
    if (filters.batchId) q = q.eq('batch_id', filters.batchId);
    if (filters.staffId) q = q.eq('staff_id', filters.staffId);
    if (filters.confirmationStatus) q = q.eq('confirmation_status', filters.confirmationStatus);
    if (filters.paymentStatus) q = q.eq('payment_status', filters.paymentStatus);
    if (filters.from) q = q.gte('event_date', filters.from);
    if (filters.to) q = q.lte('event_date', filters.to);
    return q;
  }

  const [checkerRes, supervisorRes, openDayRes, branchesRes, subjectsRes, batchesRes, profilesRes] =
    await Promise.all([
      wantsChecker ? checkerQuery() : Promise.resolve({ data: [] as never[] }),
      wantsSupervisor ? supervisorQuery() : Promise.resolve({ data: [] as never[] }),
      wantsOpenDay ? openDayQuery() : Promise.resolve({ data: [] as never[] }),
      supabase.from('branches').select('id, name'),
      supabase.from('subjects').select('id, name'),
      supabase.from('batches').select('id, name'),
      supabase.from('profiles').select('id, full_name'),
    ]);

  const branchNameById = new Map((branchesRes.data ?? []).map((b) => [b.id, b.name]));
  const subjectNameById = new Map((subjectsRes.data ?? []).map((s) => [s.id, s.name]));
  const batchNameById = new Map((batchesRes.data ?? []).map((b) => [b.id, b.name]));
  const staffNameById = new Map((profilesRes.data ?? []).map((p) => [p.id, p.full_name]));

  const rows: ReportRow[] = [
    ...(checkerRes.data ?? []).map((r) => ({
      id: r.id,
      module: 'paper_checker' as const,
      moduleLabel: 'Paper Checker' as const,
      date: r.test_date,
      title: r.test_name,
      branchName: branchNameById.get(r.branch_id) ?? '—',
      staffName: staffNameById.get(r.paper_checker_id) ?? '—',
      subjectName: subjectNameById.get(r.subject_id) ?? '—',
      batchName: batchNameById.get(r.batch_id) ?? '—',
      amount: r.total_amount,
      confirmationStatus: r.confirmation_status,
      paymentStatus: r.payment_status,
      detailHref: `/paper-checker/${r.id}`,
    })),
    ...(supervisorRes.data ?? []).map((r) => ({
      id: r.id,
      module: 'supervisor' as const,
      moduleLabel: 'Supervisor' as const,
      date: r.work_date,
      title: r.duty_description,
      branchName: branchNameById.get(r.branch_id) ?? '—',
      staffName: staffNameById.get(r.supervisor_id) ?? '—',
      subjectName: subjectNameById.get(r.subject_id) ?? '—',
      batchName: batchNameById.get(r.batch_id) ?? '—',
      amount: r.total_amount,
      confirmationStatus: r.confirmation_status,
      paymentStatus: r.payment_status,
      detailHref: `/supervisor/${r.id}`,
    })),
    ...(openDayRes.data ?? []).map((r) => ({
      id: r.id,
      module: 'open_day' as const,
      moduleLabel: 'Open Day' as const,
      date: r.event_date,
      title: r.event_name,
      branchName: branchNameById.get(r.branch_id) ?? '—',
      staffName: staffNameById.get(r.staff_id) ?? '—',
      subjectName: (r.subject_id && subjectNameById.get(r.subject_id)) || '—',
      batchName: (r.batch_id && batchNameById.get(r.batch_id)) || '—',
      amount: r.total_amount,
      confirmationStatus: r.confirmation_status,
      paymentStatus: r.payment_status,
      detailHref: `/open-day/${r.id}`,
    })),
  ];

  rows.sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  return rows;
}
