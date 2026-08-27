import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import InlineActionButton from '@/components/shared/InlineActionButton';
import {
  approvePaperCheckerRecord,
  markPaperCheckerRecordPaid,
} from '@/lib/paper-checker/actions';
import { approveSupervisorRecord, markSupervisorRecordPaid } from '@/lib/supervisor/actions';
import { approveOpenDayRecord, markOpenDayRecordPaid } from '@/lib/open-day/actions';

type Module = 'Paper Checker' | 'Supervisor' | 'Open Day';

interface PaymentRow {
  id: string;
  module: Module;
  date: string;
  title: string;
  branchName: string;
  staffId: string;
  staffName: string;
  amount: number;
  detailHref: string;
}

const MODULE_STYLES: Record<Module, string> = {
  'Paper Checker': 'bg-sky-100 text-sky-700',
  Supervisor: 'bg-violet-100 text-violet-700',
  'Open Day': 'bg-orange-100 text-orange-700',
};

export default async function PaymentManagementPage() {
  await requireAdmin();
  const supabase = await createClient();

  const [
    { data: pendingApprovalChecker },
    { data: pendingApprovalSupervisor },
    { data: pendingApprovalOpenDay },
    { data: approvedChecker },
    { data: approvedSupervisor },
    { data: approvedOpenDay },
    { data: branches },
    { data: profiles },
  ] = await Promise.all([
    supabase.from('paper_checker_records').select('*').eq('payment_status', 'pending_admin_approval'),
    supabase.from('supervisor_records').select('*').eq('payment_status', 'pending_admin_approval'),
    supabase.from('open_day_records').select('*').eq('payment_status', 'pending_admin_approval'),
    supabase.from('paper_checker_records').select('*').eq('payment_status', 'approved'),
    supabase.from('supervisor_records').select('*').eq('payment_status', 'approved'),
    supabase.from('open_day_records').select('*').eq('payment_status', 'approved'),
    supabase.from('branches').select('id, name'),
    supabase.from('profiles').select('id, full_name'),
  ]);

  const branchNameById = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  function toRows(
    checker: typeof approvedChecker,
    supervisor: typeof approvedSupervisor,
    openDay: typeof approvedOpenDay
  ): PaymentRow[] {
    return [
      ...(checker ?? []).map((r) => ({
        id: r.id,
        module: 'Paper Checker' as const,
        date: r.test_date,
        title: r.test_name,
        branchName: branchNameById.get(r.branch_id) ?? '—',
        staffId: r.paper_checker_id,
        staffName: nameById.get(r.paper_checker_id) ?? '—',
        amount: r.total_amount,
        detailHref: `/paper-checker/${r.id}`,
      })),
      ...(supervisor ?? []).map((r) => ({
        id: r.id,
        module: 'Supervisor' as const,
        date: r.work_date,
        title: r.duty_description,
        branchName: branchNameById.get(r.branch_id) ?? '—',
        staffId: r.supervisor_id,
        staffName: nameById.get(r.supervisor_id) ?? '—',
        amount: r.total_amount,
        detailHref: `/supervisor/${r.id}`,
      })),
      ...(openDay ?? []).map((r) => ({
        id: r.id,
        module: 'Open Day' as const,
        date: r.event_date,
        title: r.event_name,
        branchName: branchNameById.get(r.branch_id) ?? '—',
        staffId: r.staff_id,
        staffName: nameById.get(r.staff_id) ?? '—',
        amount: r.total_amount,
        detailHref: `/open-day/${r.id}`,
      })),
    ].sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  }

  const pendingApprovalRows = toRows(pendingApprovalChecker, pendingApprovalSupervisor, pendingApprovalOpenDay);
  const approvedRows = toRows(approvedChecker, approvedSupervisor, approvedOpenDay);

  const approveActionFor = (row: PaymentRow) =>
    row.module === 'Paper Checker'
      ? approvePaperCheckerRecord.bind(null, row.id)
      : row.module === 'Supervisor'
        ? approveSupervisorRecord.bind(null, row.id)
        : approveOpenDayRecord.bind(null, row.id);

  const markPaidActionFor = (row: PaymentRow) =>
    row.module === 'Paper Checker'
      ? markPaperCheckerRecordPaid.bind(null, row.id)
      : row.module === 'Supervisor'
        ? markSupervisorRecordPaid.bind(null, row.id)
        : markOpenDayRecordPaid.bind(null, row.id);

  const staffGroups = new Map<string, { staffName: string; count: number; total: number }>();
  approvedRows.forEach((row) => {
    const existing = staffGroups.get(row.staffId);
    if (existing) {
      existing.count += 1;
      existing.total += row.amount;
    } else {
      staffGroups.set(row.staffId, { staffName: row.staffName, count: 1, total: row.amount });
    }
  });

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Payment Management</h1>
      <p className="mt-1 text-sm text-slate-600">
        Approve confirmed submissions for payment, mark approved records as paid, and generate
        payment slips.
      </p>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900">Awaiting approval</h2>
        <p className="mt-1 text-sm text-slate-600">
          Confirmed by Staff, waiting on you to approve for payment.
        </p>
        {pendingApprovalRows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">Nothing awaiting approval.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <RecordTable rows={pendingApprovalRows} renderAction={(row) => (
              <InlineActionButton action={approveActionFor(row)} label="Approve" pendingLabel="Approving…" />
            )} />
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">Payment slips by staff</h2>
        <p className="mt-1 text-sm text-slate-600">
          Approved, unpaid amounts grouped by staff member. Generate a slip to download a PDF
          itemizing every approved record included.
        </p>
        {staffGroups.size === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No approved, unpaid records right now.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-2 pr-4">Staff</th>
                  <th className="py-2 pr-4 text-right">Records</th>
                  <th className="py-2 pr-4 text-right">Total</th>
                  <th className="py-2" />
                </tr>
              </thead>
              <tbody>
                {[...staffGroups.entries()].map(([staffId, group]) => (
                  <tr key={staffId} className="border-b border-slate-100">
                    <td className="py-2 pr-4 text-slate-900">{group.staffName}</td>
                    <td className="py-2 pr-4 text-right text-slate-600">{group.count}</td>
                    <td className="py-2 pr-4 text-right font-medium text-slate-900">
                      {group.total.toFixed(2)}
                    </td>
                    <td className="py-2 text-right">
                      <Link
                        href={`/api/payment-slip/${staffId}`}
                        className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                        target="_blank"
                      >
                        Generate slip (PDF)
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold text-slate-900">Approved records</h2>
        <p className="mt-1 text-sm text-slate-600">Ready to pay — mark each one paid once processed.</p>
        {approvedRows.length === 0 ? (
          <p className="mt-4 text-sm text-slate-500">No approved records right now.</p>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <RecordTable rows={approvedRows} renderAction={(row) => (
              <InlineActionButton
                action={markPaidActionFor(row)}
                label="Mark as paid"
                pendingLabel="Marking…"
                variant="success"
              />
            )} />
          </div>
        )}
      </section>
    </div>
  );
}

function RecordTable({
  rows,
  renderAction,
}: {
  rows: PaymentRow[];
  renderAction: (row: PaymentRow) => React.ReactNode;
}) {
  return (
    <table className="w-full min-w-[880px] text-sm">
      <thead>
        <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
          <th className="py-2 pr-4">Date</th>
          <th className="py-2 pr-4">Module</th>
          <th className="py-2 pr-4">Title</th>
          <th className="py-2 pr-4">Branch</th>
          <th className="py-2 pr-4">Staff</th>
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
              <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${MODULE_STYLES[row.module]}`}>
                {row.module}
              </span>
            </td>
            <td className="py-2 pr-4 text-slate-900">
              <Link href={row.detailHref} className="hover:underline">
                {row.title}
              </Link>
            </td>
            <td className="py-2 pr-4 text-slate-600">{row.branchName}</td>
            <td className="py-2 pr-4 text-slate-600">{row.staffName}</td>
            <td className="py-2 pr-4 text-right font-medium text-slate-900">{row.amount.toFixed(2)}</td>
            <td className="py-2 text-right">{renderAction(row)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
