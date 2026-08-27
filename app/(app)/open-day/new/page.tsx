import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { resolvePaymentRate } from '@/lib/payment-rates';
import OpenDayForm from '@/components/forms/OpenDayForm';

export default async function NewOpenDayRecordPage() {
  const profile = await getCurrentProfile();

  if (!profile || profile.role !== 'staff') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Submit Open Day record</h1>
        <p className="mt-2 text-sm text-red-600">
          Only Staff/Coordinator accounts can submit Open Day records here.
        </p>
      </div>
    );
  }

  if (!profile.branch_id) {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Submit Open Day record</h1>
        <p className="mt-2 text-sm text-amber-600">
          Your account has no branch assigned yet. Contact an admin before submitting records.
        </p>
      </div>
    );
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: batches }, { data: subjects }, rate] = await Promise.all([
    supabase
      .from('batches')
      .select('id, name')
      .eq('branch_id', profile.branch_id)
      .eq('is_active', true)
      .order('name'),
    supabase.from('subjects').select('id, name').eq('is_active', true).order('name'),
    resolvePaymentRate(supabase, {
      module: 'open_day',
      branchId: profile.branch_id,
      onDate: today,
    }),
  ]);

  const flatRate = rate?.rate_config?.rate;
  const branchRate = typeof flatRate === 'number' ? flatRate : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Submit Open Day record</h1>
      <p className="mt-1 text-sm text-slate-600">
        The amount shown here is an estimate — the server snapshots the rate that applies to
        your branch (and subject, if selected) when you submit.
      </p>

      <div className="mt-6">
        <OpenDayForm batches={batches ?? []} subjects={subjects ?? []} branchRate={branchRate} />
      </div>
    </div>
  );
}
