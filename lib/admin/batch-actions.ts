'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export interface BatchActionState {
  error: string | null;
}

const PATH = '/admin/batches';

export async function createBatch(
  _prevState: BatchActionState,
  formData: FormData
): Promise<BatchActionState> {
  await requireAdmin();

  const name = String(formData.get('name') ?? '').trim();
  const branchId = String(formData.get('branch_id') ?? '');

  if (!name) return { error: 'Name is required.' };
  if (!branchId) return { error: 'Branch is required.' };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('batches')
    .insert({ name, branch_id: branchId })
    .select('id')
    .single();
  if (error || !data) return { error: error?.message ?? 'Failed to create batch.' };

  await logAudit(supabase, { tableName: 'batches', recordId: data.id, action: 'created', newValue: name });

  revalidatePath(PATH);
  return { error: null };
}

export async function updateBatch(
  id: string,
  _prevState: BatchActionState,
  formData: FormData
): Promise<BatchActionState> {
  await requireAdmin();

  const name = String(formData.get('name') ?? '').trim();
  const branchId = String(formData.get('branch_id') ?? '');

  if (!name) return { error: 'Name is required.' };
  if (!branchId) return { error: 'Branch is required.' };

  const supabase = await createClient();
  const { data: existing } = await supabase.from('batches').select('name, branch_id').eq('id', id).single();

  const { error } = await supabase
    .from('batches')
    .update({ name, branch_id: branchId })
    .eq('id', id);
  if (error) return { error: error.message };

  if (existing) {
    if (existing.name !== name) {
      await logAudit(supabase, {
        tableName: 'batches',
        recordId: id,
        action: 'edited',
        fieldChanged: 'name',
        previousValue: existing.name,
        newValue: name,
      });
    }
    if (existing.branch_id !== branchId) {
      await logAudit(supabase, {
        tableName: 'batches',
        recordId: id,
        action: 'edited',
        fieldChanged: 'branch_id',
        previousValue: existing.branch_id ?? '',
        newValue: branchId,
      });
    }
  }

  revalidatePath(PATH);
  return { error: null };
}

export async function setBatchActive(id: string, isActive: boolean) {
  await requireAdmin();

  const supabase = await createClient();
  await supabase.from('batches').update({ is_active: isActive }).eq('id', id);
  await logAudit(supabase, {
    tableName: 'batches',
    recordId: id,
    action: isActive ? 'activated' : 'deactivated',
    fieldChanged: 'is_active',
    newValue: String(isActive),
  });
  revalidatePath(PATH);
}
