'use client';

import { useActionState, useRef, useEffect } from 'react';
import { inviteStaffMember, type StaffActionState } from '@/lib/admin/staff-actions';

const initialState: StaffActionState = { error: null };

export default function InviteStaffForm() {
  const [state, formAction, pending] = useActionState(inviteStaffMember, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="flex max-w-xl items-start gap-2">
      <input
        name="full_name"
        type="text"
        required
        placeholder="Full name"
        className="block flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
      <input
        name="email"
        type="email"
        required
        placeholder="Email address"
        className="block flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
      />
      <button
        type="submit"
        disabled={pending}
        className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Sending…' : 'Send invite'}
      </button>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
