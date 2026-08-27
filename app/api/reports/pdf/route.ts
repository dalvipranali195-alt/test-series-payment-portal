import { NextResponse, type NextRequest } from 'next/server';
import { requireStaffOrAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { parseReportFilters } from '@/lib/reports/types';
import { fetchReportRows } from '@/lib/reports/query';
import { buildTablePdf } from '@/lib/pdf/build-pdf';

export async function GET(request: NextRequest) {
  await requireStaffOrAdmin();

  const searchParams = request.nextUrl.searchParams;
  const filters = parseReportFilters({
    branch: searchParams.get('branch') ?? undefined,
    module: searchParams.get('module') ?? undefined,
    staff: searchParams.get('staff') ?? undefined,
    subject: searchParams.get('subject') ?? undefined,
    batch: searchParams.get('batch') ?? undefined,
    confirmation: searchParams.get('confirmation') ?? undefined,
    payment: searchParams.get('payment') ?? undefined,
    from: searchParams.get('from') ?? undefined,
    to: searchParams.get('to') ?? undefined,
  });

  const supabase = await createClient();
  const [rows, branchName] = await Promise.all([
    fetchReportRows(supabase, filters),
    filters.branchId
      ? supabase
          .from('branches')
          .select('name')
          .eq('id', filters.branchId)
          .single()
          .then(({ data }) => data?.name ?? null)
      : Promise.resolve(null),
  ]);

  const filterSummary = [
    branchName ? `Branch: ${branchName}` : null,
    filters.module !== 'all' ? `Module: ${filters.module}` : null,
    filters.confirmationStatus ? `Confirmation: ${filters.confirmationStatus}` : null,
    filters.paymentStatus ? `Payment: ${filters.paymentStatus}` : null,
    filters.from ? `From: ${filters.from}` : null,
    filters.to ? `To: ${filters.to}` : null,
  ]
    .filter(Boolean)
    .join('  |  ');

  const totalAmount = rows.reduce((sum, r) => sum + r.amount, 0);

  const pdfBytes = await buildTablePdf({
    title: 'Payment Report',
    subtitle:
      (filterSummary ? `${filterSummary}  —  ` : '') + `Generated ${new Date().toISOString().slice(0, 10)}`,
    columns: [
      { key: 'date', label: 'Date', width: 60 },
      { key: 'module', label: 'Module', width: 85 },
      { key: 'title', label: 'Title', width: 140 },
      { key: 'branch', label: 'Branch', width: 85 },
      { key: 'staff', label: 'Staff', width: 100 },
      { key: 'subject', label: 'Subject', width: 80 },
      { key: 'batch', label: 'Batch', width: 70 },
      { key: 'amount', label: 'Amount', width: 65, align: 'right' },
      { key: 'confirmation', label: 'Confirmation', width: 75 },
      { key: 'payment', label: 'Payment', width: 70 },
    ],
    rows: rows.map((r) => ({
      date: r.date,
      module: r.moduleLabel,
      title: r.title,
      branch: r.branchName,
      staff: r.staffName,
      subject: r.subjectName,
      batch: r.batchName,
      amount: r.amount.toFixed(2),
      confirmation: r.confirmationStatus,
      payment: r.paymentStatus,
    })),
    totalsLines: [`Total: ${totalAmount.toFixed(2)} across ${rows.length} record${rows.length === 1 ? '' : 's'}`],
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': 'attachment; filename="payment-report.pdf"',
    },
  });
}
