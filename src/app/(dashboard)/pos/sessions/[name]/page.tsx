'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
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
import { useDoc } from '@/lib/client/hooks';
import { usePOSSessionSummary } from '@/lib/client/pos-hooks';
import { formatCurrency, STATUS_COLORS } from '@/lib/core/helpers';
import { ArrowRight } from 'lucide-react';

export default function PosSessionDetailPage() {
  const params = useParams();
  const name = typeof params?.name === 'string' ? decodeURIComponent(params.name) : '';

  const { data, isLoading, isError, error, refetch } = useDoc<Record<string, unknown>>(
    'POS Opening Entry',
    name
  );

  const st = data?.status != null ? String(data.status) : '';
  const sc = STATUS_COLORS[st as keyof typeof STATUS_COLORS];

  const summary = usePOSSessionSummary(name, st === 'Open' && Boolean(name));

  const balanceRows = Array.isArray(data?.balance_details)
    ? (data.balance_details as Record<string, unknown>[])
    : [];

  return (
    <div dir="rtl" className="erp-page-enter space-y-5">
      <PageHeader
        title="تفاصيل الجلسة"
        description={<span className="font-mono text-sm tabular-nums">{name || '—'}</span>}
        iconify="solar:clock-circle-bold-duotone"
        accent="info"
        breadcrumbs={[{ label: 'نقاط البيع', href: '/pos' }, { label: 'الجلسات', href: '/pos/sessions' }, { label: 'تفاصيل' }]}
        actions={
          <>
            <Button variant="outline" size="sm" className="text-muted-foreground" asChild>
              <Link href="/pos/reports">تقارير نقاط البيع</Link>
            </Button>
            {st === 'Open' && data?.company ? (
              <Button variant="secondary" size="sm" asChild>
                <Link
                  href="/reports?openReport=pos-transactions"
                  title="يُفتح سجل نقاط البيع — اضبط الفترة من بداية الوردية حتى اليوم والشركة في مركز التقارير"
                >
                  سجل POS (مركز التقارير)
                </Link>
              </Button>
            ) : null}
          </>
        }
      />

      <ListQueryAlert error={isError ? error : null} onRetry={() => void refetch()} />

      {isLoading ? (
        <p className="text-sm text-muted-foreground py-10 text-center">جاري التحميل…</p>
      ) : !data ? (
        <p className="text-sm text-destructive py-10 text-center">تعذر تحميل الجلسة.</p>
      ) : (
        <Card className="border-border/60">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base font-semibold">ملخص</CardTitle>
            {st ? (
              <Badge variant="secondary" className={`text-[10px] ${sc ? `${sc.bg} ${sc.text}` : ''}`}>
                {sc?.label ?? st}
              </Badge>
            ) : null}
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
              <div>
                <dt className="text-xs text-muted-foreground">الشركة</dt>
                <dd className="font-medium">{String(data.company ?? '—')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">ملف نقطة البيع</dt>
                <dd className="font-medium">{String(data.pos_profile ?? '—')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">المستخدم</dt>
                <dd className="font-medium truncate">{String(data.user ?? '—')}</dd>
              </div>
              <div>
                <dt className="text-xs text-muted-foreground">بداية الوردية</dt>
                <dd className="font-medium tabular-nums">{String(data.period_start_date ?? '—')}</dd>
              </div>
              <div className="sm:col-span-2">
                <dt className="text-xs text-muted-foreground">تاريخ القيد</dt>
                <dd className="font-medium tabular-nums">{String(data.posting_date ?? '—')}</dd>
              </div>
            </dl>

            {balanceRows.length > 0 && (
              <>
                <Separator />
                <div>
                  <p className="text-xs font-semibold text-muted-foreground mb-2">الأرصدة الافتتاحية</p>
                  <ul className="space-y-2 rounded-[var(--radius-md-ui)] border border-border/50 divide-y divide-border/40">
                    {balanceRows.map((row, i) => (
                      <li key={i} className="flex justify-between gap-4 px-3 py-2 text-sm">
                        <span>{String(row.mode_of_payment ?? '—')}</span>
                        <span className="font-mono tabular-nums">
                          {Number(row.opening_amount ?? 0).toLocaleString('ar-SA', {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {st === 'Open' && (
              <div className="pt-2">
                <Button asChild className="w-full sm:w-auto">
                  <Link href="/pos/sell">الانتقال لبدء البيع</Link>
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {st === 'Open' && name ? (
        <Card className="border-border/60">
          <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 pb-2">
            <CardTitle className="text-base font-semibold">ملخص فوري للوردية</CardTitle>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={summary.isFetching}
              onClick={() => void summary.refetch()}
            >
              تحديث
            </Button>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <ListQueryAlert
              error={summary.isError ? summary.error : null}
              onRetry={() => void summary.refetch()}
            />
            {summary.isLoading ? (
              <p className="text-sm text-muted-foreground py-6 text-center">جاري حساب الملخص…</p>
            ) : summary.data ? (
              <>
                <p className="text-xs text-muted-foreground leading-relaxed -mt-1">
                  ملخص يطابق اتجاه §10.2: أعداد البيع/المرتجع، التحصيل مقابل الافتتاح عند توفرهما على الخادم.
                </p>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                  <div>
                    <dt className="text-xs text-muted-foreground">عدد المستندات (كل الفواتير)</dt>
                    <dd className="font-mono font-medium tabular-nums">{summary.data.invoice_count}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">بيع / مرتجع</dt>
                    <dd className="font-mono font-medium tabular-nums">
                      {summary.data.sales_invoice_count ?? '—'} / {summary.data.return_invoice_count ?? '—'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">إجمالي المبيعات (مجموع من ERP)</dt>
                    <dd className="font-medium tabular-nums">{formatCurrency(summary.data.grand_total_sum)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">مجموع الضريبة</dt>
                    <dd className="font-medium tabular-nums">{formatCurrency(summary.data.tax_sum)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">نهاية الفترة (لحظة الطلب)</dt>
                    <dd className="font-mono text-xs tabular-nums break-all">{summary.data.period_end}</dd>
                  </div>
                </dl>
                {(Object.keys(summary.data.payments_by_mode).length > 0 ||
                  Object.keys(summary.data.opening_amounts_by_mode ?? {}).length > 0) && (
                  <>
                    <Separator />
                    <p className="text-xs font-semibold text-muted-foreground">
                      التحصيل حسب الوسيلة (والافتتاح عند التوفر)
                    </p>
                    <ul className="space-y-1 rounded-[var(--radius-md-ui)] border border-border/50 divide-y divide-border/40">
                      {Array.from(
                        new Set([
                          ...Object.keys(summary.data.payments_by_mode),
                          ...Object.keys(summary.data.opening_amounts_by_mode ?? {}),
                        ])
                      ).map((mode) => {
                        const amt = summary.data.payments_by_mode[mode] ?? 0;
                        const op = summary.data.opening_amounts_by_mode?.[mode];
                        return (
                          <li key={mode} className="flex flex-wrap justify-between gap-x-4 gap-y-1 px-3 py-2">
                            <span>{mode}</span>
                            <span className="font-mono tabular-nums text-end">
                              {formatCurrency(amt)}
                              {op != null && Math.abs(op) > 0.005 ? (
                                <span className="text-[10px] text-muted-foreground font-normal block sm:inline sm:me-2">
                                  {' '}
                                  · افتتاحي: {formatCurrency(op)}
                                </span>
                              ) : null}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  </>
                )}
                {summary.data.invoices.length > 0 && (
                  <>
                    <Separator />
                    <p className="text-xs font-semibold text-muted-foreground">أحدث الفواتير في الجلسة (عرض مختصر)</p>
                    <div className="rounded-[var(--radius-md-ui)] border border-border/50 overflow-x-auto">
                      <Table>
                        <TableHeader>
                          <TableRow className="hover:bg-transparent">
                            <TableHead className="text-start font-semibold">الرقم</TableHead>
                            <TableHead className="text-start font-semibold">العميل</TableHead>
                            <TableHead className="text-start font-semibold">الإجمالي</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {summary.data.invoices.map((inv) => (
                            <TableRow key={inv.name}>
                              <TableCell className="font-mono text-xs">
                                <Link
                                  href={`/pos/invoices/${encodeURIComponent(inv.name)}`}
                                  className="text-primary hover:underline"
                                >
                                  {inv.name}
                                </Link>
                              </TableCell>
                              <TableCell className="max-w-[10rem] truncate">
                                {inv.customer_name ?? '—'}
                              </TableCell>
                              <TableCell className="tabular-nums">{formatCurrency(inv.grand_total)}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </>
            ) : null}
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
