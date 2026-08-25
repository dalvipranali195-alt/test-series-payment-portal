'use client';

import { useActionState, useState } from 'react';
import { updatePaperCheckerRecord, type FormActionState } from '@/lib/paper-checker/actions';

const initialState: FormActionState = { error: null };

export default function EditRecordForm({
  id,
  batches,
  subjects,
  record,
}: {
  id: string;
  batches: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
  record: {
    test_date: string;
    batch_id: string;
    subject_id: string;
    test_name: string;
    student_count: number;
    test_marks: number | null;
    per_paper_price: number;
    answer_key_price: number;
  };
}) {
  const [editing, setEditing] = useState(false);
  const updateAction = updatePaperCheckerRecord.bind(null, id);
  const [state, formAction, pending] = useActionState(updateAction, initialState);

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
      >
        Edit record
      </button>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-md border border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-900">Edit record</h2>

      <div>
        <label className="block text-sm font-medium text-slate-700">Test date</label>
        <input
          name="test_date"
          type="date"
          required
          defaultValue={record.test_date}
          className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Batch</label>
          <select
            name="batch_id"
            required
            defaultValue={record.batch_id}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
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
            defaultValue={record.subject_id}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700">Test name</label>
        <input
          name="test_name"
          type="text"
          required
          defaultValue={record.test_name}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Student count</label>
          <input
            name="student_count"
            type="number"
            min="0"
            step="1"
            required
            defaultValue={record.student_count}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Test marks</label>
          <input
            name="test_marks"
            type="number"
            min="0"
            step="1"
            defaultValue={record.test_marks ?? ''}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Per-paper price</label>
          <input
            name="per_paper_price"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={record.per_paper_price}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-700">Answer key price</label>
          <input
            name="answer_key_price"
            type="number"
            min="0"
            step="0.01"
            required
            defaultValue={record.answer_key_price}
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {pending ? 'Saving…' : 'Save changes'}
        </button>
        <button
          type="button"
          onClick={() => setEditing(false)}
          className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
