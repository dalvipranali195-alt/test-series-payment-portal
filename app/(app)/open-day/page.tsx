import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import RecordsTable, { type RecordRow } from '@/components/shared/RecordsTable';
import type { ConfirmationStatus } from '@/types/database.types';

const STATUS_FILTERS: { value: ConfirmationStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending confirmation' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'rejected', label: 'Rejected' },
];

export default async function OpenDayListPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const statusFilter = STATUS_FILTERS.find((f) => f.value === status)?.value;

  const supabase = await createClient();

  let query = supabase.from('open_day_records').select('*').order('event_date', { ascending: false });
  if (statusFilter && statusFilter !== 'all') {
    query = query.eq('confirmation_status', statusFilter);
  }

  const [{ data: records }, { data: subjects }, { data: batches }, { data: staffProfiles }] = await Promise.all([
    query,
    supabase.from('subjects').select('id, name'),
    supabase.from('batches').select('id, name'),
    supabase.from('profiles').select('id, full_name'),
  ]);

  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));
  const batchNameById = new Map((batches ?? []).map((b) => [b.id, b.name]));
  const staffNameById = new Map((staffProfiles ?? []).map((s) => [s.id, s.full_name]));

  const rows: RecordRow[] = (records ?? []).map((record) => ({
    id: record.id,
    date: record.event_date,
    title: record.event_name,
    subjectName: (record.subject_id && subjectNameById.get(record.subject_id)) || '—',
    batchName: (record.batch_id && batchNameById.get(record.batch_id)) || '—',
    submitterName: staffNameById.get(record.staff_id) ?? '—',
    quantity: record.student_count,
    totalAmount: record.total_amount,
    confirmationStatus: record.confirmation_status,
    paymentStatus: record.payment_status,
  }));

  // Unlike Paper Checker/Supervisor, Staff view a branch-wide list rather than
  // "records I submitted" (there's no dedicated open_day role — see the
  // migration), so the submitter name is worth showing for every viewer.
  const showSubmitter = true;

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">Open Day Records</h1>
          <p className="mt-1 text-sm text-slate-600">
            {profile.role === 'admin' ? 'All records across every branch.' : 'Records for your branch.'}
          </p>
        </div>
        {profile.role === 'staff' && (
          <Link
            href="/open-day/new"
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
              href={filter.value === 'all' ? '/open-day' : `/open-day?status=${filter.value}`}
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
        <RecordsTable
          rows={rows}
          showSubmitter={showSubmitter}
          submitterLabel="Submitted by"
          quantityLabel="Students"
          detailBasePath="/open-day"
        />
      </div>
    </div>
  );
}
