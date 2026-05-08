'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { usePOSPastOrders } from '@/lib/client/pos-hooks';
import { formatCurrency } from '@/lib/core/helpers';

/**
 * قائمة طلبات سابقة (فواتير POS مرحّلة) مع تصفية ملف/شركة — §13 / P4-06.
 */
export function PosPastOrders() {
  const [draftProfile, setDraftProfile] = useState('');
  const [draftCompany, setDraftCompany] = useState('');
  const [appliedProfile, setAppliedProfile] = useState('');
  const [appliedCompany, setAppliedCompany] = useState('');

  const opts = useMemo(
    () => ({
      pos_profile: appliedProfile.trim() || undefined,
      company: appliedCompany.trim() || undefined,
      limit: 100,
    }),
    [appliedProfile, appliedCompany]
  );

  const { data = [], isLoading, isError, error, refetch, isFetching } = usePOSPastOrders(opts, true);

  const applyFilters = () => {
    setAppliedProfile(draftProfile);
    setAppliedCompany(draftCompany);
  };

  return (
    <>
      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">تصفية</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 items-end">
          <div className="space-y-2">
            <Label className="text-xs">ملف نقطة البيع (اختياري)</Label>
            <ErpLinkCombobox
              doctype="POS Profile"
              value={draftProfile}
              onChange={setDraftProfile}
              placeholder="اختر ملفاً أو اتركه فارغاً"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs">الشركة (اختياري)</Label>
            <ErpLinkCombobox
              doctype="Company"
              value={draftCompany}
              onChange={setDraftCompany}
              placeholder="اختر شركة أو اتركه فارغاً"
            />
          </div>
          <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
            <Button type="button" onClick={applyFilters} disabled={isFetching}>
              تطبيق
            </Button>
            <Button type="button" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
              تحديث
            </Button>
          </div>
        </CardContent>
      </Card>

      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">القائمة</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">جاري التحميل…</p>
          ) : data.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">لا توجد فواتير مطابقة.</p>
          ) : (
            <div className="rounded-[var(--radius-md-ui)] border border-border/50 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-start font-semibold">الرقم</TableHead>
                    <TableHead className="text-start font-semibold">العميل</TableHead>
                    <TableHead className="text-start font-semibold">التاريخ</TableHead>
                    <TableHead className="text-start font-semibold">ملف POS</TableHead>
                    <TableHead className="text-start font-semibold">الإجمالي</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.map((row) => (
                    <TableRow key={row.name}>
                      <TableCell className="font-mono text-xs">
                        <Link
                          href={`/pos/invoices/${encodeURIComponent(row.name)}`}
                          className="text-primary hover:underline"
                        >
                          {row.name}
                        </Link>
                      </TableCell>
                      <TableCell className="max-w-[12rem] truncate">{row.customer_name ?? '—'}</TableCell>
                      <TableCell className="tabular-nums text-xs">{row.posting_date ?? '—'}</TableCell>
                      <TableCell className="font-mono text-xs">{row.pos_profile ?? '—'}</TableCell>
                      <TableCell className="tabular-nums">
                        {row.grand_total != null ? formatCurrency(row.grand_total) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  );
}
