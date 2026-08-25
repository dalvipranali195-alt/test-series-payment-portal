'use client';

import { useActionState, useRef, useState, useEffect } from 'react';
import { createPaymentRate, type PaymentRateActionState } from '@/lib/admin/payment-rate-actions';
import type { PaymentRateModule } from '@/types/database.types';

const initialState: PaymentRateActionState = { error: null };

const MODULE_LABELS: Record<PaymentRateModule, string> = {
  paper_checker: 'Paper Checker',
  supervisor: 'Supervisor',
  open_day: 'Open Day',
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function CreatePaymentRateForm({
  branches,
  subjects,
}: {
  branches: { id: string; name: string }[];
  subjects: { id: string; name: string }[];
}) {
  const [state, formAction, pending] = useActionState(createPaymentRate, initialState);
  const [module, setModule] = useState<PaymentRateModule>('paper_checker');
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (!pending && !state.error) {
      formRef.current?.reset();
    }
  }, [pending, state.error]);

  return (
    <form ref={formRef} action={formAction} className="max-w-xl space-y-4 rounded-md border border-slate-200 p-4">
      <div>
        <label className="block text-sm font-medium text-slate-700">Module</label>
        <select
          name="module"
          value={module}
          onChange={(e) => setModule(e.target.value as PaymentRateModule)}
          className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        >
          {Object.entries(MODULE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700">Branch</label>
          <select
            name="branch_id"
            defaultValue=""
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">All branches</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700">Subject</label>
          <select
            name="subject_id"
            defaultValue=""
            className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          >
            <option value="">All subjects</option>
            {subjects.map((subject) => (
              <option key={subject.id} value={subject.id}>
                {subject.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {module === 'paper_checker' ? (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-700">Per-paper price</label>
            <input
              name="per_paper_price"
              type="number"
              step="0.01"
              min="0"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700">Answer key price</label>
            <input
              name="answer_key_price"
              type="number"
              step="0.01"
              min="0"
              required
              className="mt-1 block w-full rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
            />
          </div>
        </div>
      ) : (
        <div>
          <label className="block text-sm font-medium text-slate-700">
            Rate (per student{module === 'open_day' ? ' / unit' : ''})
          </label>
          <input
            name="rate"
            type="number"
            step="0.01"
            min="0"
            required
            className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-slate-700">Effective date</label>
        <input
          name="effective_date"
          type="date"
          required
          defaultValue={todayISO()}
          className="mt-1 block w-full max-w-xs rounded-md border border-slate-300 px-3 py-2 text-sm shadow-sm focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500"
        />
      </div>

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Adding…' : 'Add rate'}
      </button>
    </form>
  );
}
