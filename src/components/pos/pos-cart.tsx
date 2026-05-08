'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { ShoppingCart, Trash2, Pause, ListOrdered } from 'lucide-react';
import { PosCartItem, type PosCartLineVM } from '@/components/pos/pos-cart-item';

export type PosCartHoldVM = { id: string; label: string; at: string };

type Props = {
  lines: PosCartLineVM[];
  totalItems: number;
  holds: PosCartHoldVM[];
  onRemoveLine: (itemCode: string) => void;
  onQtyDelta: (itemCode: string, delta: number) => void;
  onRateChange: (itemCode: string, rate: number) => void;
  onWarehouseChange: (itemCode: string, warehouse: string) => void;
  onHold: () => void;
  onRestoreHold: (id: string) => void;
  onDeleteHold: (id: string) => void;
  onClearCart: () => void;
  /** يُستمد من ملف نقطة البيع (`allow_rate_change`) */
  allowRateEdit?: boolean;
  /** يُستمد من ملف نقطة البيع (`allow_warehouse_change`) */
  allowWarehouseEdit?: boolean;
};

export function PosCart({
  lines,
  totalItems,
  holds,
  onRemoveLine,
  onQtyDelta,
  onRateChange,
  onWarehouseChange,
  onHold,
  onRestoreHold,
  onDeleteHold,
  onClearCart,
  allowRateEdit = true,
  allowWarehouseEdit = true,
}: Props) {
  return (
    <div className="flex flex-col flex-1 min-h-0 min-w-0">
      <div className="p-3 border-b bg-background flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <ShoppingCart className="h-4 w-4 text-primary" />
          <span className="text-sm font-bold">السلة</span>
          {lines.length > 0 && (
            <Badge variant="secondary" className="text-[10px]">
              {totalItems} صنف
            </Badge>
          )}
        </div>
        <div className="flex gap-1 flex-wrap">
          <Popover>
            <PopoverTrigger asChild>
              <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] gap-1" disabled={holds.length === 0}>
                <ListOrdered className="h-3 w-3" />
                معلّق ({holds.length})
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-2" align="end">
              <p className="text-[10px] text-muted-foreground mb-2">طلبات معلّقة محلياً</p>
              <ScrollArea className="max-h-48">
                <div className="space-y-1">
                  {holds.map((h) => (
                    <div key={h.id} className="flex items-center justify-between gap-2 text-xs border rounded px-2 py-1">
                      <span className="truncate">{h.label}</span>
                      <div className="flex gap-1 shrink-0">
                        <Button type="button" variant="ghost" size="sm" className="h-6 px-2" onClick={() => onRestoreHold(h.id)}>
                          استرداد
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 px-2 text-destructive"
                          onClick={() => onDeleteHold(h.id)}
                        >
                          حذف
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </PopoverContent>
          </Popover>
          <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] gap-1" onClick={onHold} disabled={lines.length === 0}>
            <Pause className="h-3 w-3" />
            تعليق
          </Button>
          {lines.length > 0 && (
            <Button type="button" variant="ghost" size="sm" className="h-7 text-xs text-destructive gap-1" onClick={onClearCart}>
              <Trash2 className="h-3 w-3" />
              مسح
            </Button>
          )}
        </div>
      </div>

      <ScrollArea className="flex-1 min-h-0">
        {lines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
            <ShoppingCart className="h-12 w-12 mb-3 opacity-15" />
            <p className="text-sm">السلة فارغة</p>
          </div>
        ) : (
          <div className="p-2 space-y-1.5">
            {lines.map((item) => (
              <PosCartItem
                key={item.item_code}
                item={item}
                onRemove={() => onRemoveLine(item.item_code)}
                onQtyDelta={(d) => onQtyDelta(item.item_code, d)}
                onRateChange={(r) => onRateChange(item.item_code, r)}
                onWarehouseChange={(w) => onWarehouseChange(item.item_code, w)}
                allowRateEdit={allowRateEdit}
                allowWarehouseEdit={allowWarehouseEdit}
              />
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
