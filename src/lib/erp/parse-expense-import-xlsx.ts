import ExcelJS from 'exceljs';

export type ParsedExpenseLine = {
  expense_date: string;
  expense_type: string;
  amount: number;
  description: string;
  cost_center: string;
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
  return String(v).trim();
}

function headerKey(raw: string): string | null {
  const s = raw.trim().toLowerCase();
  if (!s) return null;
  if (/^date|^تاريخ|expense_date/.test(s)) return 'expense_date';
  if (/type|^نوع|expense_type/.test(s)) return 'expense_type';
  if (/^amount|^مبلغ|^القيمة/.test(s)) return 'amount';
  if (/desc|^وصف|^ملاحظ/.test(s)) return 'description';
  if (/cost|^مركز|^cc$/i.test(s)) return 'cost_center';
  return null;
}

/** بنود مطالبة مصروفات من Excel — صف عناوين أو أعمدة ثابتة (تاريخ، النوع، المبلغ، …). */
export async function parseExpenseImportXlsx(buffer: ArrayBuffer): Promise<ParsedExpenseLine[]> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer);
  const ws = wb.worksheets[0];
  if (!ws) return [];

  const rows: ExcelJS.Row[] = [];
  ws.eachRow((row) => rows.push(row));
  if (rows.length === 0) return [];

  const first = rows[0]!;
  const headerMap: Record<string, number> = {};
  const lastCol = Math.min(Math.max(first.actualCellCount || 6, 5), 20);
  for (let c = 1; c <= lastCol; c++) {
    const key = headerKey(cellValue(first.getCell(c)));
    if (key) headerMap[key] = c;
  }

  const namedHeader = Boolean(headerMap.expense_type && headerMap.amount);
  const dataRows = namedHeader ? rows.slice(1) : rows;

  const out: ParsedExpenseLine[] = [];
  for (const row of dataRows) {
    let expense_date = '';
    let expense_type = '';
    let amount = 0;
    let description = '';
    let cost_center = '';

    if (namedHeader) {
      if (headerMap.expense_date != null) expense_date = cellValue(row.getCell(headerMap.expense_date));
      expense_type = headerMap.expense_type != null ? cellValue(row.getCell(headerMap.expense_type)) : '';
      amount = headerMap.amount != null ? parseFloat(cellValue(row.getCell(headerMap.amount))) || 0 : 0;
      if (headerMap.description != null) description = cellValue(row.getCell(headerMap.description));
      if (headerMap.cost_center != null) cost_center = cellValue(row.getCell(headerMap.cost_center));
    } else {
      expense_date = cellValue(row.getCell(1));
      expense_type = cellValue(row.getCell(2));
      amount = parseFloat(cellValue(row.getCell(3))) || 0;
      description = cellValue(row.getCell(4));
      cost_center = cellValue(row.getCell(5));
    }

    if (!expense_type) continue;
    out.push({
      expense_date: expense_date.slice(0, 10) || new Date().toISOString().slice(0, 10),
      expense_type,
      amount,
      description,
      cost_center,
    });
  }

  return out;
}
