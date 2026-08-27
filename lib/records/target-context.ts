import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, UserRole } from '@/types/database.types';
import type { Profile } from '@/lib/auth';

export type TargetContext =
  | { mode: 'self'; staffId: string; branchId: string }
  | { mode: 'picker'; options: { id: string; name: string }[] }
  | { mode: 'target'; staffId: string; branchId: string; staffName: string }
  | { mode: 'denied'; message: string };

/**
 * Shared "who is this record's new-record page for" logic used by
 * /paper-checker/new, /supervisor/new and /open-day/new. The role that
 * normally submits (expectedRole) always goes straight to their own form
 * ('self'). Admin gets a staff picker first ('picker': no ?staff= yet) and
 * then the same form scoped to that staff member's branch ('target') once
 * one is chosen — matching resolveSubmitter() in
 * lib/records/resolve-submitter.ts, which the actual submit action uses.
 * Anyone else is turned away ('denied').
 */
export async function resolveTargetContext(
  supabase: SupabaseClient<Database>,
  profile: Profile,
  expectedRole: UserRole,
  roleLabel: string,
  selectedStaffId: string | undefined
): Promise<TargetContext> {
  if (profile.role === expectedRole) {
    if (!profile.branch_id) {
      return { mode: 'denied', message: 'Your account has no branch assigned yet. Contact an admin before submitting records.' };
    }
    return { mode: 'self', staffId: profile.id, branchId: profile.branch_id };
  }

  if (profile.role !== 'admin') {
    return {
      mode: 'denied',
      message: `Only ${roleLabel} accounts (or an Admin submitting on their behalf) can submit records here.`,
    };
  }

  if (!selectedStaffId) {
    const { data } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', expectedRole)
      .eq('is_active', true)
      .order('full_name');
    return { mode: 'picker', options: (data ?? []).map((p) => ({ id: p.id, name: p.full_name })) };
  }

  const { data: target } = await supabase.from('profiles').select('*').eq('id', selectedStaffId).single();
  if (!target || target.role !== expectedRole || !target.is_active) {
    return { mode: 'denied', message: 'That staff member is no longer valid — go back and pick again.' };
  }
  if (!target.branch_id) {
    return {
      mode: 'denied',
      message: `${target.full_name} has no branch assigned yet. Assign one from Admin → Staff first.`,
    };
  }
  return { mode: 'target', staffId: target.id, branchId: target.branch_id, staffName: target.full_name };
}
