import ExcelJS from 'exceljs';
import type { JournalLineInput } from '@/lib/erp/erpnext-payloads';

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
  if (/^account|^حساب|^acc$/i.test(s) || s === 'account name') return 'account';
  if (/debit|^مدين/.test(s)) return 'debit';
  if (/credit|^دائن/.test(s)) return 'credit';
  if (/party[_\s]?type|^نوع\s*الطرف/i.test(s)) return 'party_type';
  if (/^party$|^الطرف|^طرف$/i.test(s)) return 'party';
  if (/cost[_\s]?center|^مركز|^cc$/i.test(s)) return 'cost_center';
  if (/remark|^ملاحظ|^note$/i.test(s)) return 'remarks';
  if (/exchange|^سعر|^fx$/i.test(s)) return 'exchange_rate';
  return null;
}

/** استيراد بنود قيد يومية من أول ورقة في ملف Excel — الصف الأول عناوين أو أعمدة ثابتة مثل CSV. */
export async function parseJournalImportXlsx(buffer: ArrayBuffer): Promise<JournalLineInput[]> {
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

  const namedHeader = Boolean(headerMap.account && (headerMap.debit != null || headerMap.credit != null));
  const dataRows = namedHeader ? rows.slice(1) : rows;

  const rid = () =>
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `je-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

  const out: JournalLineInput[] = [];

  for (const row of dataRows) {
    let account = '';
    let debit = 0;
    let credit = 0;
    let party_type = '';
    let party = '';
    let cost_center = '';
    let remarks = '';
    let exchange_rate = 1;

    if (namedHeader) {
      if (headerMap.account != null) account = cellValue(row.getCell(headerMap.account));
      if (headerMap.debit != null) debit = parseFloat(cellValue(row.getCell(headerMap.debit))) || 0;
      if (headerMap.credit != null) credit = parseFloat(cellValue(row.getCell(headerMap.credit))) || 0;
      if (headerMap.party_type != null) party_type = cellValue(row.getCell(headerMap.party_type));
      if (headerMap.party != null) party = cellValue(row.getCell(headerMap.party));
      if (headerMap.cost_center != null) cost_center = cellValue(row.getCell(headerMap.cost_center));
      if (headerMap.remarks != null) remarks = cellValue(row.getCell(headerMap.remarks));
      if (headerMap.exchange_rate != null) {
        const fx = parseFloat(cellValue(row.getCell(headerMap.exchange_rate)));
        if (Number.isFinite(fx) && fx > 0) exchange_rate = fx;
      }
    } else {
      account = cellValue(row.getCell(1));
      party_type = cellValue(row.getCell(2));
      party = cellValue(row.getCell(3));
      debit = parseFloat(cellValue(row.getCell(4))) || 0;
      credit = parseFloat(cellValue(row.getCell(5))) || 0;
      cost_center = cellValue(row.getCell(6));
      remarks = cellValue(row.getCell(7));
      const fxRaw = parseFloat(cellValue(row.getCell(8)));
      exchange_rate = Number.isFinite(fxRaw) && fxRaw > 0 ? fxRaw : 1;
    }

    if (!account) continue;
    out.push({
      _rid: rid(),
      account,
      party_type,
      party,
      debit,
      credit,
      cost_center,
      remarks,
      exchange_rate,
    });
  }

  return out;
}
