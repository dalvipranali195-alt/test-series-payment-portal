import Link from 'next/link';
import { getCurrentProfile } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { resolvePaymentRate } from '@/lib/payment-rates';
import { resolveTargetContext } from '@/lib/records/target-context';
import PaperCheckerForm from '@/components/forms/PaperCheckerForm';
import StaffPickerForm from '@/components/shared/StaffPickerForm';

export default async function NewPaperCheckerRecordPage({
  searchParams,
}: {
  searchParams: Promise<{ staff?: string }>;
}) {
  const { staff } = await searchParams;
  const profile = await getCurrentProfile();

  if (!profile) return null;

  const supabase = await createClient();
  const target = await resolveTargetContext(supabase, profile, 'paper_checker', 'Paper Checker', staff);

  if (target.mode === 'denied') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Submit Paper Checker record</h1>
        <p className="mt-2 text-sm text-red-600">{target.message}</p>
      </div>
    );
  }

  if (target.mode === 'picker') {
    return (
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Submit Paper Checker record</h1>
        <p className="mt-1 text-sm text-slate-600">Who is this record for?</p>
        <div className="mt-6">
          <StaffPickerForm roleLabel="Paper Checker" options={target.options} />
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

  const ratesBySubject: Record<string, { perPaperPrice: number; answerKeyPrice: number } | undefined> = {};

  await Promise.all(
    (subjects ?? []).map(async (subject) => {
      const rate = await resolvePaymentRate(supabase, {
        module: 'paper_checker',
        branchId,
        subjectId: subject.id,
        onDate: today,
      });
      if (rate && rate.per_paper_price != null && rate.answer_key_price != null) {
        ratesBySubject[subject.id] = {
          perPaperPrice: rate.per_paper_price,
          answerKeyPrice: rate.answer_key_price,
        };
      }
    })
  );

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Submit Paper Checker record</h1>
      <p className="mt-1 text-sm text-slate-600">
        {target.mode === 'target' ? (
          <>
            Submitting for <span className="font-medium text-slate-900">{target.staffName}</span>.{' '}
            <Link href="/paper-checker/new" className="font-medium text-slate-900 hover:underline">
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
          <PaperCheckerForm
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
