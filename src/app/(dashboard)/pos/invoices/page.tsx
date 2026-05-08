'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ErpLinkCombobox } from '@/components/erp/erp-link-combobox';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { useDocList } from '@/lib/client/hooks';
import { formatCurrency } from '@/lib/core/helpers';

type InvRow = {
  name: string;
  customer_name?: string;
  grand_total?: number;
  posting_date?: string;
  pos_profile?: string;
  docstatus?: number;
};

type StatusFilter = 'all' | 'draft' | 'submitted';

export default function PosInvoicesListPage() {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [posProfile, setPosProfile] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [searchText, setSearchText] = useState('');

  const apiFilters = useMemo(() => {
    const f: string[][] = [['is_return', '=', '0']];
    if (statusFilter === 'draft') f.push(['docstatus', '=', '0']);
    if (statusFilter === 'submitted') f.push(['docstatus', '=', '1']);
    const pp = posProfile.trim();
    if (pp) f.push(['pos_profile', '=', pp]);
    if (fromDate.trim()) f.push(['posting_date', '>=', fromDate.trim()]);
    if (toDate.trim()) f.push(['posting_date', '<=', toDate.trim()]);
    return f;
  }, [statusFilter, posProfile, fromDate, toDate]);

  const { data = [], isLoading, isError, error, refetch } = useDocList<InvRow>('POS Invoice', {
    fields: ['name', 'customer_name', 'grand_total', 'posting_date', 'pos_profile', 'docstatus'],
    filters: apiFilters,
    limit: 400,
    order_by: 'modified desc',
  });

  const rows = useMemo(() => {
    const raw = data ?? [];
    const q = searchText.trim().toLowerCase();
    if (!q) return raw;
    return raw.filter((r) => {
      const n = (r.name ?? '').toLowerCase();
      const c = (r.customer_name ?? '').toLowerCase();
      return n.includes(q) || c.includes(q);
    });
  }, [data, searchText]);

  const clearFilters = () => {
    setStatusFilter('all');
    setPosProfile('');
    setFromDate('');
    setToDate('');
    setSearchText('');
  };

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="فواتير نقطة البيع"
        description="فواتير POS (غير المرتجعات). استخدم الفلاتر ثم البحث النصي على الرقم أو اسم العميل."
        iconify="solar:receipt-bold-duotone"
        accent="success"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'فواتير نقطة البيع' }]}
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">تصفية</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-0">
          <div className="space-y-1.5">
            <Label className="text-xs">حالة المستند</Label>
            <Select
              dir="rtl"
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StatusFilter)}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">الكل</SelectItem>
                <SelectItem value="draft">مسودة</SelectItem>
                <SelectItem value="submitted">مرحّل</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">ملف نقطة البيع</Label>
            <ErpLinkCombobox
              doctype="POS Profile"
              value={posProfile}
              onChange={setPosProfile}
              placeholder="الكل"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">من تاريخ</Label>
            <Input
              type="date"
              dir="ltr"
              className="h-9"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">إلى تاريخ</Label>
            <Input
              type="date"
              dir="ltr"
              className="h-9"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-4">
            <Label className="text-xs">بحث سريع (رقم الفاتورة أو العميل)</Label>
            <div className="flex flex-wrap gap-2">
              <Input
                className="h-9 flex-1 min-w-[12rem]"
                placeholder="ابحث في النتائج المعروضة…"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
              />
              <Button type="button" variant="outline" size="sm" className="h-9" onClick={clearFilters}>
                مسح الفلاتر
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/60">
        <CardHeader className="pb-3 flex flex-row items-center justify-between gap-2">
          <CardTitle className="text-base font-semibold">القائمة</CardTitle>
          {!isLoading && (
            <span className="text-xs text-muted-foreground tabular-nums">{rows.length} سجل</span>
          )}
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">جاري التحميل…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">لا توجد فواتير ضمن الشروط.</p>
          ) : (
            <div className="rounded-[var(--radius-md-ui)] border border-border/50 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-start font-semibold">الرقم</TableHead>
                    <TableHead className="text-start font-semibold">الحالة</TableHead>
                    <TableHead className="text-start font-semibold">العميل</TableHead>
                    <TableHead className="text-start font-semibold">الإجمالي</TableHead>
                    <TableHead className="text-start font-semibold">التاريخ</TableHead>
                    <TableHead className="text-start font-semibold">ملف POS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const ds = Number(r.docstatus);
                    const statusLabel = ds === 1 ? 'مرحّل' : ds === 0 ? 'مسودة' : '—';
                    const variant = ds === 1 ? 'default' : ds === 0 ? 'secondary' : 'outline';
                    return (
                      <TableRow key={r.name} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs">
                          <Link
                            href={`/pos/invoices/${encodeURIComponent(r.name)}`}
                            className="text-primary hover:underline font-medium"
                          >
                            {r.name}
                          </Link>
                        </TableCell>
                        <TableCell>
                          <Badge variant={variant} className="text-[10px] font-normal">
                            {statusLabel}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm max-w-[200px] truncate" title={r.customer_name}>
                          {r.customer_name ?? '—'}
                        </TableCell>
                        <TableCell className="text-sm tabular-nums font-medium">
                          {formatCurrency(Number(r.grand_total ?? 0))}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {r.posting_date ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs truncate max-w-[120px]">{r.pos_profile ?? '—'}</TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
