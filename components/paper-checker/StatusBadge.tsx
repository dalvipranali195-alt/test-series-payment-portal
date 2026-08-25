import type { ConfirmationStatus, PaymentStatus } from '@/types/database.types';

const CONFIRMATION_STYLES: Record<ConfirmationStatus, string> = {
  pending: 'bg-amber-100 text-amber-700',
  confirmed: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-700',
};

const CONFIRMATION_LABELS: Record<ConfirmationStatus, string> = {
  pending: 'Pending confirmation',
  confirmed: 'Confirmed',
  rejected: 'Rejected',
};

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  pending: 'bg-slate-100 text-slate-600',
  pending_admin_approval: 'bg-blue-100 text-blue-700',
  approved: 'bg-indigo-100 text-indigo-700',
  paid: 'bg-emerald-100 text-emerald-700',
};

const PAYMENT_LABELS: Record<PaymentStatus, string> = {
  pending: 'Payment pending',
  pending_admin_approval: 'Awaiting admin approval',
  approved: 'Approved',
  paid: 'Paid',
};

function Badge({ className, children }: { className: string; children: string }) {
  return (
    <span className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {children}
    </span>
  );
}

export function ConfirmationBadge({ status }: { status: ConfirmationStatus }) {
  return <Badge className={CONFIRMATION_STYLES[status]}>{CONFIRMATION_LABELS[status]}</Badge>;
}

export function PaymentBadge({ status }: { status: PaymentStatus }) {
  return <Badge className={PAYMENT_STYLES[status]}>{PAYMENT_LABELS[status]}</Badge>;
}
