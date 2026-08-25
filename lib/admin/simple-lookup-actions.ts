'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { requireAdmin } from '@/lib/auth';

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
  const { error } = await supabase.from(table).insert({ name });
  if (error) return { error: friendlyError(error.message) };

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
  const { error } = await supabase.from(table).update({ name }).eq('id', id);
  if (error) return { error: friendlyError(error.message) };

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
  revalidatePath(path);
}
