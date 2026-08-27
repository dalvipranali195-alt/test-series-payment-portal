'use client';

import { useActionState, useState } from 'react';

export interface ActionState {
  error: string | null;
}

const initialState: ActionState = { error: null };

export default function ConfirmRejectPanel({
  confirmAction,
  rejectAction,
}: {
  confirmAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
  rejectAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [confirmState, confirmFormAction, confirmPending] = useActionState(confirmAction, initialState);
  const [rejectState, rejectFormAction, rejectPending] = useActionState(rejectAction, initialState);

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-900">Confirmation</h2>
      <p className="mt-1 text-sm text-slate-600">
        Confirm this record if it&rsquo;s correct, or reject it with a reason.
      </p>

      {!rejecting ? (
        <div className="mt-4 flex gap-2">
          <form action={confirmFormAction}>
            <button
              type="submit"
              disabled={confirmPending}
              className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {confirmPending ? 'Confirming…' : 'Confirm'}
            </button>
          </form>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            className="rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50"
          >
            Reject
          </button>
        </div>
      ) : (
        <form action={rejectFormAction} className="mt-4 space-y-2">
          <textarea
            name="reason"
            required
            rows={3}
            placeholder="Reason for rejection"
            className="block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={rejectPending}
              className="rounded-md bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {rejectPending ? 'Rejecting…' : 'Submit rejection'}
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {confirmState.error && <p className="mt-2 text-sm text-red-600">{confirmState.error}</p>}
      {rejectState.error && <p className="mt-2 text-sm text-red-600">{rejectState.error}</p>}
    </div>
  );
}
