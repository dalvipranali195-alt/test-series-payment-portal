import { notFound } from 'next/navigation';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { ConfirmationBadge, PaymentBadge } from '@/components/shared/StatusBadge';
import ConfirmRejectPanel from '@/components/shared/ConfirmRejectPanel';
import ApprovePaidPanel from '@/components/shared/ApprovePaidPanel';
import EditRecordForm from '@/components/supervisor/EditRecordForm';
import {
  confirmSupervisorRecord,
  rejectSupervisorRecord,
  approveSupervisorRecord,
  markSupervisorRecordPaid,
} from '@/lib/supervisor/actions';

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className="mt-0.5 text-sm text-slate-900">{value}</dd>
    </div>
  );
}

export default async function SupervisorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await getCurrentProfile();
  if (!profile) return null;

  const supabase = await createClient();

  const { data: record } = await supabase
    .from('supervisor_records')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (!record) notFound();

  const [{ data: subject }, { data: batch }, { data: branch }, { data: supervisor }, { data: confirmedBy }, { data: approvedBy }] =
    await Promise.all([
      supabase.from('subjects').select('name').eq('id', record.subject_id).single(),
      supabase.from('batches').select('name').eq('id', record.batch_id).single(),
      supabase.from('branches').select('name').eq('id', record.branch_id).single(),
      supabase.from('profiles').select('full_name').eq('id', record.supervisor_id).single(),
      record.confirmed_by
        ? supabase.from('profiles').select('full_name').eq('id', record.confirmed_by).single()
        : Promise.resolve({ data: null }),
      record.approved_by
        ? supabase.from('profiles').select('full_name').eq('id', record.approved_by).single()
        : Promise.resolve({ data: null }),
    ]);

  const canConfirmReject =
    record.confirmation_status === 'pending' &&
    record.supervisor_id !== profile.id &&
    (profile.role === 'admin' || (profile.role === 'staff' && profile.branch_id === record.branch_id));

  const isAdmin = profile.role === 'admin';

  let editContext: { batches: { id: string; name: string }[]; subjects: { id: string; name: string }[] } | null =
    null;

  if (isAdmin && record.payment_status !== 'paid') {
    const [{ data: batches }, { data: subjects }] = await Promise.all([
      supabase.from('batches').select('id, name').eq('branch_id', record.branch_id).order('name'),
      supabase.from('subjects').select('id, name').order('name'),
    ]);
    editContext = { batches: batches ?? [], subjects: subjects ?? [] };
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-900">{record.duty_description}</h1>
          <p className="mt-1 text-sm text-slate-600">{branch?.name}</p>
        </div>
        <div className="flex gap-2">
          <ConfirmationBadge status={record.confirmation_status} />
          <PaymentBadge status={record.payment_status} />
        </div>
      </div>

      <dl className="mt-6 grid grid-cols-2 gap-4 rounded-md border border-slate-200 p-4 sm:grid-cols-3">
        <Field label="Work date" value={record.work_date} />
        <Field label="Subject" value={subject?.name ?? '—'} />
        <Field label="Batch" value={batch?.name ?? '—'} />
        <Field label="Supervisor" value={supervisor?.full_name ?? '—'} />
        <Field label="Student count" value={String(record.student_count)} />
        <Field label="Rate" value={record.rate.toFixed(2)} />
        <Field label="Total amount" value={record.total_amount.toFixed(2)} />
      </dl>

      {(record.confirmed_by || record.rejection_reason) && (
        <div className="mt-4 rounded-md border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Confirmation history</h2>
          <dl className="mt-2 grid grid-cols-2 gap-4">
            <Field label={record.confirmation_status === 'rejected' ? 'Rejected by' : 'Confirmed by'} value={confirmedBy?.full_name ?? '—'} />
            <Field label="At" value={record.confirmed_at ? new Date(record.confirmed_at).toLocaleString() : '—'} />
          </dl>
          {record.rejection_reason && (
            <p className="mt-2 text-sm text-red-700">Reason: {record.rejection_reason}</p>
          )}
        </div>
      )}

      {(record.approved_by || record.paid_at) && (
        <div className="mt-4 rounded-md border border-slate-200 p-4">
          <h2 className="text-sm font-semibold text-slate-900">Payment history</h2>
          <dl className="mt-2 grid grid-cols-2 gap-4">
            {record.approved_by && <Field label="Approved by" value={approvedBy?.full_name ?? '—'} />}
            {record.approved_at && (
              <Field label="Approved at" value={new Date(record.approved_at).toLocaleString()} />
            )}
            {record.paid_at && <Field label="Paid at" value={new Date(record.paid_at).toLocaleString()} />}
          </dl>
        </div>
      )}

      <div className="mt-6 space-y-4">
        {canConfirmReject && (
          <ConfirmRejectPanel
            confirmAction={confirmSupervisorRecord.bind(null, record.id)}
            rejectAction={rejectSupervisorRecord.bind(null, record.id)}
          />
        )}
        {isAdmin && (
          <ApprovePaidPanel
            paymentStatus={record.payment_status}
            approveAction={approveSupervisorRecord.bind(null, record.id)}
            markPaidAction={markSupervisorRecordPaid.bind(null, record.id)}
          />
        )}
        {editContext && (
          <EditRecordForm
            id={record.id}
            batches={editContext.batches}
            subjects={editContext.subjects}
            record={{
              work_date: record.work_date,
              batch_id: record.batch_id,
              subject_id: record.subject_id,
              duty_description: record.duty_description,
              student_count: record.student_count,
              rate: record.rate,
            }}
          />
        )}
      </div>
    </div>
  );
}
