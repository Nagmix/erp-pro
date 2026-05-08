'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/erp/page-header';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { Plus, Trash2, ArrowRightLeft } from 'lucide-react';
import { useCreateDoc, useDocList } from '@/lib/client/hooks';
import { buildStockEntry } from '@/lib/erp/erpnext-payloads';
import { useDefaultCompanyName } from '@/lib/erp/default-company';
import { useToast } from '@/hooks/use-toast';

type Line = { item_code: string; qty: number; s_warehouse: string; t_warehouse: string };

const emptyLine = (): Line => ({
  item_code: '',
  qty: 1,
  s_warehouse: '',
  t_warehouse: '',
});

export default function InterBranchTransferPage() {
  const { toast } = useToast();
  const { company, isLoading: coLoading } = useDefaultCompanyName();
  const [postingDate, setPostingDate] = useState(() => new Date().toISOString().split('T')[0]!);
  const [fromWh, setFromWh] = useState('');
  const [toWh, setToWh] = useState('');
  const [lines, setLines] = useState<Line[]>([emptyLine()]);

  const list = useDocList<{ name: string; branch?: string }>('Warehouse', {
    fields: ['name', 'branch'],
    limit: 800,
    order_by: 'name asc',
  });
  const warehouses = list.data || [];

  const createMutation = useCreateDoc('Stock Entry');

  const fromBranch = useMemo(() => warehouses.find((w) => w.name === fromWh)?.branch, [warehouses, fromWh]);
  const toBranch = useMemo(() => warehouses.find((w) => w.name === toWh)?.branch, [warehouses, toWh]);

  const updateLine = (i: number, patch: Partial<Line>) => {
    setLines((prev) => {
      const n = [...prev];
      n[i] = { ...n[i]!, ...patch };
      return n;
    });
  };

  const submit = () => {
    if (!company) {
      toast({ title: 'تعذر تحديد الشركة', variant: 'destructive' });
      return;
    }
    if (!fromWh || !toWh) {
      toast({ title: 'اختر مستودع المصدر والوجهة', variant: 'destructive' });
      return;
    }
    if (fromWh === toWh) {
      toast({ title: 'المستودع المصدر يجب أن يختلف عن الوجهة', variant: 'destructive' });
      return;
    }
    const filled = lines.filter((l) => l.item_code);
    if (!filled.length) {
      toast({ title: 'أضف صفاً واحداً على الأقل', variant: 'destructive' });
      return;
    }
    const doc = buildStockEntry({
      company,
      stock_entry_type: 'Material Transfer',
      posting_date: postingDate,
      from_warehouse: fromWh,
      to_warehouse: toWh,
      items: filled.map((l) => ({
        item_code: l.item_code,
        qty: l.qty,
        s_warehouse: l.s_warehouse || fromWh,
        t_warehouse: l.t_warehouse || toWh,
      })),
    });
    createMutation.mutate(doc, {
      onSuccess: () => {
        toast({ title: 'تم إنشاء تحويل المخزون' });
        setLines([emptyLine()]);
      },
      onError: () => toast({ title: 'تعذر الحفظ', variant: 'destructive' }),
    });
  };

  return (
    <div className="erp-page-enter space-y-5" dir="rtl">
      <ListQueryAlert error={list.isError ? list.error : null} onRetry={() => list.refetch()} />

      <PageHeader
        title="تحويل مخزون بين الفروع"
        description="حركة تحويل مخزون بين مستودعات (غالباً ترتبط بفروع مختلفة)"
        iconify="solar:transfer-horizontal-bold-duotone"
        accent="warning"
        breadcrumbs={[{ label: 'المخزون', href: '/inventory' }, { label: 'تحويل بين الفروع' }]}
        actions={
          <Button variant="outline" size="sm" asChild>
            <Link href="/inventory/stock-entry">كل حركات المخزون</Link>
          </Button>
        }
      />

      <div className="rounded-2xl border border-border/40 bg-card/80 p-4 space-y-4 shadow-[var(--shadow-xs-ui)]">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1">
            <Label className="text-xs">تاريخ الترحيل</Label>
            <Input type="date" dir="ltr" value={postingDate} onChange={(e) => setPostingDate(e.target.value)} />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">من مستودع *</Label>
            <ErpLinkCombobox doctype="Warehouse" value={fromWh} onChange={setFromWh} placeholder="مصدر الشحن..." />
          </div>
          <div className="space-y-1 sm:col-span-2">
            <Label className="text-xs">إلى مستودع *</Label>
            <ErpLinkCombobox doctype="Warehouse" value={toWh} onChange={setToWh} placeholder="وجهة الاستلام..." />
          </div>
        </div>
        {fromBranch || toBranch ? (
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            {fromBranch ? (
              <>
                فرع المصدر المرتبط بالمستودع: <span className="font-mono">{fromBranch}</span>
              </>
            ) : null}
            {fromBranch && toBranch ? ' · ' : null}
            {toBranch ? (
              <>
                فرع الوجهة: <span className="font-mono">{toBranch}</span>
              </>
            ) : null}
            {!fromBranch && !toBranch ? 'لم يُعرَض حقل فرع على المستودع في هذا الموقع.' : null}
          </p>
        ) : null}

        <div className="rounded-xl border border-border/40 overflow-hidden">
          <div className="flex items-center justify-between gap-2 bg-muted/40 px-3 py-2">
            <span className="text-xs font-semibold flex items-center gap-2">
              <ArrowRightLeft className="h-4 w-4" />
              بنود التحويل
            </span>
            <Button type="button" size="sm" variant="ghost" className="h-8 text-xs gap-1" onClick={() => setLines((p) => [...p, emptyLine()])}>
              <Plus className="h-3 w-3" />
              صف
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow className="text-xs">
                <TableHead>الصنف</TableHead>
                <TableHead className="w-24">الكمية</TableHead>
                <TableHead>من مستودع بند</TableHead>
                <TableHead>إلى مستودع بند</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lines.map((line, idx) => (
                <TableRow key={idx}>
                  <TableCell>
                    <ErpLinkCombobox
                      doctype="Item"
                      value={line.item_code}
                      onChange={(v) => updateLine(idx, { item_code: v })}
                      className="h-9 text-xs"
                      displayKey="item_name"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      dir="ltr"
                      min={0}
                      className="h-9 text-xs"
                      value={line.qty}
                      onChange={(e) => updateLine(idx, { qty: Math.max(0, Number(e.target.value)) })}
                    />
                  </TableCell>
                  <TableCell>
                    <ErpLinkCombobox
                      doctype="Warehouse"
                      value={line.s_warehouse}
                      onChange={(v) => updateLine(idx, { s_warehouse: v })}
                      placeholder={fromWh || 'افتراضي من الرأس'}
                      className="h-9 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    <ErpLinkCombobox
                      doctype="Warehouse"
                      value={line.t_warehouse}
                      onChange={(v) => updateLine(idx, { t_warehouse: v })}
                      placeholder={toWh || 'افتراضي من الرأس'}
                      className="h-9 text-xs"
                    />
                  </TableCell>
                  <TableCell>
                    {lines.length > 1 ? (
                      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => setLines((p) => p.filter((_, i) => i !== idx))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>

        <div className="flex justify-end gap-2">
          <Button type="button" onClick={submit} disabled={createMutation.isPending || coLoading}>
            حفظ كمسودة (Stock Entry)
          </Button>
        </div>
      </div>

      <p className="text-[11px] text-muted-foreground px-1 leading-relaxed">
        للتحويل النقدي بين حسابات بنكية/صناديق استخدم{' '}
        <Link href="/accounting/payment-entry?interBranchFunds=1" className="font-medium text-primary underline-offset-2 hover:underline">
          المدفوعات — تحويل داخلي
        </Link>
        .
      </p>
    </div>
  );
}
