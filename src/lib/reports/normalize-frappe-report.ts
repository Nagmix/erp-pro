/**
 * توحيد مخرجات `frappe.desk.query_report.run` للعرض في الجداول.
 * يدعم صفوفاً كـ objects أو مصفوفات متوافقة مع أعمدة التقرير.
 */

export type NormalizedFrappeColumn = {
  key: string;
  header: string;
  fieldtype?: string;
  width?: number;
  hidden?: boolean;
};

export type NormalizedFrappeReport = {
  rows: Record<string, unknown>[];
  columns: NormalizedFrappeColumn[];
  reportSummary: Array<Record<string, unknown>>;
  chart?: unknown;
  notice?: string;
};

export function normalizeFrappeReportPayload(raw: unknown): NormalizedFrappeReport {
  const empty: NormalizedFrappeReport = { rows: [], columns: [], reportSummary: [] };
  if (!raw || typeof raw !== 'object') return empty;

  const o = raw as Record<string, unknown>;
  const colsRaw = o.columns;
  const result = o.result;
  const reportSummary = Array.isArray(o.report_summary)
    ? (o.report_summary as Array<Record<string, unknown>>)
    : [];
  const notice = typeof o.message === 'string' ? o.message : undefined;

  const columns: NormalizedFrappeColumn[] = [];
  if (Array.isArray(colsRaw)) {
    for (const c of colsRaw) {
      if (!c || typeof c !== 'object') continue;
      const co = c as Record<string, unknown>;
      const fn = co.fieldname ?? co.field_name;
      if (typeof fn !== 'string' || !fn) continue;
      columns.push({
        key: fn,
        header: typeof co.label === 'string' ? co.label : fn,
        fieldtype: typeof co.fieldtype === 'string' ? co.fieldtype : undefined,
        width: typeof co.width === 'number' ? co.width : undefined,
        hidden: co.hidden === 1 || co.hidden === true,
      });
    }
  }

  const rows: Record<string, unknown>[] = [];

  if (!Array.isArray(result) || result.length === 0) {
    return { rows, columns, reportSummary, chart: o.chart, notice };
  }

  const first = result[0];
  if (first && typeof first === 'object' && !Array.isArray(first)) {
    for (const row of result as Record<string, unknown>[]) {
      if (!row || typeof row !== 'object') continue;
      if (Object.keys(row).length === 0) continue;
      rows.push(row);
    }
    return { rows, columns, reportSummary, chart: o.chart, notice };
  }

  if (Array.isArray(first)) {
    const fieldnames = columns.map((c) => c.key);
    for (const row of result as unknown[]) {
      if (!Array.isArray(row)) continue;
      const obj: Record<string, unknown> = {};
      row.forEach((cell, i) => {
        const k = fieldnames[i];
        if (k) obj[k] = cell;
      });
      if (Object.keys(obj).length > 0) rows.push(obj);
    }
    return { rows, columns, reportSummary, chart: o.chart, notice };
  }

  return { rows, columns, reportSummary, chart: o.chart, notice };
}
