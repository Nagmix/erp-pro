'use client';

import { useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDocList } from '@/lib/client/hooks';
import { apiPosGetItems } from '@/lib/client/api';
import {
  normalizePosCatalogPayload,
  type PosSellCatalogRow,
  type PosVariantListRow,
} from '@/lib/client/pos-catalog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** عنوان للقالب (للعرض) */
  templateLabel: string;
  /** Item.name للقالب — حقل `variant_of` عند الأصناف الفرعية */
  templateDocName: string;
  posProfile: string;
  priceList?: string | null;
  itemGroup: string;
  currency?: string;
  onPick: (row: PosSellCatalogRow) => void;
};

export function PosVariantPickerDialog({
  open,
  onOpenChange,
  templateLabel,
  templateDocName,
  posProfile,
  priceList,
  itemGroup,
  currency = 'YER',
  onPick,
}: Props) {
  const { toast } = useToast();
  const [resolving, setResolving] = useState<string | null>(null);

  const key = templateDocName.trim();
  const { data: rawVariants = [], isLoading } = useDocList<PosVariantListRow & { disabled?: number }>(
    'Item',
    {
      fields: ['name', 'item_name', 'item_code', 'item_image', 'disabled'],
      filters: { variant_of: key, disabled: 0 },
      limit: 500,
      order_by: 'item_name asc',
      enabled: open && Boolean(key),
    }
  );

  const variants = useMemo(
    () => rawVariants.filter((r) => r.item_code?.trim() && (r.disabled ?? 0) === 0),
    [rawVariants]
  );

  const pickVariant = async (itemCode: string) => {
    const code = itemCode.trim();
    if (!code) return;
    if (!posProfile.trim()) {
      toast({ title: 'اختر ملف نقطة البيع', variant: 'destructive' });
      return;
    }
    setResolving(code);
    try {
      const raw = await apiPosGetItems({
        pos_profile: posProfile.trim(),
        price_list: priceList?.trim() || undefined,
        item_group: itemGroup,
        search: code,
        page_length: 40,
      });
      const rows = normalizePosCatalogPayload(raw);
      const lower = code.toLowerCase();
      const hit =
        rows.find((x) => (x.item_code || '').toLowerCase() === lower) ??
        rows.find((x) => (x.name || '').toLowerCase() === lower) ??
        rows[0];
      if (hit) {
        onPick(hit);
        onOpenChange(false);
        return;
      }
      const fallback = rawVariants.find(
        (v) => (v.item_code || '').toLowerCase() === lower || (v.name || '').toLowerCase() === lower
      );
      if (fallback) {
        onPick({
          name: fallback.item_code,
          item_code: fallback.item_code,
          item_name: fallback.item_name || fallback.item_code,
          item_group: '',
          item_image: fallback.item_image,
          price_list_rate: 0,
        });
        onOpenChange(false);
        toast({
          title: 'أُضيف بدون سعر من القائمة',
          description: 'راجع قائمة الأسعار أو ملف نقطة البيع',
        });
        return;
      }
      toast({ title: 'تعذر جلب الصنف', variant: 'destructive' });
    } catch (e) {
      toast({
        title: 'فشل جلب السعر',
        description: e instanceof Error ? e.message : undefined,
        variant: 'destructive',
      });
    } finally {
      setResolving(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent dir="rtl" className="max-w-md max-h-[85vh] flex flex-col gap-0 p-0">
        <DialogHeader className="p-4 pb-2 space-y-1">
          <DialogTitle className="text-base">اختر المتغير</DialogTitle>
          <DialogDescription className="text-xs text-start line-clamp-2">
            {templateLabel} — اختر لونًا أو حجمًا ثم يُضاف للسلة بسعر قائمة الملف.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[50vh] border-y">
          <div className="p-2 space-y-1">
            {isLoading && (
              <div className="flex items-center justify-center gap-2 py-8 text-muted-foreground text-sm">
                <Loader2 className="h-4 w-4 animate-spin" />
                جاري تحميل المتغيرات…
              </div>
            )}
            {!isLoading &&
              variants.map((v) => {
                const code = (v.item_code || v.name || '').trim();
                if (!code) return null;
                const busy = resolving === code;
                return (
                  <button
                    key={v.name || code}
                    type="button"
                    disabled={busy || resolving !== null}
                    onClick={() => void pickVariant(code)}
                    className={cn(
                      'w-full rounded-lg border px-3 py-2.5 text-start text-sm transition-colors',
                      'hover:bg-muted/80 hover:border-primary/40 disabled:opacity-60'
                    )}
                  >
                    <div className="font-medium leading-snug line-clamp-2">{v.item_name || code}</div>
                    <div className="text-[10px] text-muted-foreground font-mono tabular-nums" dir="ltr">
                      {code}
                    </div>
                    {busy ? (
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground">
                        <Loader2 className="h-3 w-3 animate-spin" />
                        جاري جلب السعر…
                      </div>
                    ) : null}
                  </button>
                );
              })}
            {!isLoading && variants.length === 0 && (
              <p className="text-center text-sm text-muted-foreground py-8">لا توجد متغيرات مرتبطة بهذا القالب.</p>
            )}
          </div>
        </ScrollArea>
        <DialogFooter className="p-3 sm:justify-start">
          <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
            إلغاء
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
