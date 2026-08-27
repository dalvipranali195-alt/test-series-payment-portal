import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from 'pdf-lib';

export interface PdfColumn {
  key: string;
  label: string;
  width: number;
  align?: 'left' | 'right';
}

export interface BuildPdfOptions {
  title: string;
  subtitle?: string;
  columns: PdfColumn[];
  rows: Record<string, string>[];
  totalsLines?: string[];
}

const PAGE_WIDTH = 841.89; // A4 landscape
const PAGE_HEIGHT = 595.28;
const MARGIN = 36;
const ROW_HEIGHT = 16;
const HEADER_FONT_SIZE = 9;
const BODY_FONT_SIZE = 9;

/**
 * Generic table-report PDF builder shared by Payment Slips and Reports
 * export. Paginates automatically; every page repeats the title/subtitle
 * and column header row.
 */
export async function buildTablePdf(opts: BuildPdfOptions): Promise<Uint8Array> {
  const { title, subtitle = '', columns, rows, totalsLines = [] } = opts;

  const pdfDoc = await PDFDocument.create();
  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const topBlock = subtitle ? 74 : 60;
  const bottomReserve = totalsLines.length ? totalsLines.length * 14 + 12 : 0;
  const rowsPerPage = Math.max(6, Math.floor((PAGE_HEIGHT - MARGIN * 2 - topBlock - bottomReserve) / ROW_HEIGHT));

  const pages: Record<string, string>[][] = [];
  for (let i = 0; i < rows.length; i += rowsPerPage) pages.push(rows.slice(i, i + rowsPerPage));
  if (pages.length === 0) pages.push([]);

  function drawText(
    page: PDFPage,
    text: string,
    x: number,
    y: number,
    font: PDFFont,
    size: number,
    maxWidth?: number
  ) {
    let clipped = text;
    if (maxWidth) {
      while (clipped.length > 1 && font.widthOfTextAtSize(clipped, size) > maxWidth) {
        clipped = clipped.slice(0, -1);
      }
      if (clipped !== text && clipped.length > 1) clipped = clipped.slice(0, -1) + '…';
    }
    page.drawText(clipped, { x, y, size, font, color: rgb(0.1, 0.1, 0.12) });
  }

  pages.forEach((pageRows, pageIndex) => {
    const page = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    drawText(page, title, MARGIN, y, fontBold, 15);
    drawText(
      page,
      `Page ${pageIndex + 1}/${pages.length}`,
      PAGE_WIDTH - MARGIN - 80,
      PAGE_HEIGHT - MARGIN,
      fontRegular,
      8
    );
    y -= 18;

    if (subtitle) {
      drawText(page, subtitle, MARGIN, y, fontRegular, 9, PAGE_WIDTH - MARGIN * 2);
      y -= 16;
    }
    y -= 6;

    let x = MARGIN;
    columns.forEach((col) => {
      drawText(page, col.label, x, y, fontBold, HEADER_FONT_SIZE, col.width - 4);
      x += col.width;
    });
    y -= 4;
    page.drawLine({
      start: { x: MARGIN, y },
      end: { x: PAGE_WIDTH - MARGIN, y },
      thickness: 0.5,
      color: rgb(0.7, 0.7, 0.72),
    });
    y -= 12;

    pageRows.forEach((row) => {
      x = MARGIN;
      columns.forEach((col) => {
        const text = String(row[col.key] ?? '');
        const drawX = col.align === 'right' ? x + col.width - 4 - fontRegular.widthOfTextAtSize(text, BODY_FONT_SIZE) : x;
        drawText(page, text, Math.max(x, drawX), y, fontRegular, BODY_FONT_SIZE, col.width - 4);
        x += col.width;
      });
      y -= ROW_HEIGHT;
    });

    if (pageIndex === pages.length - 1 && totalsLines.length) {
      y -= 6;
      totalsLines.forEach((line) => {
        drawText(page, line, MARGIN, y, fontBold, 10.5);
        y -= 14;
      });
    }
  });

  return pdfDoc.save();
}
