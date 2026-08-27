'use client';

import { useActionState } from 'react';

export interface ActionState {
  error: string | null;
}

const initialState: ActionState = { error: null };

/** A single bound-server-action button for a list row (Approve / Mark as paid). */
export default function InlineActionButton({
  action,
  label,
  pendingLabel,
  variant = 'primary',
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  label: string;
  pendingLabel?: string;
  variant?: 'primary' | 'success';
}) {
  const [state, formAction, pending] = useActionState(action, initialState);

  const className =
    variant === 'success'
      ? 'rounded-md bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60'
      : 'rounded-md bg-slate-900 px-2.5 py-1 text-xs font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60';

  return (
    <form action={formAction} className="flex flex-col items-end gap-1">
      <button type="submit" disabled={pending} className={className}>
        {pending ? (pendingLabel ?? '…') : label}
      </button>
      {state.error && <p className="text-xs text-red-600">{state.error}</p>}
    </form>
  );
}
