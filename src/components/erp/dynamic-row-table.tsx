'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';

export interface DynamicRowField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'select';
  placeholder?: string;
  options?: { label: string; value: string }[];
  width?: string;
  dir?: 'rtl' | 'ltr';
}

interface DynamicRowTableProps {
  fields: DynamicRowField[];
  rows: Record<string, unknown>[];
  onChange: (rows: Record<string, unknown>[]) => void;
  minRows?: number;
  addLabel?: string;
}

export function DynamicRowTable({
  fields,
  rows,
  onChange,
  minRows = 1,
  addLabel = 'إضافة صف',
}: DynamicRowTableProps) {
  const addRow = () => {
    const newRow: Record<string, unknown> = {};
    fields.forEach((f) => {
      newRow[f.key] = f.type === 'number' ? 0 : '';
    });
    onChange([...rows, newRow]);
  };

  const removeRow = (index: number) => {
    if (rows.length <= minRows) return;
    const updated = [...rows];
    updated.splice(index, 1);
    onChange(updated);
  };

  const updateRow = (index: number, key: string, value: unknown) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [key]: value };

    // Auto-calculate amount for invoice items
    if (key === 'qty' || key === 'rate') {
      const qty = Number(updated[index].qty || 0);
      const rate = Number(updated[index].rate || 0);
      updated[index].amount = qty * rate;
    }

    // Auto-calculate totals for journal entries
    if (key === 'debit' || key === 'credit') {
      const debit = Number(updated[index].debit || 0);
      const credit = Number(updated[index].credit || 0);
      // Ensure one is zero when the other has value
      if (key === 'debit' && debit > 0) {
        updated[index].credit = 0;
      } else if (key === 'credit' && credit > 0) {
        updated[index].debit = 0;
      }
    }

    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium">البنود</Label>
        <Button type="button" variant="outline" size="sm" onClick={addRow} className="h-7 text-xs gap-1">
          <Plus className="h-3 w-3" />
          {addLabel}
        </Button>
      </div>

      <div className="rounded-lg border overflow-hidden">
        <div className="bg-muted/50 grid gap-2 p-2 text-[10px] font-semibold" style={{ gridTemplateColumns: fields.map(f => f.width || '1fr').join(' ') + ' 40px' }}>
          {fields.map((f) => (
            <span key={f.key}>{f.label}</span>
          ))}
          <span></span>
        </div>

        {rows.map((row, rowIdx) => (
          <div key={rowIdx} className="grid gap-2 p-2 border-t items-center" style={{ gridTemplateColumns: fields.map(f => f.width || '1fr').join(' ') + ' 40px' }}>
            {fields.map((f) => (
              <div key={f.key}>
                {f.type === 'select' ? (
                  <select
                    className="w-full h-8 rounded-md border bg-background px-2 text-xs"
                    value={String(row[f.key] || '')}
                    onChange={(e) => updateRow(rowIdx, f.key, e.target.value)}
                    dir={f.dir}
                  >
                    <option value="">اختر...</option>
                    {f.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                ) : (
                  <Input
                    type={f.type}
                    placeholder={f.placeholder}
                    value={String(row[f.key] ?? '')}
                    onChange={(e) => updateRow(rowIdx, f.key, f.type === 'number' ? Number(e.target.value) : e.target.value)}
                    className="h-8 text-xs"
                    dir={f.dir}
                  />
                )}
              </div>
            ))}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={()=> removeRow(rowIdx)}
              disabled={rows.length <= minRows}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>

      {/* Totals row */}
      {rows.length > 0 && rows[0].amount !== undefined && (
        <div className="flex justify-end gap-4 text-xs pt-1">
          <span className="text-muted-foreground">الإجمالي:</span>
          <span className="font-bold">
            {rows.reduce((sum, r) => sum + (Number(r.amount) || 0), 0).toLocaleString('en-US')}
          </span>
        </div>
      )}
      {rows.length > 0 && (rows[0].debit !== undefined || rows[0].credit !== undefined) && (
        <div className="flex justify-end gap-6 text-xs pt-1">
          <span>مدين: <b>{rows.reduce((sum, r) => sum + (Number(r.debit) || 0), 0).toLocaleString('en-US')}</b></span>
          <span>دائن: <b>{rows.reduce((sum, r) => sum + (Number(r.credit) || 0), 0).toLocaleString('en-US')}</b></span>
        </div>
      )}
    </div>
  );
}
