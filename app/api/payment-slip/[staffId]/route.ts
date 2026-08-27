import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { createClient } from '@/lib/supabase/server';
import { buildTablePdf } from '@/lib/pdf/build-pdf';

export async function GET(_request: Request, { params }: { params: Promise<{ staffId: string }> }) {
  await requireAdmin();
  const { staffId } = await params;

  const supabase = await createClient();

  const [{ data: staff }, { data: checkerRecords }, { data: supervisorRecords }, { data: openDayRecords }] =
    await Promise.all([
      supabase.from('profiles').select('*').eq('id', staffId).single(),
      supabase
        .from('paper_checker_records')
        .select('*')
        .eq('paper_checker_id', staffId)
        .eq('payment_status', 'approved'),
      supabase
        .from('supervisor_records')
        .select('*')
        .eq('supervisor_id', staffId)
        .eq('payment_status', 'approved'),
      supabase.from('open_day_records').select('*').eq('staff_id', staffId).eq('payment_status', 'approved'),
    ]);

  if (!staff) {
    return NextResponse.json({ error: 'Staff member not found.' }, { status: 404 });
  }

  const rows = [
    ...(checkerRecords ?? []).map((r) => ({
      date: r.test_date,
      module: 'Paper Checker',
      description: r.test_name,
      amount: r.total_amount.toFixed(2),
    })),
    ...(supervisorRecords ?? []).map((r) => ({
      date: r.work_date,
      module: 'Supervisor',
      description: r.duty_description,
      amount: r.total_amount.toFixed(2),
    })),
    ...(openDayRecords ?? []).map((r) => ({
      date: r.event_date,
      module: 'Open Day',
      description: r.event_name,
      amount: r.total_amount.toFixed(2),
    })),
  ].sort((a, b) => a.date.localeCompare(b.date));

  const total = [...(checkerRecords ?? []), ...(supervisorRecords ?? []), ...(openDayRecords ?? [])].reduce(
    (sum, r) => sum + Number(r.total_amount ?? 0),
    0
  );

  const pdfBytes = await buildTablePdf({
    title: 'Payment Slip',
    subtitle: `${staff.full_name} — Generated ${new Date().toISOString().slice(0, 10)}`,
    columns: [
      { key: 'date', label: 'Date', width: 90 },
      { key: 'module', label: 'Module', width: 110 },
      { key: 'description', label: 'Description', width: 460 },
      { key: 'amount', label: 'Amount', width: 100, align: 'right' },
    ],
    rows,
    totalsLines: [`Total payable: ${total.toFixed(2)}`],
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="payment-slip-${staff.full_name.replace(/[^a-z0-9]+/gi, '-')}.pdf"`,
    },
  });
}
