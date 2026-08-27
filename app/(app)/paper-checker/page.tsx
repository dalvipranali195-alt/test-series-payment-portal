import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import RecordsTable, { type PaperCheckerRow } from '@/components/paper-checker/RecordsTable';
import type { ConfirmationStatus } from '@/types/database.types';

const STATUS_FILTERS: { value: ConfirmationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending confirmation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
];

export default async function PaperCheckerListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const statusFilter = STATUS_FILTERS.find((f) => f.value === status)?.value;

  const supabase = await createClient();

  let query = supabase.from('paper_checker_records').select('*').order('test_date', { ascending: false });
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('confirmation_status', statusFilter);
  }

  const [{ data: records }, { data: subjects }, { data: batches }, { data: checkers }] = await Promise.all([
    query,
    supabase.from('subjects').select('id, name'),
    supabase.from('batches').select('id, name'),
    supabase.from('profiles').select('id, full_name'),
  ]);

  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const batchNameById = new Map((batches ?? []).map((b) => [b.id, b.name]));
  const checkerNameById = new Map((checkers ?? []).map((c) => [c.id, c.full_name]));

  const rows: PaperCheckerRow[] = (records ?? []).map((record) => ({
    id: record.id,
    date: record.test_date,
    title: record.test_name,
    subjectName: subjectNameById.get(record.subject_id) ?? '—',
    batchName: batchNameById.get(record.batch_id) ?? '—',
    submitterName: checkerNameById.get(record.paper_checker_id) ?? '—',
    quantity: record.student_count,
    totalAmount: record.total_amount,
    confirmationStatus: record.confirmation_status,
    paymentStatus: record.payment_status,
  }));

  const showChecker = profile.role !== 'paper_checker';

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Paper Checker Records</h1>
          <p className="mt-1 text-sm text-slate-600">
            {profile.role === 'paper_checker'
              ? 'Records you have submitted.'
              : profile.role === 'admin'
                ? 'All records across every branch.'
                : 'Records for your branch.'}
          </p>
        </div>
        {(profile.role === 'paper_checker' || profile.role === 'admin') && (
          <Link
            href="/paper-checker/new"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800"
          >
            New record
          </Link>
        )}
      </div>

      <div className="mt-4 flex gap-2">
        {STATUS_FILTERS.map((filter) => {
          const isActive = (status ?? 'all') === filter.value;
          return (
            <Link
              key={filter.value}
              href={filter.value === 'all' ? '/paper-checker' : `/paper-checker?status=${filter.value}`}
              className={`rounded-md px-3 py-1.5 text-xs font-medium ${
                isActive ? 'bg-slate-900 text-white' : 'border border-slate-300 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {filter.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-6">
        <RecordsTable rows={rows} showChecker={showChecker} />
      </div>
    </div>
  );
}
