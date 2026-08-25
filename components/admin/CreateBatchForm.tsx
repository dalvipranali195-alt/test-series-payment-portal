'use client';

import { useActionState, useRef, useEffect } from 'react';
import { createBatch, type BatchActionState } from '@/lib/admin/batch-actions';

const initialState: BatchActionState = { error: null };

export default function CreateBatchForm({
  branches,
}: {
  branches: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createBatch, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="flex items-start gap-2">
      <input
        name="name"
        type="text"
        required
        placeholder="Batch name"
        className="block flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
      <select
        name="branch_id"
        required
        defaultValue=""
        className="block rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      >
        <option value="" disabled>
          Select branch
        </option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Adding…' : 'Add'}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
