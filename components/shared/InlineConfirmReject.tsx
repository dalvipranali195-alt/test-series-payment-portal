'use client';

import { useActionState, useState } from 'react';

export interface ActionState {
  error: string | null;
}

const initialState: ActionState = { error: null };

/**
 * Compact confirm/reject actions for a list row (the Confirmation Queue).
 * Same bound-action props as components/shared/ConfirmRejectPanel, just
 * without the card wrapper — that one is sized for a record detail page.
 */
export default function InlineConfirmReject({
  confirmAction,
  rejectAction,
}: {
  confirmAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
  rejectAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
}) {
  const [rejecting, setRejecting] = useState(false);
  const [confirmState, confirmFormAction, confirmPending] = useActionState(confirmAction, initialState);
  const [rejectState, rejectFormAction, rejectPending] = useActionState(rejectAction, initialState);

  if (rejecting) {
    return (
      <form action={rejectFormAction} className="flex flex-col items-end gap-1">
        <div className="flex items-center gap-1">
          <input
            name="reason"
            required
            placeholder="Reason for rejection"
            className="w-48 rounded-md border border-slate-300 px-2 py-1 text-xs shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
          <button
            type="submit"
            disabled={rejectPending}
            className="rounded-md bg-red-600 px-2 py-1 text-xs font-semibold text-white hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {rejectPending ? '…' : 'Submit'}
          </button>
          <button
            type="button"
            onClick={() => setRejecting(false)}
            className="rounded-md border border-slate-300 px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
          >
            Cancel
          </button>
        </div>
        {rejectState.error && <p className="text-xs text-red-600">{rejectState.error}</p>}
      </form>
    );
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-1">
        <form action={confirmFormAction}>
          <button
            type="submit"
            disabled={confirmPending}
            className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {confirmPending ? '…' : 'Confirm'}
          </button>
        </form>
        <button
          type="button"
          onClick={() => setRejecting(true)}
          className="rounded-md border border-red-300 px-2.5 py-1 text-xs font-medium text-red-700 hover:bg-red-50"
        >
          Reject
        </button>
      </div>
      {confirmState.error && <p className="text-xs text-red-600">{confirmState.error}</p>}
    </div>
  );
}
