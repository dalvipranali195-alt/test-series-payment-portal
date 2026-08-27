import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { resolvePaymentRate } from '@/lib/payment-rates';
import SupervisorForm from '@/components/forms/SupervisorForm';

export default async function NewSupervisorRecordPage() {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== 'supervisor') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Submit Supervisor record</h1>
        <p className="mt-2 text-sm text-red-600">
          Only Supervisor accounts can submit records here.
        </p>
      </div>
    );
  }

  if (!profile.branch_id) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Submit Supervisor record</h1>
        <p className="mt-2 text-sm text-amber-600">
          Your account has no branch assigned yet. Contact an admin before submitting records.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: batches }, { data: subjects }] = await Promise.all([
    supabase
      .from('batches')
      .select('id, name')
      .eq('branch_id', profile.branch_id)
      .eq('is_active', true)
      .order('name'),
    supabase.from('subjects').select('id, name').eq('is_active', true).order('name'),
  ]);

  const ratesBySubject: Record<string, number | undefined> = {};

  await Promise.all(
    (subjects ?? []).map(async (subject) => {
      const rate = await resolvePaymentRate(supabase, {
        module: 'supervisor',
        branchId: profile.branch_id as string,
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
        The amount shown here is an estimate — the server snapshots the rate that applies to
        your branch and subject when you submit.
      </p>

      <div className="mt-6">
        {batches && batches.length > 0 ? (
          <SupervisorForm batches={batches} subjects={subjects ?? []} ratesBySubject={ratesBySubject} />
        ) : (
          <p className="text-sm text-amber-600">
            No active batches exist for your branch yet. Contact an admin.
          </p>
        )}
      </div>
    </div>
  );
}
