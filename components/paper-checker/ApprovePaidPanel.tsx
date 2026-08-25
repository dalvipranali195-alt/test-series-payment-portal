'use client';

import { useActionState } from 'react';
import {
  approvePaperCheckerRecord,
  markPaperCheckerRecordPaid,
  type FormActionState,
} from '@/lib/paper-checker/actions';
import type { PaymentStatus } from '@/types/database.types';

const initialState: FormActionState = { error: null };

export default function ApprovePaidPanel({
  id,
  paymentStatus,
}: {
  id: string;
  paymentStatus: PaymentStatus;
}) {
  const approveAction = approvePaperCheckerRecord.bind(null, id);
  const markPaidAction = markPaperCheckerRecordPaid.bind(null, id);
  const [approveState, approveFormAction, approvePending] = useActionState(approveAction, initialState);
  const [paidState, paidFormAction, paidPending] = useActionState(markPaidAction, initialState);

  if (paymentStatus !== 'pending_admin_approval' && paymentStatus !== 'approved') {
    return null;
  }

  return (
    <div className="rounded-md border border-slate-200 p-4">
      <h2 className="text-sm font-semibold text-slate-900">Payment</h2>

      {paymentStatus === 'pending_admin_approval' && (
        <form action={approveFormAction} className="mt-4">
          <button
            type="submit"
            disabled={approvePending}
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {approvePending ? 'Approving…' : 'Approve for payment'}
          </button>
          {approveState.error && <p className="mt-2 text-sm text-red-600">{approveState.error}</p>}
        </form>
      )}

      {paymentStatus === 'approved' && (
        <form action={paidFormAction} className="mt-4">
          <button
            type="submit"
            disabled={paidPending}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {paidPending ? 'Marking paid…' : 'Mark as paid'}
          </button>
          {paidState.error && <p className="mt-2 text-sm text-red-600">{paidState.error}</p>}
        </form>
      )}
    </div>
  );
}
