import { buildItemCreate } from '@/lib/erp/erpnext-payloads';
import { apiCreateDoc } from '@/lib/client/api';

export function parseCsvRows(text: string): string[][] {
  return text
    .split(/\r?\n/)
    .map((l) => l.trimEnd())
    .filter((l) => l.length > 0)
    .map((line) => {
      const cells: string[] = [];
      let cur = '';
      let inQ = false;
      for (let i = 0; i < line.length; i++) {
        const c = line[i]!;
        if (inQ) {
          if (c === '"') inQ = false;
          else cur += c;
        } else if (c === '"') inQ = true;
        else if (c === ',') {
          cells.push(cur.trim());
          cur = '';
        } else cur += c;
      }
      cells.push(cur.trim());
      return cells;
    });
}

export interface ItemCsvRow {
  item_code: string;
  item_name: string;
  item_group: string;
  stock_uom: string;
  is_stock_item?: string;
  standard_rate?: string;
  has_batch_no?: string;
  has_serial_no?: string;
  brand?: string;
  description?: string;
}

const HEADER_ALIASES: Record<string, keyof ItemCsvRow> = {
  item_code: 'item_code',
  code: 'item_code',
  'item code': 'item_code',
  كود: 'item_code',
  item_name: 'item_name',
  name: 'item_name',
  'item name': 'item_name',
  اسم: 'item_name',
  item_group: 'item_group',
  group: 'item_group',
  'item group': 'item_group',
  مجموعة: 'item_group',
  stock_uom: 'stock_uom',
  uom: 'stock_uom',
  'stock uom': 'stock_uom',
  وحدة: 'stock_uom',
  is_stock_item: 'is_stock_item',
  'is stock': 'is_stock_item',
  مخزني: 'is_stock_item',
  stock: 'is_stock_item',
  standard_rate: 'standard_rate',
  rate: 'standard_rate',
  'standard rate': 'standard_rate',
  سعر: 'standard_rate',
  has_batch_no: 'has_batch_no',
  has_batch: 'has_batch_no',
  batch: 'has_batch_no',
  دفعة: 'has_batch_no',
  has_serial_no: 'has_serial_no',
  has_serial: 'has_serial_no',
  serial: 'has_serial_no',
  تسلسل: 'has_serial_no',
  brand: 'brand',
  علامة: 'brand',
  description: 'description',
  وصف: 'description',
};

const ITEM_CSV_KNOWN: (keyof ItemCsvRow)[] = [
  'item_code',
  'item_name',
  'item_group',
  'stock_uom',
  'is_stock_item',
  'standard_rate',
  'has_batch_no',
  'has_serial_no',
  'brand',
  'description',
];

export function mapItemImportHeader(raw: string): keyof ItemCsvRow | null {
  const k = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  const alias = HEADER_ALIASES[k] ?? HEADER_ALIASES[raw.trim()];
  if (alias) return alias;
  const underscored = raw.trim().toLowerCase().replace(/\s+/g, '_');
  if (underscored in HEADER_ALIASES) return HEADER_ALIASES[underscored]!;
  if (ITEM_CSV_KNOWN.includes(underscored as keyof ItemCsvRow)) return underscored as keyof ItemCsvRow;
  return null;
}

function parseBoolCell(v: string | undefined, defaultTrue: boolean): boolean {
  if (v == null || v === '') return defaultTrue;
  const s = v.trim().toLowerCase();
  if (['0', 'no', 'false', 'n', 'لا', 'off'].includes(s)) return false;
  if (['1', 'yes', 'true', 'y', 'نعم', 'on'].includes(s)) return true;
  return defaultTrue;
}

export type ItemImportStats = { ok: number; fail: number; skipped: number };

export function validateItemImportHeaders(headerCells: string[]): {
  ok: true;
  colIndex: Partial<Record<keyof ItemCsvRow, number>>;
} | { ok: false; message: string } {
  const colIndex: Partial<Record<keyof ItemCsvRow, number>> = {};
  headerCells.forEach((h, i) => {
    const key = mapItemImportHeader(h);
    if (key) colIndex[key] = i;
  });
  if (
    colIndex.item_code == null ||
    colIndex.item_name == null ||
    colIndex.item_group == null ||
    colIndex.stock_uom == null
  ) {
    return {
      ok: false,
      message:
        'يلزم أعمدة: item_code, item_name, item_group, stock_uom (أو مكافئاتها العربية). راجع القالب.',
    };
  }
  return { ok: true, colIndex };
}

export async function runItemImportFromGrid(
  grid: string[][],
  colIndex: Partial<Record<keyof ItemCsvRow, number>>,
  company: string
): Promise<ItemImportStats> {
  let ok = 0;
  let fail = 0;
  let skipped = 0;
  const seen = new Set<string>();

  const get = (row: string[], k: keyof ItemCsvRow) => {
    const idx = colIndex[k];
    return idx != null ? (row[idx] ?? '').trim() : '';
  };

  for (let r = 1; r < grid.length; r++) {
    const row = grid[r]!;
    const item_code = get(row, 'item_code');
    const item_name = get(row, 'item_name');
    const item_group = get(row, 'item_group');
    const stock_uom = get(row, 'stock_uom') || 'Nos';
    if (!item_code || !item_name || !item_group) {
      skipped++;
      continue;
    }
    const key = item_code.toLowerCase();
    if (seen.has(key)) {
      skipped++;
      continue;
    }
    seen.add(key);
    const is_stock = parseBoolCell(get(row, 'is_stock_item'), true);
    const doc = buildItemCreate({
      item_code,
      item_name,
      item_group,
      stock_uom,
      is_stock_item: is_stock,
      company: is_stock ? company : undefined,
      has_batch_no: parseBoolCell(get(row, 'has_batch_no'), false),
      has_serial_no: parseBoolCell(get(row, 'has_serial_no'), false),
      standard_rate: Number(get(row, 'standard_rate')) || 0,
      description: get(row, 'description') || undefined,
      brand: get(row, 'brand') || undefined,
    });
    try {
      await apiCreateDoc('Item', doc);
      ok++;
    } catch {
      fail++;
    }
  }
  return { ok, fail, skipped };
}

export async function parseExcelFirstSheetToGrid(file: ArrayBuffer): Promise<string[][]> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(file);
  const ws = wb.worksheets[0];
  if (!ws) return [];
  const rows: string[][] = [];
  ws.eachRow((row) => {
    const r: string[] = [];
    for (let i = 1; i <= row.cellCount; i++) {
      const cell = row.getCell(i);
      const v = cell.value;
      if (v == null) r.push('');
      else if (typeof v === 'object' && v !== null && 'text' in v && typeof (v as { text: string }).text === 'string') {
        r.push(String((v as { text: string }).text));
      } else if (typeof v === 'object' && v !== null && 'result' in v) {
        r.push(String((v as { result: unknown }).result ?? ''));
      } else r.push(String(v));
    }
    rows.push(r);
  });
  return rows;
}
