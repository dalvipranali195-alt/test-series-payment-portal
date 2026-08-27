import Link from 'next/link';
import { requireStaffOrAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { parseReportFilters, type RawFilterInput } from '@/lib/reports/types';
import { fetchReportRows } from '@/lib/reports/query';
import { ConfirmationBadge, PaymentBadge } from '@/components/shared/StatusBadge';
import type { ConfirmationStatus, PaymentStatus } from '@/types/database.types';

const MODULE_STYLES: Record<string, string> = {
  'Paper Checker': 'bg-sky-100 text-sky-700',
  Supervisor: 'bg-violet-100 text-violet-700',
  'Open Day': 'bg-orange-100 text-orange-700',
};

function buildQueryString(raw: RawFilterInput): string {
  const params = new URLSearchParams();
  Object.entries(raw).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  return params.toString();
}

export default async function ReportsPage({ searchParams }: { searchParams: Promise<RawFilterInput> }) {
  const raw = await searchParams;
  const profile = await requireStaffOrAdmin();
  const filters = parseReportFilters(raw);

  const supabase = await createClient();

  const [rows, { data: branches }, { data: subjects }, { data: batches }, { data: profiles }] = await Promise.all([
    fetchReportRows(supabase, filters),
    profile.role === 'admin' ? supabase.from('branches').select('id, name').order('name') : Promise.resolve({ data: [] }),
    supabase.from('subjects').select('id, name').order('name'),
    supabase.from('batches').select('id, name').order('name'),
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ]);

  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);
  const approvedAmount = rows
    .filter((r) => r.paymentStatus === 'pending_admin_approval' || r.paymentStatus === 'approved' || r.paymentStatus === 'paid')
    .reduce((sum, r) => sum + r.amount, 0);

  const pdfQuery = buildQueryString(raw);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Reports</h1>
      <p className="mt-1 text-sm text-slate-600">
        {profile.role === 'admin' ? 'Every module, every branch.' : 'Every module, your branch.'}
      </p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-md border border-slate-200 p-4">
        {profile.role === 'admin' && (
          <Field label="Branch">
            <select name="branch" defaultValue={raw.branch ?? ''} className={selectClass}>
              <option value="">All branches</option>
              {(branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </Field>
        )}

        <Field label="Module">
          <select name="module" defaultValue={filters.module} className={selectClass}>
            <option value="all">All modules</option>
            <option value="paper_checker">Paper Checker</option>
            <option value="supervisor">Supervisor</option>
            <option value="open_day">Open Day</option>
          </select>
        </Field>

        <Field label="Examiner / Staff">
          <select name="staff" defaultValue={raw.staff ?? ''} className={selectClass}>
            <option value="">Everyone</option>
            {(profiles ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Subject">
          <select name="subject" defaultValue={raw.subject ?? ''} className={selectClass}>
            <option value="">All subjects</option>
            {(subjects ?? []).map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Batch">
          <select name="batch" defaultValue={raw.batch ?? ''} className={selectClass}>
            <option value="">All batches</option>
            {(batches ?? []).map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Confirmation">
          <select name="confirmation" defaultValue={raw.confirmation ?? ''} className={selectClass}>
            <option value="">Any</option>
            {(['pending', 'confirmed', 'rejected'] satisfies ConfirmationStatus[]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Payment">
          <select name="payment" defaultValue={raw.payment ?? ''} className={selectClass}>
            <option value="">Any</option>
            {(['pending', 'pending_admin_approval', 'approved', 'paid'] satisfies PaymentStatus[]).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </Field>

        <Field label="From">
          <input type="date" name="from" defaultValue={raw.from ?? ''} className={selectClass} />
        </Field>

        <Field label="To">
          <input type="date" name="to" defaultValue={raw.to ?? ''} className={selectClass} />
        </Field>

        <button type="submit" className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">
          Apply filters
        </button>
        <Link href="/reports" className="text-sm font-medium text-slate-600 hover:underline">
          Clear
        </Link>
      </form>

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600">
          {rows.length} record{rows.length === 1 ? '' : 's'} — total {totalAmount.toFixed(2)}, confirmed-or-later{' '}
          {approvedAmount.toFixed(2)}
        </p>
        <a
          href={`/api/reports/pdf${pdfQuery ? `?${pdfQuery}` : ''}`}
          target="_blank"
          className="rounded-md border border-slate-300 px-4 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Download PDF
        </a>
      </div>

      {rows.length === 0 ? (
        <p className="mt-4 text-sm text-slate-500">No records match these filters.</p>
      ) : (
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[960px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Date</th>
                <th className="py-2 pr-4">Module</th>
                <th className="py-2 pr-4">Title</th>
                <th className="py-2 pr-4">Branch</th>
                <th className="py-2 pr-4">Staff</th>
                <th className="py-2 pr-4">Subject</th>
                <th className="py-2 pr-4">Batch</th>
                <th className="py-2 pr-4 text-right">Amount</th>
                <th className="py-2 pr-4">Confirmation</th>
                <th className="py-2 pr-4">Payment</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={`${row.module}-${row.id}`} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-600">{row.date}</td>
                  <td className="py-2 pr-4">
                    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${MODULE_STYLES[row.moduleLabel]}`}>
                      {row.moduleLabel}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-slate-900">{row.title}</td>
                  <td className="py-2 pr-4 text-slate-600">{row.branchName}</td>
                  <td className="py-2 pr-4 text-slate-600">{row.staffName}</td>
                  <td className="py-2 pr-4 text-slate-600">{row.subjectName}</td>
                  <td className="py-2 pr-4 text-slate-600">{row.batchName}</td>
                  <td className="py-2 pr-4 text-right font-medium text-slate-900">{row.amount.toFixed(2)}</td>
                  <td className="py-2 pr-4">
                    <ConfirmationBadge status={row.confirmationStatus} />
                  </td>
                  <td className="py-2 pr-4">
                    <PaymentBadge status={row.paymentStatus} />
                  </td>
                  <td className="py-2 text-right">
                    <Link
                      href={row.detailHref}
                      className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      View
                    </Link>
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

const selectClass =
  'mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-700">{label}</label>
      {children}
    </div>
  );
}
