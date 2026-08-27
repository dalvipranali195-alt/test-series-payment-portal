'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getCurrentProfile, requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';
import { resolvePaymentRate } from '@/lib/payment-rates';
import { resolveSubmitter } from '@/lib/records/resolve-submitter';
import type { Database } from '@/types/database.types';

export interface FormActionState {
  error: string | null;
}

const initialError = (message: string): FormActionState => ({ error: message });

function listPath() {
  return '/supervisor';
}

function detailPath(id: string) {
  return `/supervisor/${id}`;
}

function flatRateFrom(rateConfig: Record<string, unknown> | null): number | null {
  const rate = rateConfig?.rate;
  return typeof rate === 'number' ? rate : null;
}

// ===== Submit (Supervisor role) =====

export async function submitSupervisorRecord(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) return initialError('Not authorized.');

  const supabase = await createClient();

  const resolved = await resolveSubmitter(supabase, profile, 'supervisor', 'Supervisor', formData);
  if (!resolved.ok) return initialError(resolved.error);
  const { staffId, branchId } = resolved.submitter;

  const workDate = String(formData.get('work_date') ?? '');
  const batchId = String(formData.get('batch_id') ?? '');
  const subjectId = String(formData.get('subject_id') ?? '');
  const dutyDescription = String(formData.get('duty_description') ?? '').trim();
  const studentCount = Number(formData.get('student_count'));

  if (!workDate) return initialError('Work date is required.');
  if (!batchId) return initialError('Batch is required.');
  if (!subjectId) return initialError('Subject is required.');
  if (!dutyDescription) return initialError('Duty description is required.');
  if (!Number.isInteger(studentCount) || studentCount < 0) {
    return initialError('Student count must be a whole number, 0 or more.');
  }

  const rate = await resolvePaymentRate(supabase, {
    module: 'supervisor',
    branchId,
    subjectId,
    onDate: workDate,
  });

  const flatRate = rate ? flatRateFrom(rate.rate_config) : null;
  if (!rate || flatRate == null) {
    return initialError(
      'No supervisor payment rate is configured for this branch/subject yet. Contact an admin.'
    );
  }

  const { data: record, error } = await supabase
    .from('supervisor_records')
    .insert({
      work_date: workDate,
      branch_id: branchId,
      batch_id: batchId,
      supervisor_id: staffId,
      subject_id: subjectId,
      duty_description: dutyDescription,
      student_count: studentCount,
      rate: flatRate,
      rate_id: rate.id,
    })
    .select('id')
    .single();

  if (error || !record) {
    return initialError(error?.message ?? 'Failed to submit record.');
  }

  await logAudit(supabase, {
    tableName: 'supervisor_records',
    recordId: record.id,
    action: 'submitted',
  });

  revalidatePath(listPath());
  redirect(detailPath(record.id));
}

// ===== Confirm / reject (Staff of same branch, or Admin) =====

export async function confirmSupervisorRecord(id: string): Promise<FormActionState> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) return initialError('Not authorized.');

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('supervisor_records')
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
    tableName: 'supervisor_records',
    recordId: id,
    action: 'confirmed',
  });

  revalidatePath(listPath());
  revalidatePath(detailPath(id));
  return { error: null };
}

export async function rejectSupervisorRecord(
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
    .from('supervisor_records')
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
    tableName: 'supervisor_records',
    recordId: id,
    action: 'rejected',
    reason,
  });

  revalidatePath(listPath());
  revalidatePath(detailPath(id));
  return { error: null };
}

// ===== Approve / mark paid (Admin only) =====

export async function approveSupervisorRecord(id: string): Promise<FormActionState> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('supervisor_records')
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
    tableName: 'supervisor_records',
    recordId: id,
    action: 'approved',
  });

  revalidatePath(listPath());
  revalidatePath(detailPath(id));
  return { error: null };
}

export async function markSupervisorRecordPaid(id: string): Promise<FormActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('supervisor_records')
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
    tableName: 'supervisor_records',
    recordId: id,
    action: 'paid',
  });

  revalidatePath(listPath());
  revalidatePath(detailPath(id));
  return { error: null };
}

// ===== Edit (Admin only) =====

const EDITABLE_FIELDS = [
  'work_date',
  'batch_id',
  'subject_id',
  'duty_description',
  'student_count',
  'rate',
] as const;

export async function updateSupervisorRecord(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('supervisor_records')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) return initialError('Record not found.');
  if (existing.payment_status === 'paid') {
    return initialError('This record has already been paid and can no longer be edited.');
  }

  const workDate = String(formData.get('work_date') ?? '');
  const batchId = String(formData.get('batch_id') ?? '');
  const subjectId = String(formData.get('subject_id') ?? '');
  const dutyDescription = String(formData.get('duty_description') ?? '').trim();
  const studentCount = Number(formData.get('student_count'));
  const rate = Number(formData.get('rate'));

  if (!workDate) return initialError('Work date is required.');
  if (!batchId) return initialError('Batch is required.');
  if (!subjectId) return initialError('Subject is required.');
  if (!dutyDescription) return initialError('Duty description is required.');
  if (!Number.isInteger(studentCount) || studentCount < 0) {
    return initialError('Student count must be a whole number, 0 or more.');
  }
  if (!Number.isFinite(rate) || rate < 0) {
    return initialError('Rate must be a valid non-negative number.');
  }

  const updated: Database['public']['Tables']['supervisor_records']['Update'] = {
    work_date: workDate,
    batch_id: batchId,
    subject_id: subjectId,
    duty_description: dutyDescription,
    student_count: studentCount,
    rate,
  };

  const { error: updateError } = await supabase
    .from('supervisor_records')
    .update(updated)
    .eq('id', id);

  if (updateError) return initialError(updateError.message);

  for (const field of EDITABLE_FIELDS) {
    const previous = existing[field];
    const next = updated[field];
    if (String(previous ?? '') !== String(next ?? '')) {
      await logAudit(supabase, {
        tableName: 'supervisor_records',
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
