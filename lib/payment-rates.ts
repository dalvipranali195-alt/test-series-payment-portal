import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/types/database.types';

type PaymentRateRow = Database['public']['Tables']['payment_rates']['Row'];

/**
 * Finds the payment_rates row that applies to a specific branch/subject on
 * a given date, for a given module. Rates can be scoped to a specific
 * branch/subject or left null to apply broadly (see payment_rates.branch_id
 * / subject_id comments in the schema) — a specific match always beats a
 * wildcard, and among equally specific matches the most recent
 * effective_date <= onDate wins.
 */
export async function resolvePaymentRate(
  supabase: SupabaseClient<Database>,
  params: {
    module: Database['public']['Tables']['payment_rates']['Row']['module'];
    branchId: string;
    subjectId?: string | null;
    onDate: string;
  }
): Promise<PaymentRateRow | null> {
  const { data, error } = await supabase
    .from('payment_rates')
    .select('*')
    .eq('module', params.module)
    .lte('effective_date', params.onDate)
    .or(`branch_id.eq.${params.branchId},branch_id.is.null`)
    .or(params.subjectId ? `subject_id.eq.${params.subjectId},subject_id.is.null` : 'subject_id.is.null')
    .order('effective_date', { ascending: false });

  if (error) throw new Error(`Failed to look up payment rate: ${error.message}`);
  if (!data || data.length === 0) return null;

  const scored = data.map((rate) => ({
    rate,
    specificity: (rate.branch_id === params.branchId ? 2 : 0) + (rate.subject_id === (params.subjectId ?? null) ? 1 : 0),
  }));

  scored.sort((a, b) => {
    if (b.specificity !== a.specificity) return b.specificity - a.specificity;
    return b.rate.effective_date.localeCompare(a.rate.effective_date);
  });

  return scored[0].rate;
}
