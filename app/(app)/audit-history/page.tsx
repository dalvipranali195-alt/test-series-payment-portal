import Link from 'next/link';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';

interface RawFilters {
  table?: string;
  action?: string;
  changed_by?: string;
  from?: string;
  to?: string;
}

const TABLE_LABELS: Record<string, string> = {
  paper_checker_records: 'Paper Checker',
  supervisor_records: 'Supervisor',
  open_day_records: 'Open Day',
  profiles: 'Staff',
  branches: 'Branches',
  subjects: 'Subjects',
  batches: 'Batches',
  payment_rates: 'Payment Rates',
};

const ACTIONS = ['created', 'edited', 'activated', 'deactivated', 'submitted', 'confirmed', 'rejected', 'approved', 'paid'];

export default async function AuditHistoryPage({ searchParams }: { searchParams: Promise<RawFilters> }) {
  await requireAdmin();
  const raw = await searchParams;

  const supabase = await createClient();

  let query = supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(500);
  if (raw.table) query = query.eq('table_name', raw.table);
  if (raw.action) query = query.eq('action', raw.action);
  if (raw.changed_by) query = query.eq('changed_by', raw.changed_by);
  if (raw.from) query = query.gte('created_at', `${raw.from}T00:00:00Z`);
  if (raw.to) query = query.lte('created_at', `${raw.to}T23:59:59Z`);

  const [{ data: logs }, { data: profiles }] = await Promise.all([
    query,
    supabase.from('profiles').select('id, full_name').order('full_name'),
  ]);

  const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Audit History</h1>
      <p className="mt-1 text-sm text-slate-600">
        Every logged change across every module and admin action — who changed what, when, and
        the before/after values. Showing the most recent {logs?.length ?? 0} entr
        {(logs?.length ?? 0) === 1 ? 'y' : 'ies'} matching these filters.
      </p>

      <form method="get" className="mt-6 flex flex-wrap items-end gap-3 rounded-md border border-slate-200 p-4">
        <div>
          <label className="block text-xs font-medium text-slate-700">Table</label>
          <select name="table" defaultValue={raw.table ?? ''} className={selectClass}>
            <option value="">All tables</option>
            {Object.entries(TABLE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">Action</label>
          <select name="action" defaultValue={raw.action ?? ''} className={selectClass}>
            <option value="">Any action</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">Changed by</label>
          <select name="changed_by" defaultValue={raw.changed_by ?? ''} className={selectClass}>
            <option value="">Anyone</option>
            {(profiles ?? []).map((p) => (
              <option key={p.id} value={p.id}>
                {p.full_name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">From</label>
          <input type="date" name="from" defaultValue={raw.from ?? ''} className={selectClass} />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700">To</label>
          <input type="date" name="to" defaultValue={raw.to ?? ''} className={selectClass} />
        </div>

        <button type="submit" className="rounded-md bg-slate-900 px-4 py-1.5 text-sm font-semibold text-white hover:bg-slate-800">
          Apply filters
        </button>
        <Link href="/audit-history" className="text-sm font-medium text-slate-600 hover:underline">
          Clear
        </Link>
      </form>

      {!logs || logs.length === 0 ? (
        <p className="mt-6 text-sm text-slate-500">No audit entries match these filters.</p>
      ) : (
        <div className="mt-6 overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">When</th>
                <th className="py-2 pr-4">Table</th>
                <th className="py-2 pr-4">Action</th>
                <th className="py-2 pr-4">Field</th>
                <th className="py-2 pr-4">Previous value</th>
                <th className="py-2 pr-4">New value</th>
                <th className="py-2 pr-4">Changed by</th>
                <th className="py-2">Reason</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <tr key={log.id} className="border-b border-slate-100 align-top">
                  <td className="py-2 pr-4 whitespace-nowrap text-slate-600">
                    {new Date(log.created_at).toLocaleString()}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{TABLE_LABELS[log.table_name] ?? log.table_name}</td>
                  <td className="py-2 pr-4">
                    <span className="inline-block rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                      {log.action}
                    </span>
                  </td>
                  <td className="py-2 pr-4 text-slate-600">{log.field_changed ?? '—'}</td>
                  <td className="py-2 pr-4 max-w-[180px] truncate text-slate-600" title={log.previous_value ?? ''}>
                    {log.previous_value ?? '—'}
                  </td>
                  <td className="py-2 pr-4 max-w-[180px] truncate text-slate-900" title={log.new_value ?? ''}>
                    {log.new_value ?? '—'}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">
                    {log.changed_by ? (nameById.get(log.changed_by) ?? '—') : '—'}
                  </td>
                  <td className="py-2 text-slate-600">{log.reason ?? '—'}</td>
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
