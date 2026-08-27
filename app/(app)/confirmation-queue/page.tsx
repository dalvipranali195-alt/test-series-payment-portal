import Link from 'next/link';
import { requireStaffOrAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import InlineConfirmReject from '@/components/shared/InlineConfirmReject';
import {
  confirmPaperCheckerRecord,
  rejectPaperCheckerRecord,
} from '@/lib/paper-checker/actions';
import { confirmSupervisorRecord, rejectSupervisorRecord } from '@/lib/supervisor/actions';
import { confirmOpenDayRecord, rejectOpenDayRecord } from '@/lib/open-day/actions';

type Module = 'Paper Checker' | 'Supervisor' | 'Open Day';

interface QueueRow {
  id: string;
  module: Module;
  date: string;
  title: string;
  branchName: string;
  submitterName: string;
  amount: number;
  detailHref: string;
  submitterId: string;
  confirmAction: (
    state: { error: string | null },
    formData: FormData
  ) => Promise<{ error: string | null }>;
  rejectAction: (
    state: { error: string | null },
    formData: FormData
  ) => Promise<{ error: string | null }>;
}

const MODULE_STYLES: Record<Module, string> = {
  'Paper Checker': 'bg-sky-100 text-sky-700',
  Supervisor: 'bg-violet-100 text-violet-700',
  'Open Day': 'bg-orange-100 text-orange-700',
};

export default async function ConfirmationQueuePage() {
  const profile = await requireStaffOrAdmin();
  const supabase = await createClient();

  const [
    { data: checkerRecords },
    { data: supervisorRecords },
    { data: openDayRecords },
    { data: branches },
    { data: profiles },
  ] = await Promise.all([
    supabase.from('paper_checker_records').select('*').eq('confirmation_status', 'pending'),
    supabase.from('supervisor_records').select('*').eq('confirmation_status', 'pending'),
    supabase.from('open_day_records').select('*').eq('confirmation_status', 'pending'),
    supabase.from('branches').select('id, name'),
    supabase.from('profiles').select('id, full_name'),
  ]);

  const branchNameById = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  const rows: QueueRow[] = [
    ...(checkerRecords ?? []).map((r) => ({
      id: r.id,
      module: 'Paper Checker' as const,
      date: r.test_date,
      title: r.test_name,
      branchName: branchNameById.get(r.branch_id) ?? '—',
      submitterName: nameById.get(r.paper_checker_id) ?? '—',
      submitterId: r.paper_checker_id,
      amount: r.total_amount,
      detailHref: `/paper-checker/${r.id}`,
      confirmAction: confirmPaperCheckerRecord.bind(null, r.id),
      rejectAction: rejectPaperCheckerRecord.bind(null, r.id),
    })),
    ...(supervisorRecords ?? []).map((r) => ({
      id: r.id,
      module: 'Supervisor' as const,
      date: r.work_date,
      title: r.duty_description,
      branchName: branchNameById.get(r.branch_id) ?? '—',
      submitterName: nameById.get(r.supervisor_id) ?? '—',
      submitterId: r.supervisor_id,
      amount: r.total_amount,
      detailHref: `/supervisor/${r.id}`,
      confirmAction: confirmSupervisorRecord.bind(null, r.id),
      rejectAction: rejectSupervisorRecord.bind(null, r.id),
    })),
    ...(openDayRecords ?? []).map((r) => ({
      id: r.id,
      module: 'Open Day' as const,
      date: r.event_date,
      title: r.event_name,
      branchName: branchNameById.get(r.branch_id) ?? '—',
      submitterName: nameById.get(r.staff_id) ?? '—',
      submitterId: r.staff_id,
      amount: r.total_amount,
      detailHref: `/open-day/${r.id}`,
      confirmAction: confirmOpenDayRecord.bind(null, r.id),
      rejectAction: rejectOpenDayRecord.bind(null, r.id),
    })),
  ]
    // A submitter can't confirm/reject their own record (enforced by RLS and
    // the transition triggers too) — leave those off the actionable queue.
    .filter((r) => r.submitterId !== profile.id)
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Confirmation Queue</h1>
      <p className="mt-1 text-sm text-slate-600">
        {profile.role === 'admin'
          ? 'Every pending submission across all branches, oldest first.'
          : 'Pending submissions for your branch, oldest first.'}
      </p>

      {rows.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">Nothing pending confirmation right now.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[880px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Module</th>
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Branch</th>
                <th className="py-2 pr-4">Submitted by</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4" />
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.module}-${row.id}`} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-600">{row.date}</td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${MODULE_STYLES[row.module]}`}
                    >
                      {row.module}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-slate-900">
                    <Link href={row.detailHref} className="hover:underline">
                      {row.title}
                    </Link>
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{row.branchName}</td>
                  <td className="py-2 pr-4 text-slate-600">{row.submitterName}</td>
                  <td className="py-2 pr-4 text-right font-medium text-slate-900">
                    {row.amount.toFixed(2)}
                  </td>
                  <td className="py-2 pr-4 text-right">
                    <InlineConfirmReject confirmAction={row.confirmAction} rejectAction={row.rejectAction} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
