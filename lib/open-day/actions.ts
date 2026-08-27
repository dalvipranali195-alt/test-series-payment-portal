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
  return '/open-day';
}

function detailPath(id: string) {
  return `/open-day/${id}`;
}

function flatRateFrom(rateConfig: Record<string, unknown> | null): number | null {
  const rate = rateConfig?.rate;
  return typeof rate === 'number' ? rate : null;
}

// ===== Submit (Staff role — see migration 0005_open_day.sql for why there's
// no dedicated "open_day" role) =====

export async function submitOpenDayRecord(
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) return initialError('Not authorized.');
  if (profile.role !== 'staff') {
    return initialError('Only Staff/Coordinator accounts can submit Open Day records.');
  }
  if (!profile.branch_id) {
    return initialError('Your account has no branch assigned yet. Contact an admin.');
  }

  const eventDate = String(formData.get('event_date') ?? '');
  const batchId = String(formData.get('batch_id') ?? '') || null;
  const subjectId = String(formData.get('subject_id') ?? '') || null;
  const eventName = String(formData.get('event_name') ?? '').trim();
  const studentCount = Number(formData.get('student_count'));

  if (!eventDate) return initialError('Event date is required.');
  if (!eventName) return initialError('Event name is required.');
  if (!Number.isInteger(studentCount) || studentCount < 0) {
    return initialError('Student count must be a whole number, 0 or more.');
  }

  const supabase = await createClient();

  const rate = await resolvePaymentRate(supabase, {
    module: 'open_day',
    branchId: profile.branch_id,
    subjectId,
    onDate: eventDate,
  });

  const flatRate = rate ? flatRateFrom(rate.rate_config) : null;
  if (!rate || flatRate == null) {
    return initialError(
      'No Open Day payment rate is configured for this branch yet. Contact an admin.'
    );
  }

  const { data: record, error } = await supabase
    .from('open_day_records')
    .insert({
      event_date: eventDate,
      branch_id: profile.branch_id,
      batch_id: batchId,
      subject_id: subjectId,
      staff_id: profile.id,
      event_name: eventName,
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
    tableName: 'open_day_records',
    recordId: record.id,
    action: 'submitted',
  });

  revalidatePath(listPath());
  redirect(detailPath(record.id));
}

// ===== Confirm / reject (a different Staff member of the same branch, or Admin) =====

export async function confirmOpenDayRecord(id: string): Promise<FormActionState> {
  const profile = await getCurrentProfile();
  if (!profile || !profile.is_active) return initialError('Not authorized.');

  const supabase = await createClient();

  const { data, error } = await supabase
    .from('open_day_records')
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
    tableName: 'open_day_records',
    recordId: id,
    action: 'confirmed',
  });

  revalidatePath(listPath());
  revalidatePath(detailPath(id));
  return { error: null };
}

export async function rejectOpenDayRecord(
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
    .from('open_day_records')
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
    tableName: 'open_day_records',
    recordId: id,
    action: 'rejected',
    reason,
  });

  revalidatePath(listPath());
  revalidatePath(detailPath(id));
  return { error: null };
}

// ===== Approve / mark paid (Admin only) =====

export async function approveOpenDayRecord(id: string): Promise<FormActionState> {
  const admin = await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('open_day_records')
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
    tableName: 'open_day_records',
    recordId: id,
    action: 'approved',
  });

  revalidatePath(listPath());
  revalidatePath(detailPath(id));
  return { error: null };
}

export async function markOpenDayRecordPaid(id: string): Promise<FormActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { data, error } = await supabase
    .from('open_day_records')
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
    tableName: 'open_day_records',
    recordId: id,
    action: 'paid',
  });

  revalidatePath(listPath());
  revalidatePath(detailPath(id));
  return { error: null };
}

// ===== Edit (Admin only) =====

const EDITABLE_FIELDS = [
  'event_date',
  'batch_id',
  'subject_id',
  'event_name',
  'student_count',
  'rate',
] as const;

export async function updateOpenDayRecord(
  id: string,
  _prevState: FormActionState,
  formData: FormData
): Promise<FormActionState> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: existing, error: fetchError } = await supabase
    .from('open_day_records')
    .select('*')
    .eq('id', id)
    .single();

  if (fetchError || !existing) return initialError('Record not found.');
  if (existing.payment_status === 'paid') {
    return initialError('This record has already been paid and can no longer be edited.');
  }

  const eventDate = String(formData.get('event_date') ?? '');
  const batchId = String(formData.get('batch_id') ?? '') || null;
  const subjectId = String(formData.get('subject_id') ?? '') || null;
  const eventName = String(formData.get('event_name') ?? '').trim();
  const studentCount = Number(formData.get('student_count'));
  const rate = Number(formData.get('rate'));

  if (!eventDate) return initialError('Event date is required.');
  if (!eventName) return initialError('Event name is required.');
  if (!Number.isInteger(studentCount) || studentCount < 0) {
    return initialError('Student count must be a whole number, 0 or more.');
  }
  if (!Number.isFinite(rate) || rate < 0) {
    return initialError('Rate must be a valid non-negative number.');
  }

  const updated: Database['public']['Tables']['open_day_records']['Update'] = {
    event_date: eventDate,
    batch_id: batchId,
    subject_id: subjectId,
    event_name: eventName,
    student_count: studentCount,
    rate,
  };

  const { error: updateError } = await supabase
    .from('open_day_records')
    .update(updated)
    .eq('id', id);

  if (updateError) return initialError(updateError.message);

  for (const field of EDITABLE_FIELDS) {
    const previous = existing[field];
    const next = updated[field];
    if (String(previous ?? '') !== String(next ?? '')) {
      await logAudit(supabase, {
        tableName: 'open_day_records',
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
