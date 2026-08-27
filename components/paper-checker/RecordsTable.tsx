import RecordsTable, { type RecordRow } from '@/components/shared/RecordsTable';

export type PaperCheckerRow = RecordRow;

export default function PaperCheckerRecordsTable({
  rows,
  showChecker,
}: {
  rows: PaperCheckerRow[];
  showChecker: boolean;
}) {
  return (
    <RecordsTable
      rows={rows}
      showSubmitter={showChecker}
      submitterLabel="Paper checker"
      quantityLabel="Students"
      detailBasePath="/paper-checker"
    />
  );
}
