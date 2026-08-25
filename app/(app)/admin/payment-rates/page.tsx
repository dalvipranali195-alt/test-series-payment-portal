import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import CreatePaymentRateForm from '@/components/admin/CreatePaymentRateForm';

const MODULE_LABELS: Record<string, string> = {
  paper_checker: 'Paper Checker',
  supervisor: 'Supervisor',
  open_day: 'Open Day',
};

function formatRate(rate: {
  module: string;
  per_paper_price: number | null;
  answer_key_price: number | null;
  rate_config: Record<string, unknown> | null;
}) {
  if (rate.module === 'paper_checker') {
    return `${rate.per_paper_price ?? 0} / paper + ${rate.answer_key_price ?? 0} answer key`;
  }
  const flatRate = rate.rate_config?.rate;
  return typeof flatRate === 'number' ? `${flatRate} / unit` : '—';
}

export default async function PaymentRatesPage() {
  await requireAdmin();

  const supabase = await createClient();
  const [{ data: rates }, { data: branches }, { data: subjects }] = await Promise.all([
    supabase
      .from('payment_rates')
      .select('*')
      .order('module')
      .order('effective_date', { ascending: false }),
    supabase.from('branches').select('id, name').eq('is_active', true).order('name'),
    supabase.from('subjects').select('id, name').eq('is_active', true).order('name'),
  ]);

  const branchNameById = new Map((branches ?? []).map((b) => [b.id, b.name]));
  const subjectNameById = new Map((subjects ?? []).map((s) => [s.id, s.name]));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Payment Rates</h1>
      <p className="mt-1 text-sm text-slate-600">
        Rates are versioned by effective date and never edited in place — add a new rate to
        change one going forward. Records snapshot the rate that applied when they were
        submitted, so past totals never change retroactively.
      </p>

      <div className="mt-6">
        <CreatePaymentRateForm branches={branches ?? []} subjects={subjects ?? []} />
      </div>

      <div className="mt-8 overflow-x-auto">
        {rates && rates.length > 0 ? (
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Module</th>
                <th className="py-2 pr-4">Branch</th>
                <th className="py-2 pr-4">Subject</th>
                <th className="py-2 pr-4">Rate</th>
                <th className="py-2 pr-4">Effective date</th>
              </tr>
            </thead>
            <tbody>
              {rates.map((rate) => (
                <tr key={rate.id} className="border-b border-slate-100">
                  <td className="py-2 pr-4 text-slate-900">{MODULE_LABELS[rate.module]}</td>
                  <td className="py-2 pr-4 text-slate-600">
                    {(rate.branch_id && branchNameById.get(rate.branch_id)) || 'All branches'}
                  </td>
                  <td className="py-2 pr-4 text-slate-600">
                    {(rate.subject_id && subjectNameById.get(rate.subject_id)) || 'All subjects'}
                  </td>
                  <td className="py-2 pr-4 text-slate-900">{formatRate(rate)}</td>
                  <td className="py-2 pr-4 text-slate-600">{rate.effective_date}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">No rates configured yet.</p>
        )}
      </div>
    </div>
  );
}
