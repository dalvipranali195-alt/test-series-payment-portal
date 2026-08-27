'use client';

import { useActionState, useMemo, useState } from 'react';
import { submitSupervisorRecord, type FormActionState } from '@/lib/supervisor/actions';
import { supervisorTotal } from '@/lib/calculations';

const initialState: FormActionState = { error: null };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function SupervisorForm({
  batches,
  subjects,
  ratesBySubject,
  staffId,
}: {
  batches: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  ratesBySubject: Record<string, number | undefined>;
  staffId?: string;
}) {
  const [state, formAction, pending] = useActionState(submitSupervisorRecord, initialState);
  const [subjectId, setSubjectId] = useState('');
  const [studentCount, setStudentCount] = useState('');

  const preview = useMemo(() => {
    const rate = subjectId ? ratesBySubject[subjectId] : undefined;
    const count = Number(studentCount);
    if (rate == null || !Number.isFinite(count) || count < 0 || studentCount === '') return null;

    return { rate, total: supervisorTotal(count, rate) };
  }, [subjectId, studentCount, ratesBySubject]);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      {staffId && <input type="hidden" name="staff_id" value={staffId} />}
      <div>
        <label className="block text-sm font-medium text-slate-700">Work date</label>
        <input
          name="work_date"
          type="date"
          required
          defaultValue={todayISO()}
          className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Batch</label>
          <select
            name="batch_id"
            required
            defaultValue=""
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="" disabled>
              Select batch
            </option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Subject</label>
          <select
            name="subject_id"
            required
            value={subjectId}
            onChange={(e) => setSubjectId(e.target.value)}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="" disabled>
              Select subject
            </option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Duty description</label>
        <input
          name="duty_description"
          type="text"
          required
          placeholder="e.g. Invigilation, Hall A"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Student count</label>
        <input
          name="student_count"
          type="number"
          min="0"
          step="1"
          required
          value={studentCount}
          onChange={(e) => setStudentCount(e.target.value)}
          className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div className="rounded-md border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
        {subjectId && ratesBySubject[subjectId] == null && (
          <p className="text-amber-600">
            No payment rate is configured for this subject yet — an admin needs to add one
            before this can be submitted.
          </p>
        )}
        {preview ? (
          <p className="text-slate-700">
            Estimated total: <span className="font-semibold text-slate-900">{preview.total.toFixed(2)}</span>{' '}
            ({preview.rate}/student). The final amount is calculated by the server when you submit.
          </p>
        ) : (
          <p className="text-slate-500">
            Select a subject and enter a student count to see an estimated total.
          </p>
        )}
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Submitting…' : 'Submit record'}
      </button>
    </form>
  );
}
