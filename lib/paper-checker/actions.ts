'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { resolvePaymentRate } from '@/lib/payment-rates';
import type { Database } from '@/types/database.types';

export interface FormActionState {
  error: string | null;
}

const initialError = (message: string): FormActionState => ({ error: message });

function listPath() {
  return '/paper-checker';
}

function detailPath(id: string) {
  return `/paper-checker/${id}`;
}

// ===== Submit (Paper Checker role) =====

export async function submitPaperCheckerRecord(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) return initialError('Not authorized.');
  if (profile.role !== 'paper_checker') {
    return initialError('Only Paper Checkers can submit records.');
  }
  if (!profile.branch_id) {
    return initialError('Your account has no branch assigned yet. Contact an admin.');
  }

  const testDate = String(formData.get('test_date') ?? '');
  const batchId = String(formData.get('batch_id') ?? '');
  const subjectId = String(formData.get('subject_id') ?? '');
  const testName = String(formData.get('test_name') ?? '').trim();
  const studentCount = Number(formData.get('student_count'));
  const testMarksRaw = String(formData.get('test_marks') ?? '').trim();
  const testMarks = testMarksRaw ? Number(testMarksRaw) : null;

  if (!testDate) return initialError('Test date is required.');
  if (!batchId) return initialError('Batch is required.');
  if (!subjectId) return initialError('Subject is required.');
  if (!testName) return initialError('Test name is required.');
  if (!Number.isInteger(studentCount) || studentCount < 0) {
    return initialError('Student count must be a whole number, 0 or more.');
  }
  if (testMarksRaw && (!Number.isInteger(testMarks) || (testMarks as number) < 0)) {
    return initialError('Test marks must be a whole number, 0 or more.');
  }

  const supabase = await createClient();

  const rate = await resolvePaymentRate(supabase, {
    module: 'paper_checker',
    branchId: profile.branch_id,
    subjectId,
    onDate: testDate,
  });

  if (!rate || rate.per_paper_price == null || rate.answer_key_price == null) {
    return initialError(
      'No paper checker payment rate is configured for this branch/subject yet. Contact an admin.'
    );
  }

  const { data: record, error } = await supabase
    .from('paper_checker_records')
    .insert({
      test_date: testDate,
      branch_id: profile.branch_id,
      batch_id: batchId,
      paper_checker_id: profile.id,
      subject_id: subjectId,
      test_name: testName,
      student_count: studentCount,
      test_marks: testMarks,
      per_paper_price: rate.per_paper_price,
      answer_key_price: rate.answer_key_price,
      rate_id: rate.id,
    })
    .select('id')
    .single();

  if (error || !record) {
    return initialError(error?.message ?? 'Failed to submit record.');
  }

  await logAudit(supabase, {
    tableName: 'paper_checker_records',
    recordId: record.id,
    action: 'submitted',
  });

  revalidatePath(listPath());
  redirect(detailPath(record.id));
}

// ===== Confirm / reject (Staff of same branch, or Admin) =====

export async function confirmPaperCheckerRecord(id: string): Promise<FormActionState> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) return initialError('Not authorized.');

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('paper_checker_records')
    .update({
      confirmation_status: 'confirmed',
      confirmed_by: profile.id,
      confirmed_at: new Date().toISOString(),
      payment_status: 'pending_admin_approval',
    })
    .eq('id', id)
    .select('id')
    .single();

  if (error || !data) {
    return initialError('Unable to confirm this record — it may not be yours to confirm.');
  }

  await logAudit(supabase, {
    tableName: 'paper_checker_records',
    recordId: id,
    action: 'confirmed',
  });

  revalidatePath(listPath());
  revalidatePath(detailPath(id));
  return { error: null };
}

export async function rejectPaperCheckerRecord(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) return initialError('Not authorized.');

  const reason = String(formData.get('reason') ?? '').trim();
  if (!reason) return initialError('A rejection reason is required.');

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('paper_checker_records')
    .update({
      confirmation_status: 'rejected',
      confirmed_by: profile.id,
      confirmed_at: new Date().toISOString(),
      rejection_reason: reason,
    })
    .eq('id', id)
    .select('id')
    .single();

  if (error || !data) {
    return initialError('Unable to reject this record — it may not be yours to reject.');
  }

  await logAudit(supabase, {
    tableName: 'paper_checker_records',
    recordId: id,
    action: 'rejected',
    reason,
  });

  revalidatePath(listPath());
  revalidatePath(detailPath(id));
  return { error: null };
}

