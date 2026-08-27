import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

type ModuleFilter = 'all' | 'paper_checker' | 'supervisor' | 'open_day';

interface CombinedRecord {
  date: string;
  branchId: string;
  confirmationStatus: string;
  paymentStatus: string;
  amount: number;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ branch?: string; module?: string; from?: string; to?: string }>;
}) {
  const { branch: branchParam, module: moduleParam, from, to } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const moduleFilter: ModuleFilter =
    moduleParam === 'paper_checker' || moduleParam === 'supervisor' || moduleParam === 'open_day'
      ? moduleParam
      : 'all';
  const branchFilter = branchParam ?? '';

  const supabase = await createClient();

  const [{ data: checkerRecords }, { data: supervisorRecords }, { data: openDayRecords }, { data: branches }] =
    await Promise.all([
      moduleFilter === 'all' || moduleFilter === 'paper_checker'
        ? supabase.from('paper_checker_records').select('*')
        : Promise.resolve({ data: [] as never[] }),
      moduleFilter === 'all' || moduleFilter === 'supervisor'
        ? supabase.from('supervisor_records').select('*')
        : Promise.resolve({ data: [] as never[] }),
      moduleFilter === 'all' || moduleFilter === 'open_day'
        ? supabase.from('open_day_records').select('*')
        : Promise.resolve({ data: [] as never[] }),
      profile.role === 'admin' ? supabase.from('branches').select('id, name').order('name') : Promise.resolve({ data: [] }),
    ]);

  const combined: CombinedRecord[] = [
    ...(checkerRecords ?? []).map((r) => ({
      date: r.test_date,
      branchId: r.branch_id,
      confirmationStatus: r.confirmation_status,
      paymentStatus: r.payment_status,
      amount: r.total_amount,
    })),
    ...(supervisorRecords ?? []).map((r) => ({
      date: r.work_date,
      branchId: r.branch_id,
      confirmationStatus: r.confirmation_status,
      paymentStatus: r.payment_status,
      amount: r.total_amount,
    })),
    ...(openDayRecords ?? []).map((r) => ({
      date: r.event_date,
      branchId: r.branch_id,
      confirmationStatus: r.confirmation_status,
      paymentStatus: r.payment_status,
      amount: r.total_amount,
    })),
  ].filter((r) => {
    if (branchFilter && r.branchId !== branchFilter) return false;
    if (from && r.date < from) return false;
    if (to && r.date > to) return false;
    return true;
  });

  const totalRecords = combined.length;
  const pendingConfirmations = combined.filter((r) => r.confirmationStatus === 'pending').length;
  const paymentsDue = combined
    .filter((r) => r.paymentStatus === 'pending_admin_approval' || r.paymentStatus === 'approved')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);
  const paymentsMade = combined
    .filter((r) => r.paymentStatus === 'paid')
    .reduce((sum, r) => sum + Number(r.amount || 0), 0);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Dashboard</h1>
      <p className="mt-1 text-sm text-slate-600">
        Welcome back, {profile.full_name}.{' '}
        {profile.role === 'admin'
          ? 'Aggregate totals across every branch.'
          : profile.role === 'staff'
            ? 'Aggregate totals for your branch.'
            : 'Aggregate totals for your own submissions.'}
      </p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-md border border-slate-200 p-4">
        {profile.role === 'admin' && (
          <div>
            <label className="block text-xs font-medium text-slate-700">Branch</label>
            <select
              name="branch"
              defaultValue={branchFilter}
              className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">All branches</option>
              {(branches ?? []).map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-slate-700">Module</label>
          <select
            name="module"
            defaultValue={moduleFilter}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="all">All modules</option>
            <option value="paper_checker">Paper Checker</option>
            <option value="supervisor">Supervisor</option>
            <option value="open_day">Open Day</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">From</label>
          <input
            type="date"
            name="from"
            defaultValue={from ?? ''}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">To</label>
          <input
            type="date"
            name="to"
            defaultValue={to ?? ''}
            className="mt-1 rounded-md border border-slate-300 px-3 py-1.5 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>

        <button
          type="submit"
          className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800"
        >
          Apply filters
        </button>
        {(branchFilter || moduleFilter !== 'all' || from || to) && (
          <Link href="/dashboard" className="text-sm font-medium text-slate-600 hover:underline">
            Clear
          </Link>
        )}
      </form>

      <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card label="Total records" value={String(totalRecords)} />
        <Card label="Pending confirmations" value={String(pendingConfirmations)} accent="amber" />
        <Card label="Total payments due" value={paymentsDue.toFixed(2)} accent="indigo" />
        <Card label="Payments made" value={paymentsMade.toFixed(2)} accent="emerald" />
      </div>
    </div>
  );
}

function Card({
  label,
  value,
  accent,
}: {
  label: string;
  value: string;
  accent?: 'amber' | 'indigo' | 'emerald';
}) {
  const accentClass =
    accent === 'amber'
      ? 'border-amber-200 bg-amber-50'
      : accent === 'indigo'
        ? 'border-indigo-200 bg-indigo-50'
        : accent === 'emerald'
          ? 'border-emerald-200 bg-emerald-50'
          : 'border-slate-200 bg-white';

  return (
    <div className={`rounded-lg border p-5 ${accentClass}`}>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}
