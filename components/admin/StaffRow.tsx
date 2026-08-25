'use client';

import { useActionState, useState } from 'react';
import { updateStaffProfile, type StaffActionState } from '@/lib/admin/staff-actions';
import type { UserRole } from '@/types/database.types';

const initialState: StaffActionState = { error: null };

const ROLE_LABELS: Record<UserRole, string> = {
  admin: 'Admin',
  paper_checker: 'Paper Checker',
  supervisor: 'Supervisor',
  staff: 'Staff / Coordinator',
};

export default function StaffRow({
  id,
  fullName,
  role,
  branchId,
  branchName,
  isActive,
  isSelf,
  branches,
}: {
  id: string;
  fullName: string;
  role: UserRole;
  branchId: string | null;
  branchName: string;
  isActive: boolean;
  isSelf: boolean;
  branches: { id: string; name: string }[];
}) {
  const [editing, setEditing] = useState(false);
  const updateAction = updateStaffProfile.bind(null, id);
  const [state, formAction, pending] = useActionState(updateAction, initialState);

  if (editing) {
    return (
      <tr className="border-b border-slate-100">
        <td className="py-2 pr-4 text-sm text-slate-900">{fullName}</td>
        <td className="py-2 pr-4" colSpan={3}>
          <form action={formAction} className="flex flex-wrap items-center gap-2">
            <select
              name="role"
              defaultValue={role}
              disabled={isSelf}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            <select
              name="branch_id"
              defaultValue={branchId ?? ''}
              className="rounded-md border border-slate-300 px-2 py-1 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            >
              <option value="">No branch</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <label className="flex items-center gap-1 text-sm text-slate-700">
              <input
                type="checkbox"
                name="is_active"
                defaultChecked={isActive}
                disabled={isSelf}
              />
              Active
            </label>
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
        {fullName}
        {isSelf && <span className="ml-2 text-xs text-slate-400">(you)</span>}
      </td>
      <td className="py-2 pr-4 text-sm text-slate-600">{ROLE_LABELS[role]}</td>
      <td className="py-2 pr-4 text-sm text-slate-600">{branchName}</td>
      <td className="py-2 pr-4">
        {isActive ? (
          <span className="rounded-full bg-green-100 px-2 py-0.5 text-xs text-green-700">
            active
          </span>
        ) : (
          <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs text-slate-600">
            pending
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
      </td>
    </tr>
  );
}
