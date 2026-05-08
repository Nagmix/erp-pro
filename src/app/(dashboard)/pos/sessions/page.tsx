'use client';

import Link from 'next/link';
import { useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ListQueryAlert } from '@/components/erp/list-query-alert';
import { PageHeader } from '@/components/erp/page-header';
import { useDocList } from '@/lib/client/hooks';
import { STATUS_COLORS } from '@/lib/core/helpers';

type OpeningRow = {
  name: string;
  status?: string;
  pos_profile?: string;
  user?: string;
  period_start_date?: string;
  company?: string;
};

export default function PosSessionsListPage() {
  const { data = [], isLoading, isError, error, refetch } = useDocList<OpeningRow>('POS Opening Entry', {
    fields: ['name', 'status', 'pos_profile', 'user', 'period_start_date', 'company'],
    limit: 150,
    order_by: 'modified desc',
  });

  const rows = useMemo(() => data ?? [], [data]);

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="إدارة الجلسات والورديات"
        description="فتح وإغلاق الوردية يتم من شاشة البيع؛ هنا عرض السجل والتفاصيل."
        iconify="solar:clock-circle-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'الجلسات' }]}
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      <Card className="border-border/60">
        <CardHeader className="pb-3">
          <CardTitle className="text-base font-semibold">الورديات (POS Opening Entry)</CardTitle>
        </CardHeader>
        <CardContent className="pt-0">
          {isLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">جاري التحميل…</p>
          ) : rows.length === 0 ? (
            <p className="text-sm text-muted-foreground py-8 text-center">لا توجد جلسات مسجّلة بعد.</p>
          ) : (
            <div className="rounded-[var(--radius-md-ui)] border border-border/50 overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-start font-semibold">الرقم</TableHead>
                    <TableHead className="text-start font-semibold">الحالة</TableHead>
                    <TableHead className="text-start font-semibold">نقطة البيع</TableHead>
                    <TableHead className="text-start font-semibold">المستخدم</TableHead>
                    <TableHead className="text-start font-semibold">البداية</TableHead>
                    <TableHead className="text-start font-semibold w-[72px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((r) => {
                    const st = r.status || '';
                    const sc = STATUS_COLORS[st as keyof typeof STATUS_COLORS];
                    return (
                      <TableRow key={r.name} className="hover:bg-muted/40">
                        <TableCell className="font-mono text-xs tabular-nums">{r.name}</TableCell>
                        <TableCell>
                          {st ? (
                            <Badge
                              variant="secondary"
                              className={`text-[10px] ${sc ? `${sc.bg} ${sc.text}` : ''}`}
                            >
                              {sc?.label ?? st}
                            </Badge>
                          ) : (
                            '—'
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{r.pos_profile ?? '—'}</TableCell>
                        <TableCell className="text-sm truncate max-w-[140px]" title={r.user}>
                          {r.user ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground tabular-nums">
                          {r.period_start_date ?? '—'}
                        </TableCell>
                        <TableCell className="text-start">
                          <Link
                            href={`/pos/sessions/${encodeURIComponent(r.name)}`}
                            className="text-xs font-medium text-primary hover:underline"
                          >
                            تفاصيل
                          </Link>
                        </TableCell>
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