// ===== Approve / mark paid (Admin only) =====

export async function approvePaperCheckerRecord(id: string): Promise<FormActionState> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('paper_checker_records')
    .update({
      payment_status: 'approved',
      approved_by: admin.id,
      approved_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('payment_status', 'pending_admin_approval')
    .select('id')
    .single();

  if (error || !data) {
    return initialError('This record is not awaiting approval.');
  }

  await logAudit(supabase, {
    tableName: 'paper_checker_records',
    recordId: id,
    action: 'approved',
  });

  revalidatePath(listPath());
  revalidatePath(detailPath(id));
  return { error: null };
}

export async function markPaperCheckerRecordPaid(id: string): Promise<FormActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('paper_checker_records')
    .update({
      payment_status: 'paid',
      paid_at: new Date().toISOString(),
    })
    .eq('id', id)
    .eq('payment_status', 'approved')
    .select('id')
    .single();

  if (error || !data) {
    return initialError('This record is not approved yet.');
  }

  await logAudit(supabase, {
    tableName: 'paper_checker_records',
    recordId: id,
    action: 'paid',
  });

  revalidatePath(listPath());
  revalidatePath(detailPath(id));
  return { error: null };
}

// ===== Edit (Admin only) =====

const EDITABLE_FIELDS = [
  'test_date',
  'batch_id',
  'subject_id',
  'test_name',
  'student_count',
  'test_marks',
  'per_paper_price',
  'answer_key_price',
] as const;

export async function updatePaperCheckerRecord(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('paper_checker_records')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) return initialError('Record not found.');
  if (existing.payment_status === 'paid') {
    return initialError('This record has already been paid and can no longer be edited.');
  }

  const testDate = String(formData.get('test_date') ?? '');
  const batchId = String(formData.get('batch_id') ?? '');
  const subjectId = String(formData.get('subject_id') ?? '');
  const testName = String(formData.get('test_name') ?? '').trim();
  const studentCount = Number(formData.get('student_count'));
  const testMarksRaw = String(formData.get('test_marks') ?? '').trim();
  const testMarks = testMarksRaw ? Number(testMarksRaw) : null;
  const perPaperPrice = Number(formData.get('per_paper_price'));
  const answerKeyPrice = Number(formData.get('answer_key_price'));

  if (!testDate) return initialError('Test date is required.');
  if (!batchId) return initialError('Batch is required.');
  if (!subjectId) return initialError('Subject is required.');
  if (!testName) return initialError('Test name is required.');
  if (!Number.isInteger(studentCount) || studentCount < 0) {
    return initialError('Student count must be a whole number, 0 or more.');
  }
  if (testMarksRaw && (!Number.isInteger(testMarks) || (testMarks as number) < 0)) {
    return initialError('Test marks must be a whole number, 0 or more.');
  }
  if (!Number.isFinite(perPaperPrice) || perPaperPrice < 0) {
    return initialError('Per-paper price must be a valid non-negative number.');
  }
  if (!Number.isFinite(answerKeyPrice) || answerKeyPrice < 0) {
    return initialError('Answer key price must be a valid non-negative number.');
  }

  const updated: Database['public']['Tables']['paper_checker_records']['Update'] = {
    test_date: testDate,
    batch_id: batchId,
    subject_id: subjectId,
    test_name: testName,
    student_count: studentCount,
    test_marks: testMarks,
    per_paper_price: perPaperPrice,
    answer_key_price: answerKeyPrice,
  };

  const { error: updateError } = await supabase
    .from('paper_checker_records')
    .update(updated)
    .eq('id', id);

  if (updateError) return initialError(updateError.message);

  for (const field of EDITABLE_FIELDS) {
    const previous = existing[field];
    const next = updated[field];
    if (String(previous ?? '') !== String(next ?? '')) {
      await logAudit(supabase, {
        tableName: 'paper_checker_records',
        recordId: id,
        action: 'edited',
        fieldChanged: field,
        previousValue: previous === null ? '' : String(previous),
        newValue: next === null ? '' : String(next),
      });
    }
  }

  revalidatePath(listPath());
  revalidatePath(detailPath(id));
  return { error: null };
}
