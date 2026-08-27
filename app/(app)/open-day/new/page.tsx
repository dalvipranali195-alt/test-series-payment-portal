import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { resolvePaymentRate } from '@/lib/payment-rates';
import { resolveTargetContext } from '@/lib/records/target-context';
import OpenDayForm from '@/components/forms/OpenDayForm';
import StaffPickerForm from '@/components/shared/StaffPickerForm';

export default async function NewOpenDayRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ staff?: string }>;
}) {
  const { staff } = await searchParams;
  const profile = await getCurrentProfile();

  if (!profile) return null;

  const supabase = await createClient();
  const target = await resolveTargetContext(supabase, profile, 'staff', 'Staff/Coordinator', staff);

  if (target.mode === 'denied') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Submit Open Day record</h1>
        <p className="mt-2 text-sm text-red-600">{target.message}</p>
      </div>
    );
  }

  if (target.mode === 'picker') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Submit Open Day record</h1>
        <p className="mt-1 text-sm text-slate-600">Who is this record for?</p>
        <div className="mt-6">
          <StaffPickerForm roleLabel="Staff/Coordinator" options={target.options} />
        </div>
      </div>
    );
  }

  const { staffId, branchId } = target;
  const today = new Date().toISOString().slice(0, 10);

  const [{ data: batches }, { data: subjects }, rate] = await Promise.all([
    supabase.from('batches').select('id, name').eq('branch_id', branchId).eq('is_active', true).order('name'),
    supabase.from('subjects').select('id, name').eq('is_active', true).order('name'),
    resolvePaymentRate(supabase, { module: 'open_day', branchId, onDate: today }),
  ]);

  const flatRate = rate?.rate_config?.rate;
  const branchRate = typeof flatRate === 'number' ? flatRate : null;

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Submit Open Day record</h1>
      <p className="mt-1 text-sm text-slate-600">
        {target.mode === 'target' ? (
          <>
            Submitting for <span className="font-medium text-slate-900">{target.staffName}</span>.{' '}
            <Link href="/open-day/new" className="font-medium text-slate-900 hover:underline">
              Change
            </Link>
            {' — '}
          </>
        ) : null}
        The amount shown here is an estimate — the server snapshots the rate that applies to the
        branch (and subject, if selected) when you submit.
      </p>

      <div className="mt-6">
        <OpenDayForm
          batches={batches ?? []}
          subjects={subjects ?? []}
          branchRate={branchRate}
          staffId={target.mode === 'target' ? staffId : undefined}
        />
      </div>
    </div>
  );
}
