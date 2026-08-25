'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@/lib/supabase/server';
import { createAdminClient } from '@/lib/supabase/admin';
import { requireAdmin } from '@/lib/auth';
import type { UserRole } from '@/types/database.types';

export interface StaffActionState {
  error: string | null;
}

const PATH = '/admin/staff';
const ROLES: UserRole[] = ['admin', 'paper_checker', 'supervisor', 'staff'];

export async function inviteStaffMember(
  _prevState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  await requireAdmin();

  const email = String(formData.get('email') ?? '').trim();
  const fullName = String(formData.get('full_name') ?? '').trim();

  if (!email) return { error: 'Email is required.' };
  if (!fullName) return { error: 'Full name is required.' };

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.inviteUserByEmail(email, {
    data: { full_name: fullName },
  });

  if (error) return { error: error.message };

  revalidatePath(PATH);
  return { error: null };
}

export async function updateStaffProfile(
  id: string,
  _prevState: StaffActionState,
  formData: FormData
): Promise<StaffActionState> {
  const currentAdmin = await requireAdmin();

  const role = String(formData.get('role') ?? '') as UserRole;
  const branchId = String(formData.get('branch_id') ?? '') || null;
  const isActive = formData.get('is_active') === 'on';

  if (!ROLES.includes(role)) return { error: 'Invalid role.' };

  if (id === currentAdmin.id && (role !== 'admin' || !isActive)) {
    return { error: "You can't remove your own admin access or deactivate yourself." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({ role, branch_id: branchId, is_active: isActive })
    .eq('id', id);

  if (error) return { error: error.message };

  revalidatePath(PATH);
  return { error: null };
}
