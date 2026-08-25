import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import CreateLookupForm from '@/components/admin/CreateLookupForm';
import EditableNameRow from '@/components/admin/EditableNameRow';

export default async function SubjectsPage() {
  await requireAdmin();

  const supabase = await createClient();
  const { data: subjects } = await supabase
    .from('subjects')
    .select('*')
    .order('name');

  return (
    <div>
      <h1 className="text-2xl font-semibold text-slate-900">Subjects</h1>
      <p className="mt-1 text-sm text-slate-600">
        Subjects are used on Paper Checker records and payment rates.
      </p>

      <div className="mt-6 max-w-md">
        <CreateLookupForm table="subjects" path="/admin/subjects" placeholder="Subject name" />
      </div>

      <div className="mt-8 max-w-md">
        {subjects && subjects.length > 0 ? (
          <table className="w-full">
            <tbody>
              {subjects.map((subject) => (
                <EditableNameRow
                  key={subject.id}
                  table="subjects"
                  path="/admin/subjects"
                  id={subject.id}
                  name={subject.name}
                  isActive={subject.is_active}
                />
              ))}
            </tbody>
          </table>
        ) : (
          <p className="text-sm text-slate-500">No subjects yet.</p>
        )}
      </div>
    </div>
  );
}
