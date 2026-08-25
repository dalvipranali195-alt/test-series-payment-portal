import Link from 'next/link';
import type { ConfirmationStatus, PaymentStatus } from '@/types/database.types';
import { ConfirmationBadge, PaymentBadge } from './StatusBadge';

export interface PaperCheckerRow {
  id: string;
  testDate: string;
  testName: string;
  subjectName: string;
  batchName: string;
  checkerName: string;
  studentCount: number;
  totalAmount: number;
  confirmationStatus: ConfirmationStatus;
  paymentStatus: PaymentStatus;
}

export default function RecordsTable({
  rows,
  showChecker,
}: {
  rows: PaperCheckerRow[];
  showChecker: boolean;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-slate-500">No records found.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[840px] text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
            <th className="py-2 pr-4">Test date</th>
            <th className="py-2 pr-4">Test</th>
            <th className="py-2 pr-4">Subject</th>
            <th className="py-2 pr-4">Batch</th>
            {showChecker && <th className="py-2 pr-4">Paper checker</th>}
            <th className="py-2 pr-4 text-right">Students</th>
            <th className="py-2 pr-4 text-right">Total</th>
            <th className="py-2 pr-4">Confirmation</th>
            <th className="py-2 pr-4">Payment</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-b border-slate-100">
              <td className="py-2 pr-4 text-slate-600">{row.testDate}</td>
              <td className="py-2 pr-4 text-slate-900">{row.testName}</td>
              <td className="py-2 pr-4 text-slate-600">{row.subjectName}</td>
              <td className="py-2 pr-4 text-slate-600">{row.batchName}</td>
              {showChecker && <td className="py-2 pr-4 text-slate-600">{row.checkerName}</td>}
              <td className="py-2 pr-4 text-right text-slate-600">{row.studentCount}</td>
              <td className="py-2 pr-4 text-right font-medium text-slate-900">
                {row.totalAmount.toFixed(2)}
              </td>
              <td className="py-2 pr-4">
                <ConfirmationBadge status={row.confirmationStatus} />
              </td>
              <td className="py-2 pr-4">
                <PaymentBadge status={row.paymentStatus} />
              </td>
              <td className="py-2 text-right">
                <Link
                  href={`/paper-checker/${row.id}`}
                  className="rounded-md border border-slate-300 px-3 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
