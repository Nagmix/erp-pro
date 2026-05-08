'use client';

import type { Column } from '@/components/erp/data-table';
import { formatCurrency } from '@/lib/core/helpers';
import type { NormalizedFrappeColumn } from '@/lib/reports/normalize-frappe-report';

function stripQuotedLabel(s: string) {
  if (s.length >= 2 && s.startsWith("'") && s.endsWith("'")) return s.slice(1, -1);
  return s;
}

function isLabelColumnKey(key: string) {
  return (
    key === 'account_name' ||
    key === 'account' ||
    key === 'party' ||
    key === 'customer' ||
    key === 'supplier' ||
    key === 'voucher_no' ||
    key === 'item_name' ||
    key === 'item_code' ||
    key === 'entity' ||
    key === 'entity_name'
  );
}

/** تحويل أعمدة Frappe المُطبَّعة إلى أعمدة DataTable (أرقام، مساف بادئ، عملة). */
export function normalizedColumnsToDataTable(
  cols: NormalizedFrappeColumn[]
): Column<Record<string, unknown>>[] {
  const visible = cols.filter((c) => !c.hidden);
  return visible.map((c) => ({
    key: c.key,
    header: c.header,
    sortable: false,
    width: c.width && c.width >= 240 ? 'min-w-[240px]' : undefined,
    render: (value, row) => {
      const r = row as Record<string, unknown>;
      if (isLabelColumnKey(c.key)) {
        const indent = Number(r.indent ?? 0);
        const text = stripQuotedLabel(String(value ?? ''));
        return (
          <span className="block font-medium text-sm" style={{ paddingRight: indent * 16 }}>
            {text || '—'}
          </span>
        );
      }
      if (c.fieldtype === 'Currency' || c.fieldtype === 'Float' || c.fieldtype === 'Int') {
        const n = Number(value);
        if (!Number.isFinite(n)) return <span className="text-muted-foreground">—</span>;
        if (c.fieldtype === 'Int') return <span className="tabular-nums">{n}</span>;
        return <span className="tabular-nums font-medium">{formatCurrency(n)}</span>;
      }
      if (value === null || value === undefined || value === '') {
        return <span className="text-muted-foreground">—</span>;
      }
      return <span className="tabular-nums text-sm">{String(value)}</span>;
    },
  }));
}
