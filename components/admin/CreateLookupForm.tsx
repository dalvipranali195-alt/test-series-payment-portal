'use client';

import { useActionState, useRef, useEffect } from 'react';
import { createLookup, type LookupActionState, type SimpleLookupTable } from '@/lib/admin/simple-lookup-actions';

const initialState: LookupActionState = { error: null };

export default function CreateLookupForm({
  table,
  path,
  placeholder,
}: {
  table: SimpleLookupTable;
  path: string;
  placeholder: string;
}) {
  const action = createLookup.bind(null, table, path);
  const [state, formAction, pending] = useActionState(action, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="flex items-start gap-2">
      <div className="flex-1">
        <input
          name="name"
          type="text"
          required
          placeholder={placeholder}
          className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
        {state.error && <p className="mt-1 text-sm text-red-600">{state.error}</p>}
      </div>
      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Adding…' : 'Add'}
      </button>
    </form>
  );
}
