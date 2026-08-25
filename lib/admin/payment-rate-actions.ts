'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import type { PaymentRateModule } from '@/types/database.types';

export interface PaymentRateActionState {
  error: string | null;
}

const PATH = '/admin/payment-rates';
const MODULES: PaymentRateModule[] = ['paper_checker', 'supervisor', 'open_day'];

export async function createPaymentRate(
  _prevState: PaymentRateActionState,
  formData: FormData
): Promise<PaymentRateActionState> {
  const admin = await requireAdmin();

  const rateModule = String(formData.get('module') ?? '') as PaymentRateModule;
  const branchId = String(formData.get('branch_id') ?? '') || null;
  const subjectId = String(formData.get('subject_id') ?? '') || null;
  const effectiveDate = String(formData.get('effective_date') ?? '');

  if (!MODULES.includes(rateModule)) return { error: 'Invalid module.' };
  if (!effectiveDate) return { error: 'Effective date is required.' };

  const supabase = await createClient();

  if (rateModule === 'paper_checker') {
    const perPaperPrice = Number(formData.get('per_paper_price'));
    const answerKeyPrice = Number(formData.get('answer_key_price'));

    if (!Number.isFinite(perPaperPrice) || perPaperPrice < 0) {
      return { error: 'Per-paper price must be a valid non-negative number.' };
    }
    if (!Number.isFinite(answerKeyPrice) || answerKeyPrice < 0) {
      return { error: 'Answer key price must be a valid non-negative number.' };
    }

    const { error } = await supabase.from('payment_rates').insert({
      module: rateModule,
      branch_id: branchId,
      subject_id: subjectId,
      per_paper_price: perPaperPrice,
      answer_key_price: answerKeyPrice,
      rate_config: null,
      effective_date: effectiveDate,
      created_by: admin.id,
    });
    if (error) return { error: error.message };
  } else {
    const rate = Number(formData.get('rate'));
    if (!Number.isFinite(rate) || rate < 0) {
      return { error: 'Rate must be a valid non-negative number.' };
    }

    const { error } = await supabase.from('payment_rates').insert({
      module: rateModule,
      branch_id: branchId,
      subject_id: subjectId,
      per_paper_price: null,
      answer_key_price: null,
      rate_config: { rate },
      effective_date: effectiveDate,
      created_by: admin.id,
    });
    if (error) return { error: error.message };
  }

  revalidatePath(PATH);
  return { error: null };
}
