'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { Plus, Minus, X } from 'lucide-react';
import { formatCurrency } from '@/lib/core/helpers';

/** سطر سلة معروض في شاشة البيع — يطابق بنود السلة في الصفحة. */
export type PosCartLineVM = {
  item_code: string;
  item_name: string;
  rate: number;
  qty: number;
  warehouse: string;
};

type Props = {
  item: PosCartLineVM;
  onRemove: () => void;
  onQtyDelta: (delta: number) => void;
  onRateChange: (rate: number) => void;
  onWarehouseChange: (warehouse: string) => void;
  allowRateEdit?: boolean;
  allowWarehouseEdit?: boolean;
};

export function PosCartItem({
  item,
  onRemove,
  onQtyDelta,
  onRateChange,
  onWarehouseChange,
  allowRateEdit = true,
  allowWarehouseEdit = true,
}: Props) {
  return (
    <div className="flex flex-col gap-1.5 p-2.5 rounded-xl bg-background border">
      <div className="flex items-start gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold line-clamp-2">{item.item_name}</p>
          <p className="text-[10px] text-muted-foreground font-mono" dir="rtl">
            {item.item_code}
          </p>
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={onRemove}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="flex items-center flex-wrap gap-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onQtyDelta(-1)}>
            <Minus className="h-3 w-3" />
          </Button>
          <span className="w-7 text-center text-xs font-bold tabular-nums">{item.qty}</span>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onQtyDelta(1)}>
            <Plus className="h-3 w-3" />
          </Button>
        </div>
        <div className="flex items-center gap-1 text-xs">
          <span>سعر</span>
          {allowRateEdit ? (
            <Input
              type="number"
              className="h-7 w-20 text-center text-xs"
              dir="rtl"
              value={item.rate}
              onChange={(e) => onRateChange(Number(e.target.value) || 0)}
            />
          ) : (
            <span className="h-7 inline-flex items-center px-2 rounded-md bg-muted tabular-nums font-medium">
              {formatCurrency(item.rate)}
            </span>
          )}
        </div>
        <span className="text-xs font-bold tabular-nums ms-auto">{formatCurrency(item.qty * item.rate)}</span>
      </div>
      {allowWarehouseEdit ? (
        <ErpLinkCombobox
          doctype="Warehouse"
          value={item.warehouse}
          onChange={onWarehouseChange}
          placeholder="مستودع البند *"
        />
      ) : (
        <p className="text-[10px] text-muted-foreground">
          مستودع البند:{' '}
          <span className="font-mono text-foreground">{item.warehouse || '—'}</span>
        </p>
      )}
    </div>
  );
}
