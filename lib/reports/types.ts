import type { ConfirmationStatus, PaymentStatus } from '@/types/database.types';

export type ReportModule = 'all' | 'paper_checker' | 'supervisor' | 'open_day';

export interface ReportFilters {
  branchId?: string;
  module: ReportModule;
  staffId?: string;
  subjectId?: string;
  batchId?: string;
  confirmationStatus?: ConfirmationStatus;
  paymentStatus?: PaymentStatus;
  from?: string;
  to?: string;
}

export interface ReportRow {
  id: string;
  module: Exclude<ReportModule, 'all'>;
  moduleLabel: 'Paper Checker' | 'Supervisor' | 'Open Day';
  date: string;
  title: string;
  branchName: string;
  staffName: string;
  subjectName: string;
  batchName: string;
  amount: number;
  confirmationStatus: ConfirmationStatus;
  paymentStatus: PaymentStatus;
  detailHref: string;
}

export interface RawFilterInput {
  branch?: string;
  module?: string;
  staff?: string;
  subject?: string;
  batch?: string;
  confirmation?: string;
  payment?: string;
  from?: string;
  to?: string;
}

const CONFIRMATION_VALUES: ConfirmationStatus[] = ['pending', 'confirmed', 'rejected'];
const PAYMENT_VALUES: PaymentStatus[] = ['pending', 'pending_admin_approval', 'approved', 'paid'];

export function parseReportFilters(raw: RawFilterInput): ReportFilters {
  const reportModule: ReportModule =
    raw.module === 'paper_checker' || raw.module === 'supervisor' || raw.module === 'open_day'
      ? raw.module
      : 'all';

  return {
    branchId: raw.branch || undefined,
    module: reportModule,
    staffId: raw.staff || undefined,
    subjectId: raw.subject || undefined,
    batchId: raw.batch || undefined,
    confirmationStatus: CONFIRMATION_VALUES.includes(raw.confirmation as ConfirmationStatus)
      ? (raw.confirmation as ConfirmationStatus)
      : undefined,
    paymentStatus: PAYMENT_VALUES.includes(raw.payment as PaymentStatus)
      ? (raw.payment as PaymentStatus)
      : undefined,
    from: raw.from || undefined,
    to: raw.to || undefined,
  };
}
