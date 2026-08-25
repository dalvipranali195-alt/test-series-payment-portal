import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import CreateBatchForm from '@/components/admin/CreateBatchForm';
import BatchRow from '@/components/admin/BatchRow';

export default async function BatchesPage() {
  await requireAdmin();

  const supabase = await createClient();
  const [{ data: batches }, { data: allBranches }, { data: activeBranches }] = await Promise.all([
    supabase.from('batches').select('*').order('name'),
    supabase.from('branches').select('id, name'),
    supabase.from('branches').select('id, name').eq('is_active', true).order('name'),
  ]);

  const branchOptions = activeBranches ?? [];
  const branchNameById = new Map((allBranches ?? []).map((b) => [b.id, b.name]));

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Batches</h1>
      <p className="mt-1 text-sm text-slate-600">Batches belong to a branch.</p>

      <div className="mt-6 max-w-2xl">
        {branchOptions.length > 0 ? (
          <CreateBatchForm branches={branchOptions} />
        ) : (
          <p className="text-sm text-amber-600">
            Add at least one active branch before creating batches.
          </p>
        )}
      </div>

      <div className="mt-8 max-w-2xl">
        {batches && batches.length > 0 ? (
          <table className="w-full">
            <tbody>
              {batches.map((batch) => (
                <BatchRow
                  key={batch.id}
                  id={batch.id}
                  name={batch.name}
                  branchId={batch.branch_id}
                  branchName={(batch.branch_id && branchNameById.get(batch.branch_id)) || '—'}
                  isActive={batch.is_active}
                  branches={branchOptions}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">No batches yet.</p>
        )}
      </div>
    </div>
  );
}
