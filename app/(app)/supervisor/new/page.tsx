import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { resolvePaymentRate } from '@/lib/payment-rates';
import { resolveTargetContext } from '@/lib/records/target-context';
import SupervisorForm from '@/components/forms/SupervisorForm';
import StaffPickerForm from '@/components/shared/StaffPickerForm';

export default async function NewSupervisorRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ staff?: string }>;
}) {
  const { staff } = await searchParams;
  const profile = await getCurrentProfile();

  if (!profile) return null;

  const supabase = await createClient();
  const target = await resolveTargetContext(supabase, profile, 'supervisor', 'Supervisor', staff);

  if (target.mode === 'denied') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Submit Supervisor record</h1>
        <p className="mt-2 text-sm text-red-600">{target.message}</p>
      </div>
    );
  }

  if (target.mode === 'picker') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Submit Supervisor record</h1>
        <p className="mt-1 text-sm text-slate-600">Who is this record for?</p>
        <div className="mt-6">
          <StaffPickerForm roleLabel="Supervisor" options={target.options} />
        </div>
      </div>
    );
  }

  const { staffId, branchId } = target;
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: batches }, { data: subjects }] = await Promise.all([
    supabase.from('batches').select('id, name').eq('branch_id', branchId).eq('is_active', true).order('name'),
    supabase.from('subjects').select('id, name').eq('is_active', true).order('name'),
  ]);

  const ratesBySubject: Record<string, number | undefined> = {};

  await Promise.all(
    (subjects ?? []).map(async (subject) => {
      const rate = await resolvePaymentRate(supabase, {
        module: 'supervisor',
        branchId,
        subjectId: subject.id,
        onDate: today,
      });
      const flatRate = rate?.rate_config?.rate;
      if (typeof flatRate === 'number') {
        ratesBySubject[subject.id] = flatRate;
      }
    })
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Submit Supervisor record</h1>
      <p className="mt-1 text-sm text-slate-600">
        {target.mode === 'target' ? (
          <>
            Submitting for <span className="font-medium text-slate-900">{target.staffName}</span>.{' '}
            <Link href="/supervisor/new" className="font-medium text-slate-900 hover:underline">
              Change
            </Link>
            {' — '}
          </>
        ) : null}
        The amount shown here is an estimate — the server snapshots the rate that applies to the
        branch and subject when you submit.
      </p>

      <div className="mt-6">
        {batches && batches.length > 0 ? (
          <SupervisorForm
            batches={batches}
            subjects={subjects ?? []}
            ratesBySubject={ratesBySubject}
            staffId={target.mode === 'target' ? staffId : undefined}
          />
        ) : (
          <p className="text-sm text-amber-600">No active batches exist for this branch yet. Contact an admin.</p>
        )}
      </div>
    </div>
  );
}
