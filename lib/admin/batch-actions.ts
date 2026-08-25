'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

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
  const { error } = await supabase.from('batches').insert({ name, branch_id: branchId });
  if (error) return { error: error.message };

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
  const { error } = await supabase
    .from('batches')
    .update({ name, branch_id: branchId })
    .eq('id', id);
  if (error) return { error: error.message };

  revalidatePath(PATH);
  return { error: null };
}

export async function setBatchActive(id: string, isActive: boolean) {
  await requireAdmin();

  const supabase = await createClient();
  await supabase.from('batches').update({ is_active: isActive }).eq('id', id);
  revalidatePath(PATH);
}
