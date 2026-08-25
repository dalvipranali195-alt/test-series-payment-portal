import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import InviteStaffForm from '@/components/admin/InviteStaffForm';
import StaffRow from '@/components/admin/StaffRow';

export default async function StaffPage() {
  const currentAdmin = await requireAdmin();

  const supabase = await createClient();
  const [{ data: profiles }, { data: branches }] = await Promise.all([
    supabase.from('profiles').select('*').order('full_name'),
    supabase.from('branches').select('id, name').eq('is_active', true).order('name'),
  ]);

  const branchOptions = branches ?? [];
  const branchNameById = new Map(branchOptions.map((b) => [b.id, b.name]));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Staff</h1>
      <p className="mt-1 text-sm text-slate-600">
        Invite new staff by email, then assign their role, branch, and activate their
        account. New sign-ups start inactive with a placeholder &quot;Staff&quot; role until
        an admin sets them up here.
      </p>

      <div className="mt-6">
        <InviteStaffForm />
      </div>

      <div className="mt-8 overflow-x-auto">
        {profiles && profiles.length > 0 ? (
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="py-2 pr-4">Name</th>
                <th className="py-2 pr-4">Role</th>
                <th className="py-2 pr-4">Branch</th>
                <th className="py-2 pr-4">Status</th>
                <th className="py-2" />
              </tr>
            </thead>
            <tbody>
              {profiles.map((profile) => (
                <StaffRow
                  key={profile.id}
                  id={profile.id}
                  fullName={profile.full_name}
                  role={profile.role}
                  branchId={profile.branch_id}
                  branchName={(profile.branch_id && branchNameById.get(profile.branch_id)) || '—'}
                  isActive={profile.is_active}
                  isSelf={profile.id === currentAdmin.id}
                  branches={branchOptions}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">No staff yet.</p>
        )}
      </div>
    </div>
  );
}
