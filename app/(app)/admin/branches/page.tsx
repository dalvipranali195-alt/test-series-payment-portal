import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import CreateLookupForm from '@/components/admin/CreateLookupForm';
import EditableNameRow from '@/components/admin/EditableNameRow';

export default async function BranchesPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: branches } = await supabase
    .from('branches')
    .select('*')
    .order('name');

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Branches</h1>
      <p className="mt-1 text-sm text-slate-600">
        Branches are used to scope batches, staff, and payment rates.
      </p>

      <div className="mt-6 max-w-md">
        <CreateLookupForm table="branches" path="/admin/branches" placeholder="Branch name" />
      </div>

      <div className="mt-8 max-w-md">
        {branches && branches.length > 0 ? (
          <table className="w-full">
            <tbody>
              {branches.map((branch) => (
                <EditableNameRow
                  key={branch.id}
                  table="branches"
                  path="/admin/branches"
                  id={branch.id}
                  name={branch.name}
                  isActive={branch.is_active}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">No branches yet.</p>
        )}
      </div>
    </div>
  );
}
