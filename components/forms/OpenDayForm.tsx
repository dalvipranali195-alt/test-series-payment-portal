'use client';

import { useActionState, useMemo, useState } from 'react';
import { submitOpenDayRecord, type FormActionState } from '@/lib/open-day/actions';
import { openDayTotal } from '@/lib/calculations';

const initialState: FormActionState = { error: null };

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function OpenDayForm({
  batches,
  subjects,
  branchRate,
}: {
  batches: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  branchRate: number | null;
}) {
  const [state, formAction, pending] = useActionState(submitOpenDayRecord, initialState);
  const [studentCount, setStudentCount] = useState('');

  const preview = useMemo(() => {
    const count = Number(studentCount);
    if (branchRate == null || !Number.isFinite(count) || count < 0 || studentCount === '') return null;
    return { rate: branchRate, total: openDayTotal(count, branchRate) };
  }, [studentCount, branchRate]);

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Event date</label>
        <input
          name="event_date"
          type="date"
          required
          defaultValue={todayISO()}
          className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Event name</label>
        <input
          name="event_name"
          type="text"
          required
          placeholder="e.g. August Open Day"
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Batch (optional)</label>
          <select
            name="batch_id"
            defaultValue=""
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Not batch-specific</option>
            {batches.map((batch) => (
              <option key={batch.id} value={batch.id}>
                {batch.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Subject (optional)</label>
          <select
            name="subject_id"
            defaultValue=""
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">Not subject-specific</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
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
        {branchRate == null && (
          <p className="text-amber-600">
            No Open Day payment rate is configured for your branch yet — an admin needs to add
            one before this can be submitted.
          </p>
        )}
        {preview ? (
          <p className="text-slate-700">
            Estimated total: <span className="font-semibold text-slate-900">{preview.total.toFixed(2)}</span>{' '}
            ({preview.rate}/student). The final amount is calculated by the server when you submit.
          </p>
        ) : branchRate != null ? (
          <p className="text-slate-500">Enter a student count to see an estimated total.</p>
        ) : null}
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
