'use client';

import { useActionState, useState } from 'react';
import {
  renameLookup,
  setLookupActive,
  type LookupActionState,
  type SimpleLookupTable,
} from '@/lib/admin/simple-lookup-actions';

const initialState: LookupActionState = { error: null };

export default function EditableNameRow({
  table,
  path,
  id,
  name,
  isActive,
}: {
  table: SimpleLookupTable;
  path: string;
  id: string;
  name: string;
  isActive: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const renameAction = renameLookup.bind(null, table, path, id);
  const [state, formAction, pending] = useActionState(renameAction, initialState);
  const toggleActive = setLookupActive.bind(null, table, path, id, !isActive);

  if (editing) {
    return (
      <tr className="border-b border-slate-100">
        <td className="py-2 pr-4" colSpan={2}>
          <form action={formAction} className="flex items-center gap-2">
            <input
              name="name"
              type="text"
              defaultValue={name}
              autoFocus
              required
              className="block w-full rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-slate-900 px-3 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-60"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          </form>
          {state.error && <p className="mt-1 text-sm text-red-600">{state.error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-b border-slate-100">
      <td className="py-2 pr-4 text-sm text-slate-900">
        {name}
        {!isActive && (
          <span className="ml-2 rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
            inactive
          </span>
        )}
      </td>
      <td className="py-2 text-right">
        <button
          onClick={() => setEditing(true)}
          className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
        >
          Edit
        </button>
        <form action={toggleActive} className="ml-2 inline">
          <button
            type="submit"
            className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            {isActive ? 'Deactivate' : 'Activate'}
          </button>
        </form>
      </td>
    </tr>
  );
}
