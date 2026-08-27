import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, UserRole } from '@/types/database.types';
import type { Profile } from '@/lib/auth';

export interface ResolvedSubmitter {
  staffId: string;
  branchId: string;
}

export type ResolveSubmitterResult =
  | { ok: true; submitter: ResolvedSubmitter }
  | { ok: false; error: string };

/**
 * Every module's submit action needs to know "who is this record for, and
 * what branch". Normally that's just the signed-in submitter — but an Admin
 * can also submit on any staff member's behalf (see
 * supabase/migrations/0008_admin_submits_for_staff.sql for the matching RLS
 * insert policy), in which case the target staff member's own id/branch is
 * used and a `staff_id` field must be present in the form. Either way the
 * inserted record still starts at the default confirmation_status='pending'
 * — an admin-submitted record goes through the same confirm/approve/pay
 * workflow as any other, it's just attributed to the right person.
 */
export async function resolveSubmitter(
  supabase: SupabaseClient<Database>,
  profile: Profile,
  expectedRole: UserRole,
  roleLabel: string,
  formData: FormData
): Promise<ResolveSubmitterResult> {
  if (profile.role === expectedRole) {
    if (!profile.branch_id) {
      return { ok: false, error: 'Your account has no branch assigned yet. Contact an admin.' };
    }
    return { ok: true, submitter: { staffId: profile.id, branchId: profile.branch_id } };
  }

  if (profile.role === 'admin') {
    const staffId = String(formData.get('staff_id') ?? '');
    if (!staffId) return { ok: false, error: `Please select a ${roleLabel}.` };

    const { data: target } = await supabase.from('profiles').select('*').eq('id', staffId).single();
    if (!target || target.role !== expectedRole || !target.is_active) {
      return { ok: false, error: `Selected staff member is not an active ${roleLabel}.` };
    }
    if (!target.branch_id) {
      return { ok: false, error: 'Selected staff member has no branch assigned. Assign one from Admin → Staff first.' };
    }
    return { ok: true, submitter: { staffId: target.id, branchId: target.branch_id } };
  }

  return {
    ok: false,
    error: `Only ${roleLabel} accounts (or an Admin submitting on their behalf) can submit records here.`,
  };
}
