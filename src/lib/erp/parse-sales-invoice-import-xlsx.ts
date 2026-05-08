import ExcelJS from 'exceljs';

export type InvoiceLineImportRow = {
  item_code: string;
  description: string;
  qty: number;
  rate: number;
  warehouse: string;
};

function cellValue(cell: ExcelJS.Cell): string {
  const v = cell.value;
  if (v == null) return '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'string') return v.trim();
  if (typeof v === 'object' && v !== null && 'text' in v) return String((v as { text: string }).text).trim();
  if (typeof v === 'object' && v !== null && 'richText' in v) {
    const rt = (v as { richText: { text: string }[] }).richText;
    return rt.map((x) => x.text).join('').trim();
  }
  if (typeof v === 'object' && v !== null && 'result' in v) return String((v as { result: unknown }).result ?? '').trim();
  return String(v).trim();
}

function headerKey(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (/^item|^sku|^صنف|^كود/i.test(s)) return 'item_code';
  if (/^desc|^وصف|^description/i.test(s)) return 'description';
  if (/^qty|^quantity|^كم/i.test(s)) return 'qty';
  if (/^rate|^price|^سعر|^السعر/i.test(s)) return 'rate';
  if (/^warehouse|^wh|^مستودع/i.test(s)) return 'warehouse';
  return null;
}

/** استيراد بنود فاتورة (بيع/شراء) من أول ورقة في Excel — يصلح لاستبدال جدول البنود بالكامل. */
export async function parseSalesInvoiceImportXlsx(buffer: ArrayBuffer): Promise<InvoiceLineImportRow[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows: ExcelJS.Row[] = [];
  ws.eachRow((row) => rows.push(row));
  if (rows.length === 0) return [];

  const first = rows[0]!;
  const headerMap: Record<string, number> = {};
  const lastCol = Math.min(Math.max(first.actualCellCount || 8, 8), 24);
  for (let c = 1; c <= lastCol; c++) {
    const key = headerKey(cellValue(first.getCell(c)));
    if (key) headerMap[key] = c;
  }

  const namedHeader = Boolean(headerMap.item_code);
  const dataRows = namedHeader ? rows.slice(1) : rows;

  const out: InvoiceLineImportRow[] = [];

  for (const row of dataRows) {
    let item_code = '';
    let description = '';
    let qty = 1;
    let rate = 0;
    let warehouse = '';

    if (namedHeader) {
      if (headerMap.item_code != null) item_code = cellValue(row.getCell(headerMap.item_code));
      if (headerMap.description != null) description = cellValue(row.getCell(headerMap.description));
      if (headerMap.qty != null) qty = parseFloat(cellValue(row.getCell(headerMap.qty))) || 0;
      if (headerMap.rate != null) rate = parseFloat(cellValue(row.getCell(headerMap.rate))) || 0;
      if (headerMap.warehouse != null) warehouse = cellValue(row.getCell(headerMap.warehouse));
    } else {
      item_code = cellValue(row.getCell(1));
      description = cellValue(row.getCell(2));
      qty = parseFloat(cellValue(row.getCell(3))) || 0;
      rate = parseFloat(cellValue(row.getCell(4))) || 0;
      warehouse = cellValue(row.getCell(5));
    }

    if (!item_code) continue;
    if (qty <= 0) qty = 1;
    out.push({
      item_code,
      description,
      qty,
      rate,
      warehouse: warehouse || 'المستودع الرئيسي',
    });
  }

  return out;
}
