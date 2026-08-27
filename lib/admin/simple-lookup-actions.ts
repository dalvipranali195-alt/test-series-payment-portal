'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';
import { logAudit } from '@/lib/audit';

export type SimpleLookupTable = 'branches' | 'subjects';

export interface LookupActionState {
  error: string | null;
}

function friendlyError(message: string): string {
  return message.includes('duplicate key') ? 'That name already exists.' : message;
}

export async function createLookup(
  table: SimpleLookupTable,
  path: string,
  _prevState: LookupActionState,
  formData: FormData
): Promise<LookupActionState> {
  await requireAdmin();

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Name is required.' };

  const supabase = await createClient();
  const { data, error } = await supabase.from(table).insert({ name }).select('id').single();
  if (error || !data) return { error: friendlyError(error?.message ?? 'Failed to create.') };

  await logAudit(supabase, { tableName: table, recordId: data.id, action: 'created', newValue: name });

  revalidatePath(path);
  return { error: null };
}

export async function renameLookup(
  table: SimpleLookupTable,
  path: string,
  id: string,
  _prevState: LookupActionState,
  formData: FormData
): Promise<LookupActionState> {
  await requireAdmin();

  const name = String(formData.get('name') ?? '').trim();
  if (!name) return { error: 'Name is required.' };

  const supabase = await createClient();
  const { data: existing } = await supabase.from(table).select('name').eq('id', id).single();

  const { error } = await supabase.from(table).update({ name }).eq('id', id);
  if (error) return { error: friendlyError(error.message) };

  if (existing && existing.name !== name) {
    await logAudit(supabase, {
      tableName: table,
      recordId: id,
      action: 'edited',
      fieldChanged: 'name',
      previousValue: existing.name,
      newValue: name,
    });
  }

  revalidatePath(path);
  return { error: null };
}

export async function setLookupActive(
  table: SimpleLookupTable,
  path: string,
  id: string,
  isActive: boolean
) {
  await requireAdmin();

  const supabase = await createClient();
  await supabase.from(table).update({ is_active: isActive }).eq('id', id);
  await logAudit(supabase, {
    tableName: table,
    recordId: id,
    action: isActive ? 'activated' : 'deactivated',
    fieldChanged: 'is_active',
    newValue: String(isActive),
  });
  revalidatePath(path);
}
